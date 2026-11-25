import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

export class R2Client {
  public static getConfig(): R2Config | null {
    if (
      !env.R2_ACCOUNT_ID ||
      !env.R2_ACCESS_KEY_ID ||
      !env.R2_SECRET_ACCESS_KEY ||
      !env.R2_BUCKET_NAME
    ) {
      return null;
    }
    return {
      accountId: env.R2_ACCOUNT_ID.trim(),
      accessKeyId: env.R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim(),
      bucketName: env.R2_BUCKET_NAME.trim(),
    };
  }

  public static isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  /**
   * Builds AWS Signature Version 4 headers for Cloudflare R2 S3-compatible requests.
   */
  public static buildSignedRequest(params: {
    method: "PUT" | "GET" | "HEAD" | "DELETE";
    key: string;
    body?: Buffer;
    contentType?: string;
    config: R2Config;
    now?: Date;
  }): { url: string; headers: Record<string, string> } {
    const now = params.now || new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const region = "auto";
    const service = "s3";

    const host = `${params.config.accountId}.r2.cloudflarestorage.com`;
    const encodedKey = params.key
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    const canonicalUri = `/${encodeURIComponent(params.config.bucketName)}/${encodedKey}`;
    const payloadHash = sha256Hex(params.body || Buffer.alloc(0));

    const headerMap: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    if (params.contentType) {
      headerMap["content-type"] = params.contentType;
    }

    const sortedKeys = Object.keys(headerMap).sort();
    const canonicalHeaders = sortedKeys.map((k) => `${k}:${headerMap[k]}\n`).join("");
    const signedHeaders = sortedKeys.join(";");

    const canonicalRequest = [
      params.method,
      canonicalUri,
      "", // canonicalQueryString
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");

    const kDate = hmacSha256(`AWS4${params.config.secretAccessKey}`, dateStamp);
    const kRegion = hmacSha256(kDate, region);
    const kService = hmacSha256(kRegion, service);
    const kSigning = hmacSha256(kService, "aws4_request");
    const signature = crypto
      .createHmac("sha256", kSigning)
      .update(stringToSign, "utf8")
      .digest("hex");

    const authorization = `AWS4-HMAC-SHA256 Credential=${params.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      url: `https://${host}${canonicalUri}`,
      headers: {
        ...headerMap,
        Authorization: authorization,
      },
    };
  }

  public static async putObject(
    key: string,
    body: Buffer,
    contentType = "application/octet-stream"
  ): Promise<void> {
    const config = this.getConfig();
    if (!config) {
      throw new AppError(503, "R2_UNCONFIGURED", "Cloudflare R2 credentials are not configured");
    }

    const { url, headers } = this.buildSignedRequest({
      method: "PUT",
      key,
      body,
      contentType,
      config,
    });

    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: new Uint8Array(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw AppError.internal(`Cloudflare R2 upload failed (${res.status}): ${errText.slice(0, 200)}`);
    }
  }

  public static async getObject(key: string): Promise<Buffer> {
    const config = this.getConfig();
    if (!config) {
      throw new AppError(503, "R2_UNCONFIGURED", "Cloudflare R2 credentials are not configured");
    }

    const { url, headers } = this.buildSignedRequest({
      method: "GET",
      key,
      config,
    });

    const res = await fetch(url, { method: "GET", headers });
    if (res.status === 404) {
      throw AppError.notFound("Storage package file in Cloudflare R2");
    }
    if (!res.ok) {
      throw AppError.internal(`Cloudflare R2 download failed (${res.status})`);
    }

    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  }

  public static async deleteObject(key: string): Promise<boolean> {
    const config = this.getConfig();
    if (!config) return false;

    const { url, headers } = this.buildSignedRequest({
      method: "DELETE",
      key,
      config,
    });

    const res = await fetch(url, { method: "DELETE", headers });
    return res.ok || res.status === 204;
  }
}
