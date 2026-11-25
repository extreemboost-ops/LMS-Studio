import dns from "node:dns/promises";
import { prisma } from "../../database/prisma.js";
import { withDistributorTransaction } from "../../database/rls.js";
import { AppError } from "../../utils/appError.js";
import type { UpdateBrandingInput } from "./branding.schema.js";

export interface WhiteLabelBranding {
  isWhiteLabeled: boolean;
  distributorId: string | null;
  appName: string;
  appSubtitle: string;
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  supportEmail: string;
  hidePoweredBy: boolean;
  customDomain: string | null;
}

export const DEFAULT_BRANDING: WhiteLabelBranding = {
  isWhiteLabeled: false,
  distributorId: null,
  appName: "SCORM & H5P",
  appSubtitle: "STUDIO",
  primaryColor: "#2563eb",
  logoUrl: null,
  faviconUrl: null,
  supportEmail: "support@scorm-h5p-studio.local",
  hidePoweredBy: false,
  customDomain: null,
};

const RFC1123_HOST_REGEX =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

const RESERVED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "vercel.app",
  "onrender.com",
  "github.com",
];

export class BrandingService {
  /**
   * Sanitizes and validates a domain/host header to prevent Host-header injection.
   */
  public static normalizeDomainHost(rawHost: string | undefined | null): string | null {
    if (!rawHost || typeof rawHost !== "string") return null;

    // Strip protocol if accidentally provided, strip port, lowercase, trim
    const cleaned = rawHost
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split(":")[0]
      .trim();

    if (!cleaned || cleaned.length > 253) return null;
    if (/[\s@\\<>'"]/.test(cleaned)) return null;
    if (!RFC1123_HOST_REGEX.test(cleaned)) return null;

    return cleaned;
  }

  /**
   * Checks whether a custom domain is reserved by platform infrastructure.
   */
  public static isReservedDomain(domain: string): boolean {
    return RESERVED_DOMAINS.some(
      (reserved) => domain === reserved || domain.endsWith(`.${reserved}`)
    );
  }

  /**
   * Resolves public white-label branding by custom domain or partner slug.
   */
  public static async resolvePublicBranding(params: {
    domain?: string | null;
    slug?: string | null;
  }): Promise<WhiteLabelBranding> {
    const normalizedDomain = this.normalizeDomainHost(params.domain);
    const slug = params.slug?.trim().toLowerCase() || null;

    if (!normalizedDomain && !slug) {
      return DEFAULT_BRANDING;
    }

    try {
      const distributor = await prisma.distributor.findFirst({
        where: {
          status: "ACTIVE",
          OR: [
            ...(normalizedDomain ? [{ customDomain: normalizedDomain }] : []),
            ...(slug ? [{ slug }] : []),
          ],
        },
        select: {
          id: true,
          name: true,
          contactEmail: true,
          customDomain: true,
          brandingConfig: true,
        },
      });

      if (!distributor) {
        return DEFAULT_BRANDING;
      }

      const cfg = (distributor.brandingConfig as Record<string, any>) || {};
      return {
        isWhiteLabeled: true,
        distributorId: distributor.id,
        appName: typeof cfg.appName === "string" && cfg.appName ? cfg.appName : distributor.name,
        appSubtitle:
          typeof cfg.appSubtitle === "string" && cfg.appSubtitle
            ? cfg.appSubtitle
            : "LEARNING STUDIO",
        primaryColor:
          typeof cfg.primaryColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(cfg.primaryColor)
            ? cfg.primaryColor
            : DEFAULT_BRANDING.primaryColor,
        logoUrl: typeof cfg.logoUrl === "string" ? cfg.logoUrl : null,
        faviconUrl: typeof cfg.faviconUrl === "string" ? cfg.faviconUrl : null,
        supportEmail:
          typeof cfg.supportEmail === "string" && cfg.supportEmail
            ? cfg.supportEmail
            : distributor.contactEmail,
        hidePoweredBy: Boolean(cfg.hidePoweredBy),
        customDomain: distributor.customDomain,
      };
    } catch {
      return DEFAULT_BRANDING;
    }
  }

  /**
   * Retrieves the current Distributor's branding configuration + DNS setup instructions.
   */
  public static async getPartnerBranding(distributorId: string) {
    return withDistributorTransaction(distributorId, async (tx) => {
      const distributor = await tx.distributor.findUnique({
        where: { id: distributorId },
        select: {
          id: true,
          name: true,
          slug: true,
          contactEmail: true,
          customDomain: true,
          brandingConfig: true,
        },
      });

      if (!distributor) {
        throw AppError.notFound("Distributor");
      }

      const cfg = (distributor.brandingConfig as Record<string, any>) || {};
      return {
        branding: {
          appName: cfg.appName || distributor.name,
          appSubtitle: cfg.appSubtitle || "STUDIO",
          primaryColor: cfg.primaryColor || DEFAULT_BRANDING.primaryColor,
          logoUrl: cfg.logoUrl ?? null,
          faviconUrl: cfg.faviconUrl ?? null,
          supportEmail: cfg.supportEmail || distributor.contactEmail,
          hidePoweredBy: Boolean(cfg.hidePoweredBy),
          customDomain: distributor.customDomain,
        },
        dnsInstructions: {
          cnameTarget: "cname.lms-studio.app",
          txtHost: distributor.customDomain ? `_lms-verify.${distributor.customDomain}` : null,
          txtValue: `lms-verify=${distributor.id.slice(0, 12)}`,
        },
      };
    });
  }

  /**
   * Updates white-label branding and custom domain for the Distributor.
   */
  public static async updatePartnerBranding(
    distributorId: string,
    input: UpdateBrandingInput
  ) {
    let normalizedDomain: string | null | undefined = undefined;

    if (input.customDomain !== undefined) {
      if (input.customDomain === null || input.customDomain === "") {
        normalizedDomain = null;
      } else {
        const parsed = this.normalizeDomainHost(input.customDomain);
        if (!parsed) {
          throw AppError.badRequest(
            "Invalid custom domain format. Provide a valid hostname such as studio.youragency.com",
            undefined,
            "INVALID_CUSTOM_DOMAIN"
          );
        }
        if (this.isReservedDomain(parsed)) {
          throw AppError.forbidden(
            "Platform infrastructure domains cannot be claimed as custom white-label domains",
            "RESERVED_DOMAIN"
          );
        }
        normalizedDomain = parsed;
      }
    }

    return withDistributorTransaction(distributorId, async (tx) => {
      const existing = await tx.distributor.findUnique({ where: { id: distributorId } });
      if (!existing) {
        throw AppError.notFound("Distributor");
      }

      if (normalizedDomain) {
        const conflict = await tx.distributor.findFirst({
          where: { customDomain: normalizedDomain, id: { not: distributorId } },
        });
        if (conflict) {
          throw AppError.conflict(
            "This custom domain is already claimed by another partner",
            "DOMAIN_ALREADY_CLAIMED"
          );
        }
      }

      const prevCfg = (existing.brandingConfig as Record<string, any>) || {};
      const nextCfg = {
        ...prevCfg,
        ...(input.appName !== undefined ? { appName: input.appName } : {}),
        ...(input.appSubtitle !== undefined ? { appSubtitle: input.appSubtitle } : {}),
        ...(input.primaryColor !== undefined ? { primaryColor: input.primaryColor } : {}),
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        ...(input.faviconUrl !== undefined ? { faviconUrl: input.faviconUrl } : {}),
        ...(input.supportEmail !== undefined ? { supportEmail: input.supportEmail } : {}),
        ...(input.hidePoweredBy !== undefined ? { hidePoweredBy: input.hidePoweredBy } : {}),
      };

      const updated = await tx.distributor.update({
        where: { id: distributorId },
        data: {
          brandingConfig: nextCfg,
          ...(normalizedDomain !== undefined ? { customDomain: normalizedDomain } : {}),
        },
        select: {
          id: true,
          customDomain: true,
          brandingConfig: true,
        },
      });

      return updated;
    });
  }

  /**
   * Performs a live DNS CNAME/TXT lookup to verify custom domain ownership.
   */
  public static async verifyCustomDomain(distributorId: string): Promise<{
    domain: string;
    cnameVerified: boolean;
    txtVerified: boolean;
    records: string[];
  }> {
    const { branding, dnsInstructions } = await this.getPartnerBranding(distributorId);
    if (!branding.customDomain) {
      throw AppError.badRequest("No custom domain is configured for this Distributor");
    }

    let cnameVerified = false;
    let txtVerified = false;
    const records: string[] = [];

    try {
      const cnames = await dns.resolveCname(branding.customDomain);
      records.push(...cnames);
      cnameVerified = cnames.some((c) => c.toLowerCase().includes("lms-studio"));
    } catch {
      cnameVerified = false;
    }

    try {
      if (dnsInstructions.txtHost) {
        const txts = await dns.resolveTxt(dnsInstructions.txtHost);
        const flat = txts.flat();
        records.push(...flat);
        txtVerified = flat.some((t) => t.includes(dnsInstructions.txtValue));
      }
    } catch {
      txtVerified = false;
    }

    return {
      domain: branding.customDomain,
      cnameVerified,
      txtVerified,
      records,
    };
  }
}
