import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";
import Setting from "../models/Setting";

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

export const publicShow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { settingKey: key } = req.params;

  try {
    const setting = await Setting.findOne({
      where: { key }
    });

    return res.status(200).json(setting?.value || null);
  } catch (err) {
    return res.status(200).json(null);
  }
};

const safeSettingsKeys: Record<string, string> = {
  groupsTab: "disabled",
  CheckMsgIsGroup: "disabled",
  soundGroupNotifications: "disabled"
};

export const show = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { settingKey: key } = req.params;
  const companyId = req.user?.companyId || 1;

  try {
    const setting = await Setting.findOne({
      where: {
        companyId,
        key
      }
    });

    if (!setting && key in safeSettingsKeys) {
      return res.status(200).json(safeSettingsKeys[key]);
    }

    return res.status(200).json(setting?.value || "");
  } catch (err) {
    if (key in safeSettingsKeys) {
      return res.status(200).json(safeSettingsKeys[key]);
    }
    return res.status(200).json("");
  }
};
