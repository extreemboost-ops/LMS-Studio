import type { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { env } from "../../config/env.js";

const REFRESH_COOKIE_NAME = "refreshToken";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
  });
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userAgent = req.headers["user-agent"];
      const ipAddress = req.ip;

      const result = await AuthService.register(req.body, userAgent, ipAddress);
      setRefreshCookie(res, result.refreshToken);

      ResponseHelper.sendSuccess(
        res,
        {
          user: result.user,
          organization: result.organization,
          workspace: result.workspace,
          accessToken: result.accessToken,
        },
        201,
        "Account and organization provisioned successfully"
      );
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userAgent = req.headers["user-agent"];
      const ipAddress = req.ip;

      const result = await AuthService.login(req.body, userAgent, ipAddress);
      setRefreshCookie(res, result.refreshToken);

      ResponseHelper.sendSuccess(
        res,
        {
          user: result.user,
          organization: result.organization,
          workspaceId: result.workspaceId,
          accessToken: result.accessToken,
        },
        200,
        "Login successful"
      );
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      if (!rawToken) {
        ResponseHelper.sendError(res, { code: "UNAUTHORIZED", message: "Refresh token required" }, 401);
        return;
      }

      const userAgent = req.headers["user-agent"];
      const ipAddress = req.ip;

      const result = await AuthService.refresh(rawToken, userAgent, ipAddress);
      setRefreshCookie(res, result.refreshToken);

      ResponseHelper.sendSuccess(
        res,
        { accessToken: result.accessToken },
        200,
        "Token refreshed successfully"
      );
    } catch (err) {
      clearRefreshCookie(res);
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      if (rawToken) {
        await AuthService.logout(rawToken);
      }
      clearRefreshCookie(res);

      ResponseHelper.sendSuccess(res, { loggedOut: true }, 200, "Logged out successfully");
    } catch (err) {
      next(err);
    }
  }

  static async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await AuthService.logoutAll(req.user.id);
      }
      clearRefreshCookie(res);

      ResponseHelper.sendSuccess(res, { loggedOutAll: true }, 200, "All sessions revoked successfully");
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.forgotPassword(req.body.email);
      ResponseHelper.sendSuccess(
        res,
        { sent: true },
        200,
        "If an account with this email exists, a password reset email has been dispatched."
      );
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.resetPassword(req.body);
      clearRefreshCookie(res);
      ResponseHelper.sendSuccess(res, { reset: true }, 200, "Password has been reset successfully. Please log in.");
    } catch (err) {
      next(err);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.verifyEmail(req.body.token);
      ResponseHelper.sendSuccess(res, { verified: true }, 200, "Email verified successfully.");
    } catch (err) {
      next(err);
    }
  }
}
