import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import { ensureDefaultPlans } from "./plans.catalog.js";
import type { CreateCheckoutInput } from "./billing.schema.js";

export interface StripeWebhookPayload {
  id: string;
  type: string;
  data: {
    object: Record<string, any>;
  };
}

export class StripeService {
  private static readonly STRIPE_API = "https://api.stripe.com/v1";

  private static assertStripeConfigured(): string {
    if (!env.STRIPE_SECRET_KEY) {
      throw new AppError(
        503,
        "BILLING_PROVIDER_UNCONFIGURED",
        "Stripe billing is not configured on this server (STRIPE_SECRET_KEY missing). Use B2B license key redemption or configure Stripe environment variables."
      );
    }
    return env.STRIPE_SECRET_KEY;
  }

  /**
   * Verifies Stripe `Stripe-Signature` header (`t=...,v1=...`) using constant-time HMAC-SHA256 comparison.
   */
  public static verifyWebhookSignature(
    rawBody: Buffer | string,
    signatureHeader: string | undefined,
    webhookSecret: string | undefined = env.STRIPE_WEBHOOK_SECRET,
    toleranceSeconds = 300
  ): StripeWebhookPayload {
    if (!webhookSecret) {
      throw new AppError(503, "WEBHOOK_SECRET_UNCONFIGURED", "STRIPE_WEBHOOK_SECRET is not configured");
    }
    if (!signatureHeader) {
      throw AppError.unauthorized("Missing Stripe-Signature header", "INVALID_WEBHOOK_SIGNATURE");
    }

    const parts = signatureHeader.split(",").map((p) => p.trim());
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const v1Parts = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));

    if (!timestampPart || v1Parts.length === 0) {
      throw AppError.unauthorized("Malformed Stripe-Signature header", "INVALID_WEBHOOK_SIGNATURE");
    }

    const timestamp = Number(timestampPart.slice(2));
    if (!Number.isFinite(timestamp)) {
      throw AppError.unauthorized("Invalid timestamp in Stripe-Signature", "INVALID_WEBHOOK_SIGNATURE");
    }

    const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
    if (ageSeconds > toleranceSeconds) {
      throw AppError.unauthorized("Stripe webhook timestamp outside replay tolerance", "WEBHOOK_TIMESTAMP_EXPIRED");
    }

    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    const signedPayload = `${timestamp}.${bodyStr}`;
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(signedPayload, "utf8")
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSig, "hex");
    const matched = v1Parts.some((sig) => {
      try {
        const sigBuf = Buffer.from(sig, "hex");
        return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
      } catch {
        return false;
      }
    });

    if (!matched) {
      throw AppError.unauthorized("Stripe webhook signature verification failed", "INVALID_WEBHOOK_SIGNATURE");
    }

    return JSON.parse(bodyStr) as StripeWebhookPayload;
  }

  /**
   * Creates a Stripe Checkout Session for upgrading an organization's plan.
   */
  public static async createCheckoutSession(
    organizationId: string,
    userEmail: string,
    input: CreateCheckoutInput
  ): Promise<{ sessionId: string; url: string }> {
    const secretKey = this.assertStripeConfigured();

    await ensureDefaultPlans(prisma);
    const plan = await prisma.saaSPlan.findUnique({ where: { code: input.planCode } });
    if (!plan) {
      throw AppError.notFound(`SaaSPlan (${input.planCode})`);
    }

    const priceId =
      input.billingCycle === "ANNUAL" ? plan.stripeAnnualPriceId : plan.stripeMonthlyPriceId;

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set(
      "success_url",
      input.successUrl || `${env.APP_PUBLIC_URL}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`
    );
    params.set("cancel_url", input.cancelUrl || `${env.APP_PUBLIC_URL}/settings?billing=cancelled`);
    params.set("customer_email", userEmail);
    params.set("client_reference_id", organizationId);
    params.set("metadata[organizationId]", organizationId);
    params.set("metadata[planCode]", plan.code);
    params.set("metadata[billingCycle]", input.billingCycle);

    if (priceId) {
      params.set("line_items[0][price]", priceId);
      params.set("line_items[0][quantity]", "1");
    } else {
      const unitAmount =
        input.billingCycle === "ANNUAL" ? plan.annualPriceCents : plan.monthlyPriceCents;
      params.set("line_items[0][price_data][currency]", plan.currency);
      params.set("line_items[0][price_data][product_data][name]", `Authoring Studio — ${plan.name}`);
      params.set("line_items[0][price_data][unit_amount]", String(unitAmount));
      params.set(
        "line_items[0][price_data][recurring][interval]",
        input.billingCycle === "ANNUAL" ? "year" : "month"
      );
      params.set("line_items[0][quantity]", "1");
    }

    const res = await fetch(`${this.STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      throw AppError.badRequest(
        data?.error?.message || "Failed to create Stripe checkout session",
        data?.error,
        "STRIPE_CHECKOUT_FAILED"
      );
    }

    return { sessionId: data.id, url: data.url };
  }

  /**
   * Creates a Stripe Customer Billing Portal session for managing payment methods and invoices.
   */
  public static async createPortalSession(
    organizationId: string,
    returnUrl?: string
  ): Promise<{ url: string }> {
    const secretKey = this.assertStripeConfigured();

    const sub = await prisma.subscription.findUnique({ where: { organizationId } });
    if (!sub?.stripeCustomerId) {
      throw AppError.badRequest(
        "No Stripe customer record found for this organization. Subscribe to a paid plan first."
      );
    }

    const params = new URLSearchParams();
    params.set("customer", sub.stripeCustomerId);
    params.set("return_url", returnUrl || `${env.APP_PUBLIC_URL}/settings`);

    const res = await fetch(`${this.STRIPE_API}/billing_portal/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      throw AppError.badRequest(
        data?.error?.message || "Failed to create Stripe portal session",
        data?.error,
        "STRIPE_PORTAL_FAILED"
      );
    }

    return { url: data.url };
  }

  /**
   * Idempotently processes verified Stripe webhook events and updates Subscription state.
   */
  public static async processWebhookEvent(event: StripeWebhookPayload): Promise<{ processed: boolean; duplicate?: boolean }> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.billingWebhookEvent.findUnique({
        where: { externalEventId: event.id },
      });
      if (existing) {
        return { processed: true, duplicate: true };
      }

      await tx.billingWebhookEvent.create({
        data: {
          provider: "stripe",
          externalEventId: event.id,
          eventType: event.type,
        },
      });

      const obj = event.data.object;

      if (event.type === "checkout.session.completed") {
        const orgId = obj.metadata?.organizationId || obj.client_reference_id;
        const planCode = obj.metadata?.planCode || "pro";
        const billingCycle = obj.metadata?.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY";

        if (orgId) {
          await ensureDefaultPlans(tx);
          const plan = await tx.saaSPlan.findUnique({ where: { code: planCode } });
          if (plan) {
            const now = new Date();
            const days = billingCycle === "ANNUAL" ? 365 : 30;
            const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

            await tx.subscription.upsert({
              where: { organizationId: orgId },
              update: {
                planId: plan.id,
                status: "ACTIVE",
                billingCycle,
                trialEndsAt: null,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                stripeCustomerId: obj.customer || null,
                stripeSubscriptionId: obj.subscription || null,
              },
              create: {
                organizationId: orgId,
                planId: plan.id,
                status: "ACTIVE",
                billingCycle,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                stripeCustomerId: obj.customer || null,
                stripeSubscriptionId: obj.subscription || null,
              },
            });

            const org = await tx.organization.update({
              where: { id: orgId },
              data: {
                plan: plan.code,
                storageQuotaBytes: plan.storageQuotaBytes,
                isActive: true,
              },
            });

            // Record Distributor commission if organization is attributed to an active partner
            if (org.distributorId) {
              const dist = await tx.distributor.findUnique({ where: { id: org.distributorId } });
              if (dist && dist.status === "ACTIVE" && dist.billingMode !== "WHOLESALE_POOL") {
                const grossCents =
                  typeof obj.amount_total === "number"
                    ? obj.amount_total
                    : billingCycle === "ANNUAL"
                    ? plan.annualPriceCents
                    : plan.monthlyPriceCents;
                const pct = Number(dist.commissionPercent);
                const commissionCents = Math.round((grossCents * pct) / 100);

                if (commissionCents > 0) {
                  await tx.commissionLedger.create({
                    data: {
                      distributorId: dist.id,
                      organizationId: orgId,
                      grossAmountCents: grossCents,
                      commissionPercent: dist.commissionPercent,
                      commissionCents,
                      status: "AVAILABLE",
                      description: `${plan.name} (${billingCycle}) subscription commission`,
                    },
                  });
                }
              }
            }
          }
        }
      } else if (event.type === "customer.subscription.deleted" && obj.id) {
        await tx.subscription.updateMany({
          where: { stripeSubscriptionId: obj.id },
          data: { status: "CANCELLED" },
        });
      } else if (event.type === "invoice.payment_failed" && obj.subscription) {
        await tx.subscription.updateMany({
          where: { stripeSubscriptionId: obj.subscription },
          data: { status: "PAST_DUE" },
        });
      }

      return { processed: true, duplicate: false };
    });
  }
}
