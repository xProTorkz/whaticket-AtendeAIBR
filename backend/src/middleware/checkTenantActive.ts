import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import { assertTenantActive } from "../services/PlanServices/EntitlementService";

export const checkTenantActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.user?.isSuperAdmin) {
    return next();
  }

  const companyId = req.user?.companyId;
  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  await assertTenantActive(companyId);

  return next();
};

export default checkTenantActive;
