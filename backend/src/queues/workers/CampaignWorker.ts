import { Worker, Job } from "bullmq";
import fs from "fs";
import path from "path";
import { getQueueRedisOptions } from "../connection";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import CampaignSetting from "../../models/CampaignSetting";
import ContactListItem from "../../models/ContactListItem";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { ChannelManager } from "../../channels/ChannelManager";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import uploadConfig from "../../config/upload";

export interface CampaignJobData {
  campaignId: number;
  contactListItemId: number;
  companyId: number;
}

export const checkOperatingWindow = async (
  companyId: number
): Promise<{ inWindow: boolean; waitMs: number }> => {
  // Configurações padrão ou customizadas por tenant
  let startHour = 8;
  let endHour = 20;

  try {
    const startSetting = await CampaignSetting.findOne({
      where: { companyId, key: "operatingWindowStart" }
    });
    if (startSetting && startSetting.value) {
      const parsed = parseInt(startSetting.value.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
        startHour = parsed;
      }
    }

    const endSetting = await CampaignSetting.findOne({
      where: { companyId, key: "operatingWindowEnd" }
    });
    if (endSetting && endSetting.value) {
      const parsed = parseInt(endSetting.value.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
        endHour = parsed;
      }
    }
  } catch (_) {}

  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= startHour && currentHour < endHour) {
    return { inWindow: true, waitMs: 0 };
  }

  // Calcular milissegundos até a próxima abertura da janela
  const nextStart = new Date(now);
  if (currentHour >= endHour) {
    // Abre amanhã no startHour
    nextStart.setDate(nextStart.getDate() + 1);
  }
  nextStart.setHours(startHour, 0, 0, 0);

  const waitMs = Math.max(1000, nextStart.getTime() - now.getTime());
  return { inWindow: false, waitMs };
};

export const interpolateVariables = (
  text: string,
  contactItem: ContactListItem,
  customVariables: Array<{ key: string; value: string }> = []
): string => {
  if (!text) return "";

  let result = text
    .replace(/{nome}/gi, contactItem.name || "")
    .replace(/{name}/gi, contactItem.name || "")
    .replace(/{numero}/gi, contactItem.number || "")
    .replace(/{number}/gi, contactItem.number || "")
    .replace(/{email}/gi, contactItem.email || "");

  if (Array.isArray(customVariables)) {
    for (const v of customVariables) {
      if (v.key && v.value) {
        const regex = new RegExp(`{${v.key}}`, "gi");
        result = result.replace(regex, v.value);
      }
    }
  }

  return result;
};

export const processCampaignJob = async (job: Job<CampaignJobData>): Promise<void> => {
  const { campaignId, contactListItemId, companyId } = job.data;

  logger.info(`[CampaignWorker] Processing job ${job.id} for campaign ${campaignId}, item ${contactListItemId}`);

  const campaign = await Campaign.findOne({
    where: { id: campaignId, companyId }
  });

  if (!campaign) {
    logger.warn(`[CampaignWorker] Campaign ${campaignId} not found.`);
    return;
  }

  // Se a campanha foi cancelada, pausada ou já finalizada, não dispara
  if (campaign.status === "CANCELADA" || campaign.status === "PAUSADA" || campaign.status === "FINALIZADA") {
    logger.info(`[CampaignWorker] Campaign ${campaignId} is ${campaign.status}. Aborting job.`);
    return;
  }

  // Busca ou cria o registro de shipping
  let shipping = await CampaignShipping.findOne({
    where: { campaignId, contactListItemId, companyId }
  });

  if (!shipping) {
    const item = await ContactListItem.findOne({
      where: { id: contactListItemId, companyId }
    });

    shipping = await CampaignShipping.create({
      campaignId,
      contactListItemId,
      companyId,
      jobId: job.id,
      number: item ? item.number : "",
      status: "pending"
    });
  }

  // Idempotência: se já foi entregue ou marcado como optout, encerra sem duplicar
  if (shipping.status === "delivered" || Boolean(shipping.deliveredAt)) {
    logger.info(`[CampaignWorker] Item ${contactListItemId} already delivered for campaign ${campaignId}. Skipping.`);
    return;
  }

  // Verificação de Janela Operacional
  const windowCheck = await checkOperatingWindow(companyId);
  if (!windowCheck.inWindow) {
    logger.info(
      `[CampaignWorker] Outside operating window for company ${companyId}. Delaying job by ${windowCheck.waitMs}ms.`
    );
    // Mover o job para atraso seguro sem falhar
    await job.moveToDelayed(Date.now() + windowCheck.waitMs, job.token);
    return;
  }

  // Obter item de contato
  const contactItem = await ContactListItem.findOne({
    where: { id: contactListItemId, companyId }
  });

  if (!contactItem) {
    shipping.status = "failed";
    shipping.error = "Item de contato não encontrado";
    await shipping.save();
    await updateCampaignProgressAndNotify(campaign);
    return;
  }

  // Verificação de Opt-out / Supressão
  let isOptOut = contactItem.optOut === true;
  if (!isOptOut && contactItem.number) {
    const contact = await Contact.findOne({
      where: { number: contactItem.number, companyId }
    });
    if (contact && contact.optOut) {
      isOptOut = true;
    }
  }

  if (isOptOut) {
    logger.info(`[CampaignWorker] Contact ${contactItem.number} has opted out. Suppressing dispatch.`);
    shipping.status = "optout";
    shipping.error = "Contato solicitou opt-out";
    await shipping.save();
    await updateCampaignProgressAndNotify(campaign);
    return;
  }

  if (!contactItem.isWhatsappValid) {
    logger.info(`[CampaignWorker] Contact ${contactItem.number} has invalid WhatsApp.`);
    shipping.status = "failed";
    shipping.error = "Número inválido para WhatsApp";
    await shipping.save();
    await updateCampaignProgressAndNotify(campaign);
    return;
  }

  try {
    // Obter WhatsApp de disparo
    let whatsapp: Whatsapp | null = null;
    if (campaign.whatsappId) {
      whatsapp = await Whatsapp.findByPk(campaign.whatsappId);
    }
    if (!whatsapp) {
      whatsapp = await GetDefaultWhatsApp(campaign.userId, companyId);
    }
    if (!whatsapp) {
      throw new Error("ERR_NO_WAPP_FOUND_FOR_CAMPAIGN");
    }

    // Carregar variáveis customizadas
    let customVariables: Array<{ key: string; value: string }> = [];
    const varSetting = await CampaignSetting.findOne({
      where: { companyId, key: "variables" }
    });
    if (varSetting && varSetting.value) {
      try {
        customVariables = JSON.parse(varSetting.value);
      } catch (_) {}
    }

    // Selecionar mensagem aleatória entre as mensagens disponíveis da campanha
    const rawMessages = [
      campaign.message1,
      campaign.message2,
      campaign.message3,
      campaign.message4,
      campaign.message5
    ].filter(m => typeof m === "string" && m.trim().length > 0);

    const rawTemplate = rawMessages.length > 0
      ? rawMessages[Math.floor(Math.random() * rawMessages.length)]
      : "";

    const finalMessage = interpolateVariables(rawTemplate, contactItem, customVariables);

    let ticket = await Ticket.findOne({
      where: { contactId: contactItem.id, companyId }
    });

    if (!ticket) {
      ticket = {
        id: 0,
        whatsappId: whatsapp.id,
        companyId,
        contactId: contactItem.id
      } as unknown as Ticket;
    } else {
      ticket.whatsappId = whatsapp.id;
    }

    const channelMgr = ChannelManager.getInstance();

    if (campaign.mediaPath) {
      const fullPath = path.resolve(uploadConfig.directory, campaign.mediaPath);
      if (fs.existsSync(fullPath)) {
        const fileData = fs.readFileSync(fullPath);
        await channelMgr.sendMediaMessage("whatsapp", {
          to: contactItem.number,
          media: {
            filename: campaign.mediaName || "midia",
            mimetype: "application/octet-stream",
            data: fileData
          },
          ticket,
          body: finalMessage
        });
      } else {
        await channelMgr.sendTextMessage("whatsapp", {
          to: contactItem.number,
          body: finalMessage,
          ticket
        });
      }
    } else {
      await channelMgr.sendTextMessage("whatsapp", {
        to: contactItem.number,
        body: finalMessage,
        ticket
      });
    }

    shipping.status = "delivered";
    shipping.deliveredAt = new Date();
    shipping.message = finalMessage;
    shipping.error = null as any;
    await shipping.save();

    await updateCampaignProgressAndNotify(campaign);
    logger.info(`[CampaignWorker] Successfully delivered campaign ${campaignId} to ${contactItem.number}`);
  } catch (err: any) {
    logger.error(`[CampaignWorker] Error delivering campaign ${campaignId} to ${contactItem.number}: ${err.message}`);

    shipping.retries += 1;
    shipping.error = err.message;

    if (job.attemptsMade < (job.opts.attempts || 3)) {
      await shipping.save();
      throw err; // BullMQ fará retry com backoff
    }

    shipping.status = "failed";
    await shipping.save();
    await updateCampaignProgressAndNotify(campaign);
    throw err;
  }
};

export const updateCampaignProgressAndNotify = async (campaign: Campaign): Promise<void> => {
  const campaignId = campaign.id;
  const companyId = campaign.companyId;

  const totalShippings = await CampaignShipping.count({ where: { campaignId } });
  const pendingShippings = await CampaignShipping.count({
    where: { campaignId, status: "pending" }
  });

  if (totalShippings > 0 && pendingShippings === 0 && campaign.status === "EM_ANDAMENTO") {
    campaign.status = "FINALIZADA";
    campaign.completedAt = new Date();
    await campaign.save();
  }

  // Carregar campanha completa com relacionamentos para a notificação
  const updatedCampaign = await Campaign.findByPk(campaignId, {
    include: ["contactList", "whatsapp", "shipping"]
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, {
      action: "update",
      record: updatedCampaign || campaign
    });
  } catch (_) {}
};

let campaignWorker: Worker<CampaignJobData> | null = null;

export const initCampaignWorker = (): Worker<CampaignJobData> => {
  if (!campaignWorker) {
    campaignWorker = new Worker<CampaignJobData>(
      "campaignQueue",
      processCampaignJob,
      {
        connection: getQueueRedisOptions(),
        concurrency: 2 // Cadência controlada
      }
    );

    campaignWorker.on("completed", job => {
      logger.debug(`[CampaignWorker] Job ${job.id} completed.`);
    });

    campaignWorker.on("failed", (job, err) => {
      logger.error(`[CampaignWorker] Job ${job?.id} failed: ${err.message}`);
    });
  }

  return campaignWorker;
};

export const closeCampaignWorker = async (): Promise<void> => {
  if (campaignWorker) {
    await campaignWorker.close();
    campaignWorker = null;
  }
};
