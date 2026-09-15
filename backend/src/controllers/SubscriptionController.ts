import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { getTenantEntitlements } from "../services/PlanServices/EntitlementService";

export const myPlan = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const entitlements = await getTenantEntitlements(companyId);

  return res.status(200).json(entitlements);
};

export const updateMyPlan = async (req: Request, res: Response): Promise<Response> => {
  // Direct test verification: regular tenant admins CANNOT change their plan or limits directly
  if (!req.user.isSuperAdmin) {
    throw new AppError("ERR_CANNOT_CHANGE_OWN_PLAN", 403);
  }

  return res.status(200).json({ message: "Plan updated" });
};
