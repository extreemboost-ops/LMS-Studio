import type { Request, Response, NextFunction } from "express";
import { ContentService } from "./content.service.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";

function getSingleParam(param: string | string[] | undefined): string | undefined {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export class ContentController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const workspaceId = typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const contentType = typeof req.query.contentType === "string" ? req.query.contentType : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const projects = await ContentService.listProjects(orgId, workspaceId, status, contentType, search);
      ResponseHelper.sendSuccess(res, projects, 200, "Content projects retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const project = await ContentService.getProjectById(projectId, orgId);
      ResponseHelper.sendSuccess(res, project, 200, "Content project retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      const userId = req.user?.id;
      if (!orgId || !userId) throw AppError.unauthorized("Authentication & tenant context required");

      const project = await ContentService.createProject(orgId, userId, req.body);
      ResponseHelper.sendSuccess(res, project, 201, "Content project created successfully");
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const project = await ContentService.updateProject(projectId, orgId, req.body);
      ResponseHelper.sendSuccess(res, project, 200, "Content project updated successfully");
    } catch (err) {
      next(err);
    }
  }

  static async duplicate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      const userId = req.user?.id;
      if (!orgId || !userId) throw AppError.unauthorized("Authentication & tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const cloned = await ContentService.duplicateProject(projectId, orgId, userId);
      ResponseHelper.sendSuccess(res, cloned, 201, "Content project duplicated successfully");
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const result = await ContentService.deleteProject(projectId, orgId);
      ResponseHelper.sendSuccess(res, result, 200, "Content project deleted successfully");
    } catch (err) {
      next(err);
    }
  }

  // Document management
  static async saveDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const doc = await ContentService.saveDocument(projectId, orgId, req.body);
      ResponseHelper.sendSuccess(res, doc, 200, "Document saved successfully");
    } catch (err) {
      next(err);
    }
  }

  // Element management
  static async createElement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const element = await ContentService.createElement(projectId, orgId, req.body);
      ResponseHelper.sendSuccess(res, element, 201, "Element created successfully");
    } catch (err) {
      next(err);
    }
  }

  static async updateElement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      const elementId = getSingleParam(req.params.elementId);
      if (!projectId || !elementId) throw AppError.badRequest("Project and Element IDs are required");

      const element = await ContentService.updateElement(elementId, projectId, orgId, req.body);
      ResponseHelper.sendSuccess(res, element, 200, "Element updated successfully");
    } catch (err) {
      next(err);
    }
  }

  static async deleteElement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      const elementId = getSingleParam(req.params.elementId);
      if (!projectId || !elementId) throw AppError.badRequest("Project and Element IDs are required");

      const result = await ContentService.deleteElement(elementId, projectId, orgId);
      ResponseHelper.sendSuccess(res, result, 200, "Element deleted successfully");
    } catch (err) {
      next(err);
    }
  }

  static async reorderElements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const result = await ContentService.reorderElements(projectId, orgId, req.body);
      ResponseHelper.sendSuccess(res, result, 200, "Elements reordered successfully");
    } catch (err) {
      next(err);
    }
  }

  // Version snapshot management
  static async createSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      const userId = req.user?.id;
      if (!orgId || !userId) throw AppError.unauthorized("Authentication & tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const version = await ContentService.createVersionSnapshot(projectId, orgId, userId, req.body);
      ResponseHelper.sendSuccess(res, version, 201, "Version snapshot created successfully");
    } catch (err) {
      next(err);
    }
  }

  static async listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const versions = await ContentService.listVersions(projectId, orgId);
      ResponseHelper.sendSuccess(res, versions, 200, "Version history retrieved successfully");
    } catch (err) {
      next(err);
    }
  }
}
