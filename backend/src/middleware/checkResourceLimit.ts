import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import { canCreateResource } from "../services/PlanServices/EntitlementService";

type ResourceType = "users" | "connections" | "contacts" | "campaigns" | "contactLists" | "schedules" | "apiKeys" | "webhooks";

export const checkResourceLimit = (resource: ResourceType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const companyId = req.user?.companyId;

    if (!companyId) {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }

    const check = await canCreateResource(companyId, resource);

    if (!check.allowed) {
      if (check.reason === "ERR_TENANT_SUSPENDED") {
        throw new AppError("Empresa suspensa para novas operações.", 403);
      }
      if (check.reason === "ERR_TRIAL_EXPIRED") {
        throw new AppError("Período de teste expirado. Faça o upgrade do plano para continuar.", 403);
      }
      throw new AppError(
        `Limite do plano atingido para ${resource} (${check.current}/${check.max}). Faça upgrade do plano para adicionar mais.`,
        403
      );
    }

    return next();
  };
};

export default checkResourceLimit;
