import { v4 as uuidv4 } from "uuid";
import Webhook from "../../models/Webhook";
import WebhookDelivery from "../../models/WebhookDelivery";
import { webhookQueue } from "../../queues";
import { logger } from "../../utils/logger";

export interface DomainEventPayload {
  companyId: number;
  event: string;
  data: any;
}

export const dispatchWebhookEvent = async ({
  companyId,
  event,
  data
}: DomainEventPayload): Promise<void> => {
  try {
    const webhooks = await Webhook.findAll({
      where: {
        companyId,
        isActive: true
      }
    });

    if (!webhooks || webhooks.length === 0) {
      return;
    }

    const matchingWebhooks = webhooks.filter((w) => {
      const events = w.events || [];
      if (events.includes("*")) return true;
      if (events.includes(event)) return true;
      const prefix = event.split(".")[0];
      if (events.includes(`${prefix}.*`)) return true;
      return false;
    });

    if (matchingWebhooks.length === 0) {
      return;
    }

    const envelope = {
      id: `evt_${uuidv4().replace(/-/g, "")}`,
      event,
      timestamp: Math.floor(Date.now() / 1000),
      companyId,
      data
    };

    for (const webhook of matchingWebhooks) {
      const delivery = await WebhookDelivery.create({
        webhookId: webhook.id,
        event,
        payload: JSON.stringify(envelope),
        status: "PENDING",
        attempts: 0,
        companyId
      });

      const jobId = `webhook-delivery-${delivery.id}`;

      await webhookQueue.add(
        "dispatch-webhook",
        {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          companyId,
          url: webhook.url,
          secret: webhook.secret,
          event,
          payload: envelope
        },
        {
          jobId,
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 2000
          },
          removeOnComplete: true
        }
      );

      logger.info(
        `[WebhookDispatcher] Enqueued delivery ${delivery.id} for event ${event} to webhook ${webhook.id}`
      );
    }
  } catch (err: any) {
    logger.error(
      `[WebhookDispatcher] Error dispatching event ${event} for company ${companyId}: ${err.message}`
    );
  }
};
