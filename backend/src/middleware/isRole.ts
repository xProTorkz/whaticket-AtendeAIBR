import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";

export type Role = "visitor" | "collaborator" | "agent" | "manager" | "admin";

/**
 * Middleware para validação server-side de RBAC.
 * Verifica se o perfil do usuário logado consta na lista de papéis permitidos.
 * Usuários com flag isSuperAdmin possuem bypass para operações administrativas.
 */
export const isRole = (allowedRoles: (Role | string)[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }

    const { profile, isSuperAdmin } = req.user;

    // SuperAdmin tem acesso irrestrito
    if (isSuperAdmin) {
      return next();
    }

    if (!allowedRoles.includes(profile)) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    return next();
  };
};

export const isAdmin = isRole(["admin"]);
export const isManagerOrAdmin = isRole(["manager", "admin"]);
export const isAgentOrAbove = isRole(["agent", "manager", "admin"]);
export const isCollaboratorOrAbove = isRole([
  "collaborator",
  "agent",
  "manager",
  "admin"
]);

export default isRole;
