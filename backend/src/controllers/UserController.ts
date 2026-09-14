import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CheckSettingsHelper from "../helpers/CheckSettings";
import AppError from "../errors/AppError";

import CreateUserService from "../services/UserServices/CreateUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const companyId = req.user?.companyId || 1;

  const { users, count, hasMore } = await ListUsersService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ users, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email, password, name, profile, queueIds, whatsappId } = req.body;
  let targetCompanyId = req.user?.companyId || 1;
  let targetIsSuperAdmin = false;

  // Apenas SuperAdmin global pode criar superadmins ou designar tenants arbitrários
  if (req.user?.isSuperAdmin) {
    if (req.body.companyId) {
      targetCompanyId = Number(req.body.companyId);
    }
    if (req.body.isSuperAdmin !== undefined) {
      targetIsSuperAdmin = Boolean(req.body.isSuperAdmin);
    }
  }

  if (
    req.url === "/signup" &&
    (await CheckSettingsHelper("userCreation", targetCompanyId)) === "disabled"
  ) {
    throw new AppError("ERR_USER_CREATION_DISABLED", 403);
  } else if (
    req.url !== "/signup" &&
    req.user.profile !== "admin" &&
    !req.user.isSuperAdmin
  ) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await CreateUserService({
    email,
    password,
    name,
    profile,
    queueIds,
    whatsappId,
    companyId: targetCompanyId,
    isSuperAdmin: targetIsSuperAdmin
  });

  CreateAuditLogService({
    companyId: targetCompanyId,
    userId: req.user?.id ? Number(req.user.id) : undefined,
    action: targetIsSuperAdmin ? "SUPERADMIN_CREATE" : "USER_CREATE",
    entity: "User",
    entityId: user.id,
    details: { email: user.email, profile: user.profile, name: user.name, isSuperAdmin: targetIsSuperAdmin }
  });

  const io = getIO();
  io.emit(`company-${targetCompanyId}-user`, {
    action: "create",
    user
  });
  io.emit("user", {
    action: "create",
    user
  });

  return res.status(200).json(user);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const user = await ShowUserService(userId, companyId);

  return res.status(200).json(user);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const isSelf = String(req.user.id) === String(userId);

  if (req.user.profile !== "admin" && !req.user.isSuperAdmin && !isSelf) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const userData = { ...req.body };

  // Usuários que NÃO são SuperAdmin NÃO podem alterar isSuperAdmin nem companyId
  if (!req.user.isSuperAdmin) {
    delete userData.isSuperAdmin;
    delete userData.companyId;
  }

  // Usuários que não são admins não podem alterar seus próprios cargos
  if (req.user.profile !== "admin" && !req.user.isSuperAdmin) {
    delete userData.profile;
  }

  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  // Busca usuário atual para verificar alterações sensíveis de governança
  const currentUser = await ShowUserService(userId, companyId);

  if (
    req.user.isSuperAdmin &&
    userData.isSuperAdmin !== undefined &&
    Boolean(userData.isSuperAdmin) !== Boolean(currentUser.isSuperAdmin)
  ) {
    CreateAuditLogService({
      companyId: currentUser.companyId || req.user.companyId || 1,
      userId: Number(req.user.id),
      action: userData.isSuperAdmin ? "SUPERADMIN_PROMOTION" : "SUPERADMIN_REVOCATION",
      entity: "User",
      entityId: userId,
      details: {
        targetEmail: currentUser.email,
        previousState: currentUser.isSuperAdmin,
        newState: userData.isSuperAdmin,
        actorId: req.user.id
      }
    });
  }

  const user = await UpdateUserService({ userData, userId, companyId });

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "USER_UPDATE",
    entity: "User",
    entityId: userId,
    details: userData
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-user`, {
    action: "update",
    user
  });
  io.emit("user", {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;

  if (req.user.profile !== "admin" && !req.user.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  await DeleteUserService(userId, companyId, req.user?.isSuperAdmin);

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "USER_DELETE",
    entity: "User",
    entityId: userId
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-user`, {
    action: "delete",
    userId
  });
  io.emit("user", {
    action: "delete",
    userId
  });

  return res.status(200).json({ message: "User deleted" });
};
