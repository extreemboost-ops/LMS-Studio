import type { Request, Response, NextFunction } from "express";
import { MemberService } from "./member.service.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";

export class MemberController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantContext) return next(AppError.unauthorized());
      const data = await MemberService.listMembers(req.tenantContext.organizationId);
      ResponseHelper.sendSuccess(res, data, 200);
    } catch (err) {
      next(err);
    }
  }

  static async invite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.tenantContext) return next(AppError.unauthorized());
      const invitation = await MemberService.inviteMember(
        req.tenantContext.organizationId,
        req.user.id,
        req.body
      );
      ResponseHelper.sendSuccess(res, invitation, 201, "Invitation sent successfully");
    } catch (err) {
      next(err);
    }
  }

  static async accept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) return next(AppError.unauthorized());
      const result = await MemberService.acceptInvitation(req.user.id, req.body);
      ResponseHelper.sendSuccess(res, result, 200, "Invitation accepted. You are now a member.");
    } catch (err) {
      next(err);
    }
  }
}
