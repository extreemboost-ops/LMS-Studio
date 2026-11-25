import crypto from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { hashToken } from "../../utils/crypto.js";
import { ensureDefaultPlans } from "./plans.catalog.js";
import type { GenerateLicenseKeysInput } from "./billing.schema.js";

const KEY_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Unambiguous uppercase alphanumeric

function randomSegment(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  }
  return out;
}

export class LicenseService {
  /**
   * Generates a formatted license key string (e.g. LMS-PRO-4K9A-8X2M-7P3Q).
   */
  public static formatLicenseKey(planCode: string): string {
    const tag = planCode.toUpperCase().slice(0, 4);
    return `LMS-${tag}-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
  }

  /**
   * Normalizes and SHA-256 hashes a license key for safe persistence.
   */
  public static hashLicenseCode(rawCode: string): string {
    const normalized = rawCode.trim().toUpperCase();
    return hashToken(normalized);
  }

  /**
   * Generates a batch of single-use B2B license keys (Super Admin / Distributor).
   * Raw keys are returned only once at creation time.
   */
  public static async generateBatch(
    input: GenerateLicenseKeysInput,
    issuedByUserId?: string
  ): Promise<
    Array<{
      id: string;
      code: string;
      codePrefix: string;
      planCode: string;
      seatCount: number;
      durationDays: number;
    }>
  > {
    return prisma.$transaction(async (tx) => {
      await ensureDefaultPlans(tx);

      const plan = await tx.saaSPlan.findUnique({
        where: { code: input.planCode },
      });
      if (!plan) {
        throw AppError.notFound(`SaaSPlan (${input.planCode})`);
      }

      const issued: Array<{
        id: string;
        code: string;
        codePrefix: string;
        planCode: string;
        seatCount: number;
        durationDays: number;
      }> = [];

      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

      for (let i = 0; i < input.count; i++) {
        const rawCode = this.formatLicenseKey(plan.code);
        const codeHash = this.hashLicenseCode(rawCode);
        const codePrefix = rawCode.slice(0, 12);

        const record = await tx.licenseKey.create({
          data: {
            codeHash,
            codePrefix,
            planId: plan.id,
            seatCount: input.seatCount,
            durationDays: input.durationDays,
            status: "UNUSED",
            issuedByUserId: issuedByUserId || null,
            expiresAt,
            notes: input.notes || null,
          },
        });

        issued.push({
          id: record.id,
          code: rawCode,
          codePrefix: record.codePrefix,
          planCode: plan.code,
          seatCount: record.seatCount,
          durationDays: record.durationDays,
        });
      }

      return issued;
    });
  }

  /**
   * Atomically redeems a single-use license key and upgrades the organization's subscription.
   */
  public static async redeemLicenseKey(organizationId: string, rawCode: string) {
    const codeHash = this.hashLicenseCode(rawCode);

    return prisma.$transaction(async (tx) => {
      const key = await tx.licenseKey.findUnique({
        where: { codeHash },
        include: { plan: true },
      });

      if (!key) {
        throw AppError.notFound("License key", "LICENSE_NOT_FOUND");
      }

      if (key.status === "REVOKED") {
        throw AppError.forbidden("This license key has been revoked", "LICENSE_REVOKED");
      }

      if (key.status === "REDEEMED") {
        throw AppError.conflict("This license key has already been redeemed", "LICENSE_ALREADY_REDEEMED");
      }

      if (key.status === "EXPIRED" || (key.expiresAt && key.expiresAt.getTime() <= Date.now())) {
        throw AppError.badRequest("This license key has expired", undefined, "LICENSE_EXPIRED");
      }

      // Atomic compare-and-set to defeat concurrent double-redemption race conditions
      const claimed = await tx.licenseKey.updateMany({
        where: { id: key.id, status: "UNUSED" },
        data: {
          status: "REDEEMED",
          redeemedByOrgId: organizationId,
          redeemedAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        throw AppError.conflict("License key was concurrently redeemed", "LICENSE_ALREADY_REDEEMED");
      }

      const now = new Date();
      const periodEnd = new Date(now.getTime() + key.durationDays * 24 * 60 * 60 * 1000);

      const subscription = await tx.subscription.upsert({
        where: { organizationId },
        update: {
          planId: key.planId,
          ...(key.distributorId ? { distributorId: key.distributorId } : {}),
          status: "ACTIVE",
          billingCycle: "LIFETIME_KEY",
          seatCount: key.seatCount,
          trialEndsAt: null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        create: {
          organizationId,
          planId: key.planId,
          distributorId: key.distributorId || null,
          status: "ACTIVE",
          billingCycle: "LIFETIME_KEY",
          seatCount: key.seatCount,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      await tx.organization.update({
        where: { id: organizationId },
        data: {
          plan: key.plan.code,
          storageQuotaBytes: key.plan.storageQuotaBytes,
          isActive: true,
          ...(key.distributorId ? { distributorId: key.distributorId } : {}),
        },
      });

      return {
        subscriptionId: subscription.id,
        planCode: key.plan.code,
        planName: key.plan.name,
        seatCount: key.seatCount,
        validUntil: periodEnd.toISOString(),
        codePrefix: key.codePrefix,
      };
    });
  }

  /**
   * Lists issued license keys (Super Admin view — never exposes codeHash or raw code).
   */
  public static async listIssuedKeys(limit = 50) {
    return prisma.licenseKey.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        codePrefix: true,
        seatCount: true,
        durationDays: true,
        status: true,
        redeemedByOrgId: true,
        redeemedAt: true,
        expiresAt: true,
        notes: true,
        createdAt: true,
        plan: { select: { code: true, name: true } },
      },
    });
  }
}
