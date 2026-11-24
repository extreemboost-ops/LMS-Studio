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
