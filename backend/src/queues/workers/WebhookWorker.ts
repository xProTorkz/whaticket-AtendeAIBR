import { Worker, Job } from "bullmq";
import crypto from "crypto";
import { getQueueRedisOptions } from "../connection";
import WebhookDelivery from "../../models/WebhookDelivery";
import Webhook from "../../models/Webhook";
import { logger } from "../../utils/logger";

export interface WebhookJobData {
  deliveryId: number;
  webhookId: number;
  companyId: number;
  url: string;
  secret: string;
  event: string;
  payload: any;
}

let webhookWorker: Worker<WebhookJobData> | null = null;

export const processWebhookJob = async (job: Job<WebhookJobData>): Promise<void> => {
  const { deliveryId, webhookId, companyId, url, secret, event, payload } = job.data;

  logger.info(
    `[WebhookWorker] Processing webhook delivery ${deliveryId} for event ${event} to ${url}`
  );

  const delivery = await WebhookDelivery.findOne({
    where: { id: deliveryId, companyId }
  });

  if (!delivery) {
    logger.warn(`[WebhookWorker] Delivery ${deliveryId} not found. Skipping.`);
    return;
  }

  // Idempotency check: if already succeeded, do not dispatch again
  if (delivery.status === "SUCCESS") {
    logger.info(`[WebhookWorker] Delivery ${deliveryId} already succeeded. Skipping.`);
    return;
  }

  delivery.attempts += 1;

  const serializedPayload =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  const timestamp = Math.floor(Date.now() / 1000);
  const signature =
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${serializedPayload}`)
      .digest("hex");

  try {
    const hasAbort = typeof AbortController !== "undefined";
    const controller = hasAbort ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null;

    let response: any;
    let responseText = "";

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": String(timestamp),
          "X-Webhook-Event": event,
          "X-Webhook-Id": String(delivery.id),
          "User-Agent": "AtendeAIBR-Webhook/1.0"
        },
        body: serializedPayload,
        signal: controller ? controller.signal : undefined
      });
      responseText = await response.text();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    delivery.lastResponseStatus = response.status;
    delivery.lastResponseBody = (responseText || "").slice(0, 2000);

    if (response.ok) {
      delivery.status = "SUCCESS";
      delivery.deliveredAt = new Date();
      delivery.lastError = null;
      delivery.nextRetryAt = null;
      await delivery.save();
      logger.info(`[WebhookWorker] Delivery ${deliveryId} succeeded (HTTP ${response.status})`);
      return;
    }

    // 4xx client errors are unrecoverable -> Dead-letter immediately
    if (response.status >= 400 && response.status < 500) {
      delivery.status = "FAILED";
      delivery.lastError = `Permanent client error HTTP ${response.status}`;
      delivery.nextRetryAt = null;
      await delivery.save();
      logger.warn(
        `[WebhookWorker] Delivery ${deliveryId} failed permanently with HTTP ${response.status}. Sent to Dead-Letter.`
      );
      return;
    }

    // 5xx server error -> retry if attempts < 5
    throw new Error(`Server returned HTTP ${response.status}`);
  } catch (err: any) {
    const isAbort = err.name === "AbortError";
    const errorMessage = isAbort ? "Request timed out after 10000ms" : err.message;

    delivery.lastError = errorMessage;

    if (delivery.attempts >= 5) {
      // Exceeded max retries -> Move to Dead-Letter
      delivery.status = "FAILED";
      delivery.lastError = `Max retries (5) exceeded. ${errorMessage}`;
      delivery.nextRetryAt = null;
      await delivery.save();
      logger.error(
        `[WebhookWorker] Delivery ${deliveryId} reached max attempts (5). Marked as FAILED (Dead-Letter).`
      );
      return;
    }

    // Calculate next backoff timestamp (2s, 4s, 8s, 16s...)
    const backoffMs = Math.pow(2, delivery.attempts) * 2000;
    delivery.nextRetryAt = new Date(Date.now() + backoffMs);
    delivery.status = "PENDING";
    await delivery.save();

    logger.warn(
      `[WebhookWorker] Delivery ${deliveryId} failed (attempt ${delivery.attempts}/5): ${errorMessage}. Retrying with backoff.`
    );
    throw err;
  }
};

export const initWebhookWorker = (): Worker<WebhookJobData> => {
  if (!webhookWorker) {
    webhookWorker = new Worker<WebhookJobData>("webhookQueue", processWebhookJob, {
      connection: getQueueRedisOptions(),
      concurrency: 5
    });

    webhookWorker.on("completed", (job) => {
      logger.info(`[WebhookWorker] Job ${job.id} completed successfully.`);
    });

    webhookWorker.on("failed", (job, err) => {
      logger.warn(`[WebhookWorker] Job ${job?.id} failed: ${err.message}`);
    });
  }
  return webhookWorker;
};

export const closeWebhookWorker = async (): Promise<void> => {
  if (webhookWorker) {
    await webhookWorker.close();
    webhookWorker = null;
  }
};
