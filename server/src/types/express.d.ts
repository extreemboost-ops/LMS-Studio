import type { TenantContext } from "../middlewares/tenantContext.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  isSuperAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AuthenticatedUser;
      tenantContext?: TenantContext;
      startTime?: number;
    }
  }
}

export {};
