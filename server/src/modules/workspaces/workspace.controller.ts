import type { Request, Response, NextFunction } from "express";
import { WorkspaceService } from "./workspace.service.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";

export class WorkspaceController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantContext) return next(AppError.unauthorized());
      const workspaces = await WorkspaceService.listWorkspaces(req.tenantContext.organizationId);
      ResponseHelper.sendSuccess(res, workspaces, 200);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.tenantContext) return next(AppError.unauthorized());
      const workspace = await WorkspaceService.createWorkspace(req.tenantContext.organizationId, req.body);
      ResponseHelper.sendSuccess(res, workspace, 201, "Workspace created successfully");
    } catch (err) {
      next(err);
    }
  }
}
