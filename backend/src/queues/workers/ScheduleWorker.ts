import { Worker, Job } from "bullmq";
import fs from "fs";
import path from "path";
import { getQueueRedisOptions } from "../connection";
import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { ChannelManager } from "../../channels/ChannelManager";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import uploadConfig from "../../config/upload";

export interface ScheduleJobData {
  scheduleId: number;
  companyId: number;
}

export const processScheduleJob = async (job: Job<ScheduleJobData>): Promise<void> => {
  const { scheduleId, companyId } = job.data;

  logger.info(`[ScheduleWorker] Starting processing job ${job.id} for scheduleId: ${scheduleId}`);

  const schedule = await Schedule.findOne({
    where: { id: scheduleId, companyId },
    include: [{ model: Contact, as: "contact" }]
  });

  if (!schedule) {
    logger.warn(`[ScheduleWorker] Schedule ${scheduleId} not found in company ${companyId}`);
    return;
  }

  // Idempotência: se já foi enviado, não duplicar
  if (Boolean(schedule.sentAt) || schedule.status === "ENVIADA") {
    logger.info(`[ScheduleWorker] Schedule ${scheduleId} already sent at ${schedule.sentAt}. Skipping.`);
    return;
  }

  if (schedule.status === "CANCELADA") {
    logger.info(`[ScheduleWorker] Schedule ${scheduleId} is cancelled. Skipping.`);
    return;
  }

  if (!schedule.contact || !schedule.contact.number) {
    logger.error(`[ScheduleWorker] Schedule ${scheduleId} has no valid contact or number.`);
    schedule.status = "ERRO";
    await schedule.save();
    return;
  }

  try {
    const defaultWhatsapp = await GetDefaultWhatsApp(schedule.userId, companyId);
    if (!defaultWhatsapp) {
      throw new Error("ERR_NO_DEF_WAPP_FOUND");
    }

    let ticket = await Ticket.findOne({
      where: { contactId: schedule.contactId, companyId }
    });

    if (!ticket) {
      ticket = {
        id: 0,
        whatsappId: defaultWhatsapp.id,
        companyId,
        contactId: schedule.contactId
      } as unknown as Ticket;
    } else if (!ticket.whatsappId) {
      ticket.whatsappId = defaultWhatsapp.id;
    }

    const channelMgr = ChannelManager.getInstance();

    if (schedule.mediaPath) {
      const fullPath = path.resolve(uploadConfig.directory, schedule.mediaPath);
      if (fs.existsSync(fullPath)) {
        const fileData = fs.readFileSync(fullPath);
        await channelMgr.sendMediaMessage("whatsapp", {
          to: schedule.contact.number,
          media: {
            filename: schedule.mediaName || "attachment",
            mimetype: "application/octet-stream",
            data: fileData
          },
          ticket,
          body: schedule.body
        });
      } else {
        logger.warn(`[ScheduleWorker] Attachment not found at ${fullPath}, falling back to text`);
        await channelMgr.sendTextMessage("whatsapp", {
          to: schedule.contact.number,
          body: schedule.body,
          ticket
        });
      }
    } else {
      await channelMgr.sendTextMessage("whatsapp", {
        to: schedule.contact.number,
        body: schedule.body,
        ticket
      });
    }

    schedule.status = "ENVIADA";
    schedule.sentAt = new Date();
    await schedule.save();

    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company${companyId}-schedule`, {
      action: "update",
      schedule
    });

    import("../../services/WebhookServices/WebhookDispatcher").then(({ dispatchWebhookEvent }) => {
      dispatchWebhookEvent({
        companyId,
        event: "schedule.sent",
        data: {
          id: schedule.id,
          contactId: schedule.contactId,
          number: schedule.contact.number,
          body: schedule.body,
          sentAt: schedule.sentAt
        }
      });
    }).catch(() => {});

    logger.info(`[ScheduleWorker] Schedule ${scheduleId} successfully sent.`);
  } catch (err: any) {
    logger.error(`[ScheduleWorker] Error sending schedule ${scheduleId}: ${err.message}`);

    if (job.attemptsMade < (job.opts.attempts || 3)) {
      throw err; // Permite que o BullMQ faça retry com backoff
    }

    schedule.status = "ERRO";
    await schedule.save();

    import("../../services/WebhookServices/WebhookDispatcher").then(({ dispatchWebhookEvent }) => {
      dispatchWebhookEvent({
        companyId,
        event: "schedule.failed",
        data: {
          id: schedule.id,
          contactId: schedule.contactId,
          error: err.message
        }
      });
    }).catch(() => {});

    try {
      const io = getIO();
      io.to(`company-${companyId}-mainchannel`).emit(`company${companyId}-schedule`, {
        action: "update",
        schedule
      });
    } catch (_) {}

    throw err;
  }
};

let scheduleWorker: Worker<ScheduleJobData> | null = null;

export const initScheduleWorker = (): Worker<ScheduleJobData> => {
  if (!scheduleWorker) {
    scheduleWorker = new Worker<ScheduleJobData>(
      "scheduleQueue",
      processScheduleJob,
      {
        connection: getQueueRedisOptions(),
        concurrency: 5
      }
    );

    scheduleWorker.on("completed", job => {
      logger.debug(`[ScheduleWorker] Job ${job.id} completed.`);
    });

    scheduleWorker.on("failed", (job, err) => {
      logger.error(`[ScheduleWorker] Job ${job?.id} failed with error: ${err.message}`);
    });
  }

  return scheduleWorker;
};

export const closeScheduleWorker = async (): Promise<void> => {
  if (scheduleWorker) {
    await scheduleWorker.close();
    scheduleWorker = null;
  }
};
