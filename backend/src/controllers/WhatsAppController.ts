import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";
import { whatsappProvider } from "../providers/WhatsApp";

interface WhatsappData {
  name: string;
  queueIds: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const whatsapps = await ListWhatsAppsService(companyId);

  return res.status(200).json(whatsapps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds
  }: WhatsappData = req.body;
  const companyId = req.user?.companyId || 1;

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    companyId
  });

  StartWhatsAppSession(whatsapp);

  CreateAuditLogService({
    companyId,
    userId: Number(req.user.id),
    action: "WHATSAPP_CREATE",
    entity: "Whatsapp",
    entityId: whatsapp.id,
    details: { name: whatsapp.name }
  });

  const io = getIO();
  io.emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp
  });
  io.emit("whatsapp", {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
    io.emit("whatsapp", {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  return res.status(200).json(whatsapp);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId,
    companyId
  });

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "WHATSAPP_UPDATE",
    entity: "Whatsapp",
    entityId: whatsappId,
    details: whatsappData
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-whatsapp`, {
    action: "update",
    whatsapp
  });
  io.emit("whatsapp", {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.emit(`company-${req.user.companyId}-whatsapp`, {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
    io.emit("whatsapp", {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  await DeleteWhatsAppService(whatsappId, companyId);
  whatsappProvider.removeSession(+whatsappId);

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "WHATSAPP_DELETE",
    entity: "Whatsapp",
    entityId: whatsappId
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-whatsapp`, {
    action: "delete",
    whatsappId: +whatsappId
  });
  io.emit("whatsapp", {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};
