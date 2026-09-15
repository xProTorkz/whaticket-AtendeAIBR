import { Queue } from "bullmq";
import { getQueueRedisOptions } from "./connection";
import {
  initScheduleWorker,
  closeScheduleWorker,
  ScheduleJobData
} from "./workers/ScheduleWorker";
import {
  initCampaignWorker,
  closeCampaignWorker,
  CampaignJobData
} from "./workers/CampaignWorker";
import {
  initWebhookWorker,
  closeWebhookWorker,
  WebhookJobData
} from "./workers/WebhookWorker";
import Schedule from "../models/Schedule";
import Campaign from "../models/Campaign";
import CampaignShipping from "../models/CampaignShipping";
import CampaignSetting from "../models/CampaignSetting";
import ContactListItem from "../models/ContactListItem";
import { logger } from "../utils/logger";

export const scheduleQueue = new Queue<ScheduleJobData>("scheduleQueue", {
  connection: getQueueRedisOptions()
});

export const campaignQueue = new Queue<CampaignJobData>("campaignQueue", {
  connection: getQueueRedisOptions()
});

export const webhookQueue = new Queue<WebhookJobData>("webhookQueue", {
  connection: getQueueRedisOptions()
});

export const enqueueSchedule = async (schedule: Schedule): Promise<void> => {
  const now = Date.now();
  const sendTime = new Date(schedule.sendAt).getTime();
  const delay = Math.max(0, sendTime - now);

  const jobId = `schedule-${schedule.id}`;

  // Se já existia um job agendado, remove para reagendar
  try {
    const existingJob = await scheduleQueue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
    }
  } catch (_) {}

  await scheduleQueue.add(
    "dispatch-schedule",
    {
      scheduleId: schedule.id,
      companyId: schedule.companyId
    },
    {
      jobId,
      delay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: true
    }
  );

  logger.info(`[Queue] Enqueued schedule ${schedule.id} with delay ${delay}ms`);
};

export const cancelScheduleJob = async (scheduleId: number): Promise<void> => {
  const jobId = `schedule-${scheduleId}`;
  try {
    const job = await scheduleQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`[Queue] Removed job for schedule ${scheduleId}`);
    }
  } catch (err: any) {
    logger.warn(`[Queue] Could not remove job for schedule ${scheduleId}: ${err.message}`);
  }
};

export const enqueueCampaign = async (campaign: Campaign): Promise<void> => {
  if (!campaign.contactListId) {
    throw new Error("Campanha não possui lista de contatos vinculada.");
  }

  const items = await ContactListItem.findAll({
    where: {
      contactListId: campaign.contactListId,
      companyId: campaign.companyId
    }
  });

  if (items.length === 0) {
    throw new Error("A lista de contatos está vazia.");
  }

  // Buscar configurações de cadência
  let messageInterval = 20; // segundos
  let longerIntervalAfter = 20; // disparos
  let greaterInterval = 60; // segundos

  try {
    const intervalSetting = await CampaignSetting.findOne({
      where: { companyId: campaign.companyId, key: "messageInterval" }
    });
    if (intervalSetting && intervalSetting.value) {
      messageInterval = JSON.parse(intervalSetting.value);
    }

    const longerAfterSetting = await CampaignSetting.findOne({
      where: { companyId: campaign.companyId, key: "longerIntervalAfter" }
    });
    if (longerAfterSetting && longerAfterSetting.value) {
      longerIntervalAfter = JSON.parse(longerAfterSetting.value);
    }

    const greaterSetting = await CampaignSetting.findOne({
      where: { companyId: campaign.companyId, key: "greaterInterval" }
    });
    if (greaterSetting && greaterSetting.value) {
      greaterInterval = JSON.parse(greaterSetting.value);
    }
  } catch (_) {}

  const now = Date.now();
  let baseDelay = 0;
  if (campaign.scheduledAt) {
    baseDelay = Math.max(0, new Date(campaign.scheduledAt).getTime() - now);
  }

  let accumulatedCadenceDelay = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const jobId = `campaign-${campaign.id}-item-${item.id}`;

    // Cadência: adiciona delay incremental por item
    if (i > 0) {
      if (longerIntervalAfter > 0 && i % longerIntervalAfter === 0) {
        accumulatedCadenceDelay += greaterInterval * 1000;
      } else {
        accumulatedCadenceDelay += messageInterval * 1000;
      }
    }

    const totalDelay = baseDelay + accumulatedCadenceDelay;

    // Criar ou reusar registro de CampaignShipping
    await CampaignShipping.findOrCreate({
      where: {
        campaignId: campaign.id,
        contactListItemId: item.id,
        companyId: campaign.companyId
      },
      defaults: {
        campaignId: campaign.id,
        contactListItemId: item.id,
        companyId: campaign.companyId,
        jobId,
        number: item.number,
        status: "pending"
      }
    });

    // Enfileira job idempotente
    try {
      const existingJob = await campaignQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
      }
    } catch (_) {}

    await campaignQueue.add(
      "dispatch-campaign-item",
      {
        campaignId: campaign.id,
        contactListItemId: item.id,
        companyId: campaign.companyId
      },
      {
        jobId,
        delay: totalDelay,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000
        },
        removeOnComplete: true
      }
    );
  }

  logger.info(
    `[Queue] Enqueued ${items.length} items for campaign ${campaign.id} with cadence intervals.`
  );
};

export const cancelCampaignJobs = async (
  campaignId: number,
  companyId: number
): Promise<void> => {
  const shippings = await CampaignShipping.findAll({
    where: { campaignId, companyId, status: "pending" }
  });

  for (const shipping of shippings) {
    if (shipping.jobId) {
      try {
        const job = await campaignQueue.getJob(shipping.jobId);
        if (job) {
          await job.remove();
        }
      } catch (_) {}
    }
    shipping.status = "cancelled";
    await shipping.save();
  }

  logger.info(`[Queue] Cancelled all pending jobs for campaign ${campaignId}`);
};

export const initQueuesAndWorkers = (): void => {
  initScheduleWorker();
  initCampaignWorker();
  initWebhookWorker();
  logger.info("[Queues] BullMQ Schedule, Campaign and Webhook workers initialized.");
};

export const closeQueuesAndWorkers = async (): Promise<void> => {
  await closeScheduleWorker();
  await closeCampaignWorker();
  await closeWebhookWorker();
  await scheduleQueue.close();
  await campaignQueue.close();
  await webhookQueue.close();
  logger.info("[Queues] BullMQ Queues and workers closed.");
};
