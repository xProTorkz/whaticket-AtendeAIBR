import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  getCampaignSettings,
  saveCampaignSettings
} from "../services/CampaignServices/CampaignSettingService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const settings = await getCampaignSettings(companyId);

  return res.json(settings);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile } = req.user;
  const { settings } = req.body;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (!settings || typeof settings !== "object") {
    throw new AppError("ERR_INVALID_SETTINGS", 400);
  }

  await saveCampaignSettings(companyId, settings);

  return res.status(200).json({ message: "Settings saved" });
};
