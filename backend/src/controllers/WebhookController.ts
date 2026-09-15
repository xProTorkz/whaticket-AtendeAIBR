import { Request, Response } from "express";
import crypto from "crypto";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import Webhook from "../models/Webhook";
import WebhookDelivery from "../models/WebhookDelivery";
import { webhookQueue } from "../queues";
import { dispatchWebhookEvent } from "../services/WebhookServices/WebhookDispatcher";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  const webhooks = await Webhook.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]],
    attributes: ["id", "name", "url", "events", "isActive", "createdAt", "updatedAt"]
  });

  return res.json({ webhooks });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  const schema = Yup.object().shape({
    name: Yup.string().required("ERR_NAME_REQUIRED"),
    url: Yup.string().url("ERR_INVALID_URL").required("ERR_URL_REQUIRED"),
    events: Yup.array().of(Yup.string()).min(1, "ERR_EVENTS_REQUIRED")
  });

  try {
    await schema.validate(req.body);
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const { name, url, events } = req.body;

  // Generate signing secret: whsec_<random_hex>
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const webhook = await Webhook.create({
    name,
    url,
    secret,
    events,
    isActive: true,
    companyId
  });

  // Return secret ONLY ONCE
  return res.status(201).json({
    webhook: {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt
    },
    secret
  });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const webhook = await Webhook.findOne({
    where: { id, companyId }
  });

  if (!webhook) {
    throw new AppError("ERR_NO_WEBHOOK_FOUND", 404);
  }

  const { name, url, events, isActive } = req.body;

  if (name !== undefined) webhook.name = name;
  if (url !== undefined) webhook.url = url;
  if (events !== undefined) webhook.events = events;
  if (isActive !== undefined) webhook.isActive = isActive;

  await webhook.save();

  return res.json({
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    events: webhook.events,
    isActive: webhook.isActive,
    updatedAt: webhook.updatedAt
  });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const webhook = await Webhook.findOne({
    where: { id, companyId }
  });

  if (!webhook) {
    throw new AppError("ERR_NO_WEBHOOK_FOUND", 404);
  }

  await webhook.destroy();

  return res.status(200).json({ message: "Webhook deleted" });
};

export const deliveries = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { webhookId, status, pageNumber = "1", limit = "20" } = req.query as any;

  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const page = Math.max(1, parseInt(pageNumber, 10) || 1);
  const offset = (page - 1) * take;

  const whereCondition: any = { companyId };
  if (webhookId) whereCondition.webhookId = webhookId;
  if (status) whereCondition.status = status;

  const { count, rows: deliveriesList } = await WebhookDelivery.findAndCountAll({
    where: whereCondition,
    limit: take,
    offset,
    order: [["createdAt", "DESC"]]
  });

  return res.json({
    deliveries: deliveriesList,
    count,
    page,
    limit: take,
    hasMore: count > offset + deliveriesList.length
  });
};

export const retryDelivery = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const delivery = await WebhookDelivery.findOne({
    where: { id, companyId },
    include: [{ model: Webhook, as: "webhook" }]
  });

  if (!delivery || !delivery.webhook) {
    throw new AppError("ERR_NO_DELIVERY_FOUND", 404);
  }

  delivery.status = "PENDING";
  delivery.attempts = 0;
  delivery.lastError = null;
  await delivery.save();

  await webhookQueue.add(
    "dispatch-webhook",
    {
      deliveryId: delivery.id,
      webhookId: delivery.webhookId,
      companyId,
      url: delivery.webhook.url,
      secret: delivery.webhook.secret,
      event: delivery.event,
      payload: JSON.parse(delivery.payload)
    },
    {
      jobId: `webhook-delivery-${delivery.id}-${Date.now()}`,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000
      },
      removeOnComplete: true
    }
  );

  return res.json({
    message: "Delivery re-enqueued",
    delivery
  });
};

export const ping = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const webhook = await Webhook.findOne({
    where: { id, companyId }
  });

  if (!webhook) {
    throw new AppError("ERR_NO_WEBHOOK_FOUND", 404);
  }

  await dispatchWebhookEvent({
    companyId,
    event: "webhook.ping",
    data: {
      message: "Webhook de teste disparado com sucesso!",
      pingAt: new Date().toISOString()
    }
  });

  return res.json({ message: "Ping event dispatched" });
};
