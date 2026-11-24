import type { Request, Response, NextFunction } from "express";
import { H5PLibraryService } from "./h5p-library.service.js";
import { H5PContentService } from "./h5p-content.service.js";
import { H5PPackageService } from "./h5p-package.service.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";

function getSingleParam(param: string | string[] | undefined): string | undefined {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export class H5PController {
  // Library controllers
  static async listLibraries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const runnable = req.query.runnable === "true" ? true : req.query.runnable === "false" ? false : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const libraries = await H5PLibraryService.listLibraries({ runnable, search });
      ResponseHelper.sendSuccess(res, libraries, 200, "H5P libraries retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  static async getLibraryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const libraryId = getSingleParam(req.params.libraryId);
      if (!libraryId) throw AppError.badRequest("Library ID is required");

      const library = await H5PLibraryService.getLibraryById(libraryId);
      ResponseHelper.sendSuccess(res, library, 200, "Library details retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  static async getLibraryAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const libraryId = getSingleParam(req.params.libraryId);
      if (!libraryId) throw AppError.badRequest("Library ID is required");

      const assets = await H5PLibraryService.resolveAssetHierarchy(libraryId);
      ResponseHelper.sendSuccess(res, assets, 200, "Library assets resolved successfully");
    } catch (err) {
      next(err);
    }
  }

  static async registerLibrary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const library = await H5PLibraryService.registerLibrary(req.body);
      ResponseHelper.sendSuccess(res, library, 201, "H5P library registered successfully");
    } catch (err) {
      next(err);
    }
  }

  // Project Content Instance controllers
  static async getContentInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const instance = await H5PContentService.getContentInstance(projectId, orgId);
      ResponseHelper.sendSuccess(res, instance, 200, "H5P content instance retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  static async saveContentInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const projectId = getSingleParam(req.params.projectId);
      if (!projectId) throw AppError.badRequest("Project ID is required");

      const content = await H5PContentService.saveContentInstance(projectId, orgId, req.body);
      ResponseHelper.sendSuccess(res, content, 200, "H5P content instance saved successfully");
    } catch (err) {
      next(err);
    }
  }

  static async validateParameters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { libraryId, parameters } = req.body;
      const result = await H5PContentService.validateParameters(libraryId, parameters);
      ResponseHelper.sendSuccess(res, result, 200, "Parameters validation completed");
    } catch (err) {
      next(err);
    }
  }

  // Package import controllers
  static async importPackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      const userId = req.user?.id;
      if (!orgId || !userId) throw AppError.unauthorized("Authentication & tenant context required");

      const job = await H5PPackageService.createImportJob(orgId, userId, req.body);
      ResponseHelper.sendSuccess(res, job, 202, "H5P package import queued successfully");
    } catch (err) {
      next(err);
    }
  }
}
