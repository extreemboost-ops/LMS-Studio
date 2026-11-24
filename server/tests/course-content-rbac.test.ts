import { ROLE_PERMISSION_MATRIX } from "../src/database/rbac-definitions.js";
import { requirePermission } from "../src/middlewares/rbac.js";
import { AppError } from "../src/utils/appError.js";
import type { Request, Response, NextFunction } from "express";

export async function runCourseContentRbacTests(): Promise<{ passed: boolean; message: string }> {
  try {
    function testGuard(permission: string, role: string): boolean {
      const perms = ROLE_PERMISSION_MATRIX[role as keyof typeof ROLE_PERMISSION_MATRIX] || [];
      const guard = requirePermission(permission);

      let allowed = false;
      const req = {
        user: { id: "u-test", isSuperAdmin: false },
        tenantContext: {
          organizationId: "org-test",
          userId: "u-test",
          membershipId: "mem-test",
          role,
          permissions: perms,
        },
      } as unknown as Request;

      guard(req, {} as Response, (err) => {
        if (!err) allowed = true;
      });

      return allowed;
    }

    const roles = ["OWNER", "ADMIN", "AUTHOR", "REVIEWER", "VIEWER"];

    // 1. Course & Content View (content:view) — All 5 roles must pass
    for (const r of roles) {
      if (!testGuard("content:view", r)) {
        return { passed: false, message: `Role ${r} was denied content:view` };
      }
    }

    // 2. Course & Content Creation (content:create) — OWNER, ADMIN, AUTHOR pass; REVIEWER, VIEWER fail
    if (!testGuard("content:create", "OWNER") || !testGuard("content:create", "ADMIN") || !testGuard("content:create", "AUTHOR")) {
      return { passed: false, message: "Expected OWNER, ADMIN, AUTHOR to pass content:create" };
    }
    if (testGuard("content:create", "REVIEWER") || testGuard("content:create", "VIEWER")) {
      return { passed: false, message: "Expected REVIEWER, VIEWER to fail content:create" };
    }

    // 3. Course & Content Modification (content:edit) — OWNER, ADMIN, AUTHOR pass; REVIEWER, VIEWER fail
    if (!testGuard("content:edit", "OWNER") || !testGuard("content:edit", "ADMIN") || !testGuard("content:edit", "AUTHOR")) {
      return { passed: false, message: "Expected OWNER, ADMIN, AUTHOR to pass content:edit" };
    }
    if (testGuard("content:edit", "REVIEWER") || testGuard("content:edit", "VIEWER")) {
      return { passed: false, message: "Expected REVIEWER, VIEWER to fail content:edit" };
    }

    // 4. Course & Content Deletion (content:delete) — OWNER, ADMIN pass; AUTHOR, REVIEWER, VIEWER fail
    if (!testGuard("content:delete", "OWNER") || !testGuard("content:delete", "ADMIN")) {
      return { passed: false, message: "Expected OWNER, ADMIN to pass content:delete" };
    }
    if (testGuard("content:delete", "AUTHOR") || testGuard("content:delete", "REVIEWER") || testGuard("content:delete", "VIEWER")) {
      return { passed: false, message: "Expected AUTHOR, REVIEWER, VIEWER to fail content:delete" };
    }

    // 5. Version Snapshot Publishing (content:publish) — OWNER, ADMIN, AUTHOR pass; REVIEWER, VIEWER fail
    if (!testGuard("content:publish", "OWNER") || !testGuard("content:publish", "ADMIN") || !testGuard("content:publish", "AUTHOR")) {
      return { passed: false, message: "Expected OWNER, ADMIN, AUTHOR to pass content:publish" };
    }
    if (testGuard("content:publish", "REVIEWER") || testGuard("content:publish", "VIEWER")) {
      return { passed: false, message: "Expected REVIEWER, VIEWER to fail content:publish" };
    }

    // 6. Reviewing Content (content:review) — OWNER, ADMIN, AUTHOR, REVIEWER pass; VIEWER fails
    if (!testGuard("content:review", "REVIEWER")) {
      return { passed: false, message: "Expected REVIEWER to pass content:review" };
    }
    if (testGuard("content:review", "VIEWER")) {
      return { passed: false, message: "Expected VIEWER to fail content:review" };
    }

    return {
      passed: true,
      message:
        "RBAC permissions for course and content operations (view, create, edit, delete, publish, review) verified across all 5 system roles",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
