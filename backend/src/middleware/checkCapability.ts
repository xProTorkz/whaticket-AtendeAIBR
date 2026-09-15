import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import { hasCapability } from "../services/PlanServices/EntitlementService";
import { PlanCapabilities } from "../models/Plan";

export const checkCapability = (capability: keyof PlanCapabilities) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const companyId = req.user?.companyId;

    if (!companyId) {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }

    // SuperAdmin bypasses capability restriction for management purposes if needed,
    // but in tenant context we enforce tenant's plan
    if (req.user?.isSuperAdmin) {
      return next();
    }

    const allowed = await hasCapability(companyId, capability);

    if (!allowed) {
      throw new AppError(
        `Recurso não contratado ou desabilitado para o seu plano: ${String(capability)}`,
        403
      );
    }

    return next();
  };
};

export default checkCapability;
