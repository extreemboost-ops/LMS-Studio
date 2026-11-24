import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../database/prisma.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(AppError.unauthorized());
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isSuperAdmin: true,
          isEmailVerified: true,
          createdAt: true,
          memberships: {
            where: { status: "ACTIVE" },
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  plan: true,
                  isActive: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return next(AppError.notFound("User"));
      }

      ResponseHelper.sendSuccess(res, user, 200);
    } catch (err) {
      next(err);
    }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        return next(AppError.unauthorized());
      }

      const { firstName, lastName, avatarUrl } = req.body;

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(firstName ? { firstName: String(firstName).trim() } : {}),
          ...(lastName ? { lastName: String(lastName).trim() } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl ? String(avatarUrl).trim() : null } : {}),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isEmailVerified: true,
          updatedAt: true,
        },
      });

      ResponseHelper.sendSuccess(res, updated, 200, "Profile updated successfully");
    } catch (err) {
      next(err);
    }
  }
}
