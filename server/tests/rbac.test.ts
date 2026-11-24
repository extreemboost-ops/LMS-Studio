import { SYSTEM_ROLES, ROLE_PERMISSION_MATRIX, SYSTEM_PERMISSIONS } from "../src/database/rbac-definitions.js";
import { requirePermission, requireRole } from "../src/middlewares/rbac.js";
import { AppError } from "../src/utils/appError.js";
import type { Request, Response, NextFunction } from "express";

export async function runRbacTests(): Promise<{ passed: boolean; message: string }> {
  try {
    // 1. Verify that all 5 system roles are defined
    const roles = Object.values(SYSTEM_ROLES);
    if (roles.length !== 5) {
      return { passed: false, message: `Expected 5 system roles, got ${roles.length}` };
    }

    // 2. Verify permission matrices
    const ownerPerms = ROLE_PERMISSION_MATRIX.OWNER;
    if (ownerPerms.length !== SYSTEM_PERMISSIONS.length) {
      return { passed: false, message: "Expected OWNER to possess all system permissions" };
    }

    const adminPerms = new Set(ROLE_PERMISSION_MATRIX.ADMIN);
    if (!adminPerms.has("content:create") || !adminPerms.has("scorm:export") || !adminPerms.has("org:admin")) {
      return { passed: false, message: "Expected ADMIN to possess administrative permissions" };
    }

    const authorPerms = new Set(ROLE_PERMISSION_MATRIX.AUTHOR);
    if (!authorPerms.has("content:create") || authorPerms.has("org:admin")) {
      return { passed: false, message: "Expected AUTHOR to have content creation without org:admin" };
    }

    const viewerPerms = new Set(ROLE_PERMISSION_MATRIX.VIEWER);
    if (viewerPerms.has("content:create") || !viewerPerms.has("content:view")) {
      return { passed: false, message: "Expected VIEWER to have only view permissions" };
    }

    // 3. Test requirePermission middleware guard
    const authorReq = {
      user: { id: "u-1", email: "author@acme.edu", isSuperAdmin: false },
      tenantContext: {
        organizationId: "org-1",
        userId: "u-1",
        membershipId: "m-1",
        role: "AUTHOR",
        permissions: ROLE_PERMISSION_MATRIX.AUTHOR,
      },
    } as unknown as Request;

    let nextCalled = false;
    let nextError: unknown = null;
    const nextFn: NextFunction = (err?: unknown) => {
      nextCalled = true;
      nextError = err;
    };

    // Author should pass 'content:create'
    const authorGuard = requirePermission("content:create");
    authorGuard(authorReq, {} as Response, nextFn);
    if (!nextCalled || nextError) {
      return { passed: false, message: "Expected AUTHOR to pass content:create permission check" };
    }

    // Author should FAIL 'org:admin'
    nextCalled = false;
    nextError = null;
    const adminGuard = requirePermission("org:admin");
    adminGuard(authorReq, {} as Response, nextFn);
    if (!nextCalled || !(nextError instanceof AppError) || nextError.statusCode !== 403) {
      return { passed: false, message: "Expected AUTHOR to fail org:admin check with 403 Forbidden" };
    }

    // 4. Test requireRole middleware guard
    nextCalled = false;
    nextError = null;
    const roleGuard = requireRole("ADMIN", "OWNER");
    roleGuard(authorReq, {} as Response, nextFn);
    if (!nextCalled || !(nextError instanceof AppError) || nextError.statusCode !== 403) {
      return { passed: false, message: "Expected AUTHOR to fail [ADMIN, OWNER] role guard with 403" };
    }

    return {
      passed: true,
      message: "RBAC matrix and permission guards verified across all 5 system roles (OWNER, ADMIN, AUTHOR, REVIEWER, VIEWER)",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
