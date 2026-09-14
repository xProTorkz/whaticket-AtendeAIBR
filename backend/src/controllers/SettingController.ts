import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const settings = await ListSettingsService(companyId);

  return res.status(200).json(settings);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin" && !req.user.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { settingKey: key } = req.params;
  const { value } = req.body;
  const companyId = req.user?.companyId || 1;

  const setting = await UpdateSettingService({
    key,
    value,
    companyId
  });

  CreateAuditLogService({
    companyId,
    userId: Number(req.user.id),
    action: "SETTING_UPDATE",
    entity: "Setting",
    entityId: key,
    details: { value }
  });

  const io = getIO();
  io.emit(`company-${companyId}-settings`, {
    action: "update",
    setting
  });
  io.emit("settings", {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};
