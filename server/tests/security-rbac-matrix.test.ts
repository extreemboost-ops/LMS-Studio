import { SYSTEM_ROLES, ROLE_PERMISSION_MATRIX, SYSTEM_PERMISSIONS } from "../src/database/rbac-definitions.js";
import { requirePermission, requireRole } from "../src/middlewares/rbac.js";
import { AppError } from "../src/utils/appError.js";
import type { Request, Response, NextFunction } from "express";

export async function runSecurityRbacMatrixTests(): Promise<{ passed: boolean; message: string }> {
  try {
    // -------------------------------------------------------------------------
    // 1. Definition Completeness & Mathematical Hierarchy
    // -------------------------------------------------------------------------
    const expectedRoles = ["OWNER", "ADMIN", "AUTHOR", "REVIEWER", "VIEWER"];
    for (const r of expectedRoles) {
      if (!ROLE_PERMISSION_MATRIX[r as keyof typeof ROLE_PERMISSION_MATRIX]) {
        return { passed: false, message: `System role '${r}' missing from permission matrix` };
      }
    }

    // Helper to simulate express guard invocation
    function evaluateGuard(
      guard: (req: Request, res: Response, next: NextFunction) => void,
      role: string,
      permissions: string[],
      isSuperAdmin = false
    ): { allowed: boolean; error?: AppError } {
      let allowed = false;
      let error: AppError | undefined;

      const req = {
        user: { id: "usr_test", email: `${role.toLowerCase()}@test.com`, isSuperAdmin },
        tenantContext: {
          organizationId: "org_test",
          userId: "usr_test",
          membershipId: "mem_test",
          role,
          permissions,
        },
      } as unknown as Request;

      const res = {} as Response;
      const next: NextFunction = (err?: unknown) => {
        if (!err) {
          allowed = true;
        } else if (err instanceof AppError) {
          error = err;
        }
      };

      guard(req, res, next);
      return { allowed, error };
    }

    // -------------------------------------------------------------------------
    // 2. Comprehensive Role-by-Role Permission Guard Verification
    // -------------------------------------------------------------------------
    const testCases: Array<{
      permission: string;
      shouldPass: string[];
      shouldFail: string[];
    }> = [
      {
        permission: "org:admin",
        shouldPass: ["OWNER", "ADMIN"],
        shouldFail: ["AUTHOR", "REVIEWER", "VIEWER"],
      },
      {
        permission: "org:invite",
        shouldPass: ["OWNER", "ADMIN"],
        shouldFail: ["AUTHOR", "REVIEWER", "VIEWER"],
      },
      {
        permission: "workspace:create",
        shouldPass: ["OWNER", "ADMIN"],
        shouldFail: ["AUTHOR", "REVIEWER", "VIEWER"],
      },
      {
        permission: "content:create",
        shouldPass: ["OWNER", "ADMIN", "AUTHOR"],
        shouldFail: ["REVIEWER", "VIEWER"],
      },
      {
        permission: "content:edit",
        shouldPass: ["OWNER", "ADMIN", "AUTHOR"],
        shouldFail: ["REVIEWER", "VIEWER"],
      },
      {
        permission: "content:delete",
        shouldPass: ["OWNER", "ADMIN"],
        shouldFail: ["AUTHOR", "REVIEWER", "VIEWER"],
      },
      {
        permission: "scorm:export",
        shouldPass: ["OWNER", "ADMIN", "AUTHOR"],
        shouldFail: ["REVIEWER", "VIEWER"],
      },
      {
        permission: "h5p:export",
        shouldPass: ["OWNER", "ADMIN", "AUTHOR"],
        shouldFail: ["REVIEWER", "VIEWER"],
      },
      {
        permission: "content:review",
        shouldPass: ["OWNER", "ADMIN", "AUTHOR", "REVIEWER"],
        shouldFail: ["VIEWER"],
      },
      {
        permission: "content:view",
        shouldPass: ["OWNER", "ADMIN", "AUTHOR", "REVIEWER", "VIEWER"],
        shouldFail: [],
      },
    ];

    for (const tc of testCases) {
      const guard = requirePermission(tc.permission);

      // Verify passing roles
      for (const role of tc.shouldPass) {
        const perms = ROLE_PERMISSION_MATRIX[role as keyof typeof ROLE_PERMISSION_MATRIX];
        const res = evaluateGuard(guard, role, perms);
        if (!res.allowed) {
          return {
            passed: false,
            message: `Role ${role} should have been ALLOWED for permission '${tc.permission}', but was denied`,
          };
        }
      }

      // Verify failing roles
      for (const role of tc.shouldFail) {
        const perms = ROLE_PERMISSION_MATRIX[role as keyof typeof ROLE_PERMISSION_MATRIX];
        const res = evaluateGuard(guard, role, perms);
        if (res.allowed) {
          return {
            passed: false,
            message: `Role ${role} should have been FORBIDDEN for permission '${tc.permission}', but was allowed!`,
          };
        }
        if (res.error?.statusCode !== 403 || res.error?.errorCode !== "PERMISSION_DENIED") {
          return {
            passed: false,
            message: `Expected 403 PERMISSION_DENIED for ${role} on '${tc.permission}', got ${res.error?.statusCode} / ${res.error?.errorCode}`,
          };
        }
      }
    }

    // -------------------------------------------------------------------------
    // 3. Multi-Permission Requirement Guard Verification
    // -------------------------------------------------------------------------
    // Requires both 'content:create' AND 'scorm:export'
    const authorMultiGuard = requirePermission("content:create", "scorm:export");
    const authorRes = evaluateGuard(
      authorMultiGuard,
      "AUTHOR",
      ROLE_PERMISSION_MATRIX.AUTHOR
    );
    if (!authorRes.allowed) {
      return { passed: false, message: "AUTHOR should pass both content:create and scorm:export" };
    }

    const reviewerRes = evaluateGuard(
      authorMultiGuard,
      "REVIEWER",
      ROLE_PERMISSION_MATRIX.REVIEWER
    );
    if (reviewerRes.allowed) {
      return { passed: false, message: "REVIEWER should fail multi-permission guard" };
    }

    // -------------------------------------------------------------------------
    // 4. Role Guard Verification (requireRole)
    // -------------------------------------------------------------------------
    const adminOnlyGuard = requireRole("ADMIN", "OWNER");

    const ownerRoleRes = evaluateGuard(adminOnlyGuard, "OWNER", ROLE_PERMISSION_MATRIX.OWNER);
    if (!ownerRoleRes.allowed) {
      return { passed: false, message: "OWNER was rejected by requireRole('ADMIN', 'OWNER')" };
    }

    const adminRoleRes = evaluateGuard(adminOnlyGuard, "ADMIN", ROLE_PERMISSION_MATRIX.ADMIN);
    if (!adminRoleRes.allowed) {
      return { passed: false, message: "ADMIN was rejected by requireRole('ADMIN', 'OWNER')" };
    }

    const authorRoleRes = evaluateGuard(adminOnlyGuard, "AUTHOR", ROLE_PERMISSION_MATRIX.AUTHOR);
    if (authorRoleRes.allowed || authorRoleRes.error?.statusCode !== 403) {
      return { passed: false, message: "AUTHOR was incorrectly allowed by requireRole('ADMIN', 'OWNER')" };
    }

    // -------------------------------------------------------------------------
    // 5. SuperAdmin & OWNER Full-Bypass Invariants
    // -------------------------------------------------------------------------
    const nonExistentPermGuard = requirePermission("custom:super_restricted");
    const superAdminRes = evaluateGuard(nonExistentPermGuard, "VIEWER", [], true);
    if (!superAdminRes.allowed) {
      return { passed: false, message: "SuperAdmin failed to bypass custom permission check" };
    }

    const ownerRes = evaluateGuard(nonExistentPermGuard, "OWNER", []);
    if (!ownerRes.allowed) {
      return { passed: false, message: "OWNER failed to bypass custom permission check" };
    }

    // -------------------------------------------------------------------------
    // 6. Missing Tenant Context Guard Verification
    // -------------------------------------------------------------------------
    let missingContextCaught = false;
    const reqNoTenant = { user: { id: "u-1" } } as unknown as Request;
    const guardNoTenant = requirePermission("content:view");
    guardNoTenant(reqNoTenant, {} as Response, (err) => {
      if (err instanceof AppError && err.statusCode === 401) {
        missingContextCaught = true;
      }
    });

    if (!missingContextCaught) {
      return { passed: false, message: "requirePermission failed to reject request without tenantContext" };
    }

    return {
      passed: true,
      message:
        "RBAC verified across all 5 roles (OWNER, ADMIN, AUTHOR, REVIEWER, VIEWER) for organization, workspace, member, content, review, view, and export permissions",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
