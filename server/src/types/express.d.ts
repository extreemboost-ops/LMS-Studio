import type { TenantContext } from "../middlewares/tenantContext.js";
import type { DistributorContext } from "../middlewares/distributorContext.js";

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
      distributorContext?: DistributorContext;
      startTime?: number;
    }
  }
}

export {};
