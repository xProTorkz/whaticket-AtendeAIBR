import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isRole from "../middleware/isRole";
import * as WebhookController from "../controllers/WebhookController";

const webhookRoutes = Router();

webhookRoutes.get(
  "/webhooks",
  isAuth,
  isRole(["manager", "admin"]),
  WebhookController.index
);

webhookRoutes.post(
  "/webhooks",
  isAuth,
  isRole(["manager", "admin"]),
  WebhookController.store
);

webhookRoutes.put(
  "/webhooks/:id",
  isAuth,
  isRole(["manager", "admin"]),
  WebhookController.update
);

webhookRoutes.delete(
  "/webhooks/:id",
  isAuth,
  isRole(["manager", "admin"]),
  WebhookController.remove
);

webhookRoutes.get(
  "/webhooks/deliveries",
  isAuth,
  isRole(["manager", "admin"]),
  WebhookController.deliveries
);

webhookRoutes.post(
  "/webhooks/deliveries/:id/retry",
  isAuth,
  isRole(["manager", "admin"]),
  WebhookController.retryDelivery
);

webhookRoutes.post(
  "/webhooks/:id/ping",
  isAuth,
  isRole(["manager", "admin"]),
  WebhookController.ping
);

export default webhookRoutes;
