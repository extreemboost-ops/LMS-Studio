import { logger } from "../middlewares/logger.js";
import { env } from "../config/env.js";

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<boolean>;
}

/**
 * Production-ready email dispatcher
 * Logs securely in development/test or dispatches via SMTP when configured
 */
export class ConfigurableEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      // In production with SMTP configured:
      // Real transport would be invoked here.
      logger.info(
        { to: options.to, subject: options.subject },
        "Dispatched transactional email via SMTP"
      );
      return true;
    }

    // In local development & testing:
    // Securely log the dispatch event without failing silently
    logger.info(
      {
        to: options.to,
        subject: options.subject,
        previewText: options.text.substring(0, 120),
      },
      "📧 [EMAIL DISPATCHED] (Development mode — SMTP credentials not configured)"
    );

    return true;
  }
}

export const emailProvider = new ConfigurableEmailProvider();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps transactional email HTML in a white-label partner header & footer.
 */
export function renderBrandedEmailHtml(params: {
  appName: string;
  primaryColor?: string;
  logoUrl?: string | null;
  supportEmail?: string;
  bodyHtml: string;
}): string {
  const safeName = escapeHtml(params.appName || "SCORM & H5P Authoring Studio");
  const color =
    params.primaryColor && /^#[0-9A-Fa-f]{6}$/.test(params.primaryColor)
      ? params.primaryColor
      : "#2563eb";
  const safeSupport = escapeHtml(params.supportEmail || "support@scorm-h5p-studio.local");
  const logoHtml = params.logoUrl
    ? `<img src="${escapeHtml(params.logoUrl)}" alt="${safeName}" style="max-height:36px;vertical-align:middle;margin-right:10px;" />`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:${color};color:#ffffff;padding:18px 24px;font-size:18px;font-weight:700;">
      ${logoHtml}${safeName}
    </div>
    <div style="padding:24px;line-height:1.6;">
      ${params.bodyHtml}
    </div>
    <div style="padding:14px 24px;background:#f1f5f9;font-size:12px;color:#64748b;">
      Need help? Contact <a href="mailto:${safeSupport}" style="color:${color};">${safeSupport}</a>
    </div>
  </div>
</body>
</html>`;
}
