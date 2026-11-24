import { Request, Response, NextFunction } from "express";
import { StorageService } from "./storage.service.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";
import { prisma } from "../../database/prisma.js";

export class StorageController {
  /**
   * Public/Tokenized Download Gateway
   * GET /api/v1/storage/download/:token
   */
  public static async downloadPackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.params.token;
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      if (!token) {
        throw AppError.badRequest("Download token required");
      }

      // 1. Verify token signature and expiry
      const payload = StorageService.verifySignedDownloadToken(token);

      // 2. Read package from storage
      const buffer = StorageService.readPackage(payload.storageKey);

      // 3. Set headers
      const isH5p = payload.filename.endsWith(".h5p");
      const contentType = isH5p ? "application/x-h5p" : "application/zip";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${payload.filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "private, no-transform, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");

      res.end(buffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get tenant storage usage and quota metrics
   * GET /api/v1/storage/usage
   */
  public static async getStorageUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;
      if (!organizationId) {
        throw AppError.forbidden("Tenant organization required");
      }

      let usage = {
        organizationId,
        totalBytesUsed: "0",
        packageBytes: "0",
        filesCount: 0,
        quotaBytes: "10737418240", // 10 GB default quota
      };

      try {
        const record = await prisma.storageUsage.findFirst({
          where: { organizationId },
          orderBy: { recordedAt: "desc" },
        });

        if (record) {
          usage = {
            organizationId,
            totalBytesUsed: record.totalBytesUsed.toString(),
            packageBytes: record.packageBytes.toString(),
            filesCount: record.filesCount,
            quotaBytes: "10737418240",
          };
        }
      } catch {
        // Fallback default
      }

      ResponseHelper.sendSuccess(res, usage, 200, "Storage usage retrieved");
    } catch (err) {
      next(err);
    }
  }
}
