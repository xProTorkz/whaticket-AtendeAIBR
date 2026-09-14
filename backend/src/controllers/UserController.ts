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
  const companyId = req.user?.companyId || 1;

  if (
    req.url === "/signup" &&
    (await CheckSettingsHelper("userCreation", companyId)) === "disabled"
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
    companyId
  });

  CreateAuditLogService({
    companyId,
    userId: req.user?.id ? Number(req.user.id) : undefined,
    action: "USER_CREATE",
    entity: "User",
    entityId: user.id,
    details: { email: user.email, profile: user.profile, name: user.name }
  });

  const io = getIO();
  io.emit(`company-${companyId}-user`, {
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

  const userData = req.body;
  // Non-admins cannot elevate profile or company
  if (req.user.profile !== "admin" && !req.user.isSuperAdmin) {
    delete userData.profile;
    delete userData.companyId;
    delete userData.isSuperAdmin;
  }

  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

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

  await DeleteUserService(userId, companyId);

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
