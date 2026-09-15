import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import uploadConfig from "../config/upload";
import AppError from "../errors/AppError";
import Campaign from "../models/Campaign";
import CreateCampaignService from "../services/CampaignServices/CreateCampaignService";
import ListCampaignsService from "../services/CampaignServices/ListCampaignsService";
import ShowCampaignService from "../services/CampaignServices/ShowCampaignService";
import UpdateCampaignService from "../services/CampaignServices/UpdateCampaignService";
import DeleteCampaignService from "../services/CampaignServices/DeleteCampaignService";
import StartCampaignService from "../services/CampaignServices/StartCampaignService";
import PauseCampaignService from "../services/CampaignServices/PauseCampaignService";
import CancelCampaignService from "../services/CampaignServices/CancelCampaignService";
import RestartCampaignService from "../services/CampaignServices/RestartCampaignService";
import { getIO } from "../libs/socket";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber = "1", searchParam = "" } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { records, count, hasMore } = await ListCampaignsService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await CreateCampaignService({
    campaignData: req.body,
    companyId,
    userId: Number(userId)
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "create",
      record
    });
  } catch (_) {}

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const record = await ShowCampaignService(id, companyId);

  return res.status(200).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await UpdateCampaignService({
    campaignData: req.body,
    id,
    companyId
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "update",
      record
    });
  } catch (_) {}

  return res.status(200).json(record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await DeleteCampaignService(id, companyId);

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "delete",
      id
    });
  } catch (_) {}

  return res.status(200).json({ message: "Campaign deleted" });
};

export const start = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await StartCampaignService(id, companyId);

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "update",
      record
    });
  } catch (_) {}

  return res.status(200).json(record);
};

export const pause = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await PauseCampaignService(id, companyId);

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "update",
      record
    });
  } catch (_) {}

  return res.status(200).json(record);
};

export const cancel = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await CancelCampaignService(id, companyId);

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "update",
      record
    });
  } catch (_) {}

  return res.status(200).json(record);
};

export const restart = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await RestartCampaignService(id, companyId);

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "update",
      record
    });
  } catch (_) {}

  return res.status(200).json(record);
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;
  const file = req.file as Express.Multer.File;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const campaign = await Campaign.findOne({
    where: { id, companyId }
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  await campaign.update({
    mediaPath: file.filename,
    mediaName: file.originalname
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "update",
      record: campaign
    });
  } catch (_) {}

  return res.send({ mensagem: "Arquivo anexado com sucesso" });
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const campaign = await Campaign.findOne({
    where: { id, companyId }
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  if (campaign.mediaPath) {
    const filePath = path.resolve(uploadConfig.directory, campaign.mediaPath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
    }
  }

  await campaign.update({
    mediaPath: null as any,
    mediaName: null as any
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "update",
      record: campaign
    });
  } catch (_) {}

  return res.send({ mensagem: "Arquivo excluído com sucesso" });
};
