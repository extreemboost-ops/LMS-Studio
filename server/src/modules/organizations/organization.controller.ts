import type { Request, Response, NextFunction } from "express";
import { OrganizationService } from "./organization.service.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";

export class OrganizationController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) return next(AppError.unauthorized());
      const orgs = await OrganizationService.listUserOrganizations(req.user.id);
      ResponseHelper.sendSuccess(res, orgs, 200);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) return next(AppError.unauthorized());
      const rawId = req.params.organizationId;
      const orgId = Array.isArray(rawId) ? rawId[0] : rawId;
      const org = await OrganizationService.getOrganizationById(orgId, req.user.id);
      ResponseHelper.sendSuccess(res, org, 200);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) return next(AppError.unauthorized());
      const result = await OrganizationService.createOrganization(req.user.id, req.body);
      ResponseHelper.sendSuccess(res, result, 201, "Organization provisioned successfully");
    } catch (err) {
      next(err);
    }
  }

  static async switch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) return next(AppError.unauthorized());
      const rawId = req.params.organizationId;
      const orgId = Array.isArray(rawId) ? rawId[0] : rawId;
      const result = await OrganizationService.switchOrganization(req.user.id, orgId);
      ResponseHelper.sendSuccess(res, result, 200, "Active organization context updated");
    } catch (err) {
      next(err);
    }
  }
}
