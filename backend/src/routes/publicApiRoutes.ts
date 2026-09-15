import express from "express";
import multer from "multer";
import uploadConfig from "../config/upload";

import isAuthPublicApi from "../middleware/isAuthPublicApi";
import checkApiScope from "../middleware/checkApiScope";
import apiIdempotency from "../middleware/apiIdempotency";
import publicApiRateLimiter from "../middleware/publicApiRateLimiter";

import * as PublicMessageController from "../controllers/PublicApi/PublicMessageController";
import * as PublicContactController from "../controllers/PublicApi/PublicContactController";
import * as PublicTicketController from "../controllers/PublicApi/PublicTicketController";
import * as PublicCrmController from "../controllers/PublicApi/PublicCrmController";
import * as PublicInboundWebhookController from "../controllers/PublicApi/PublicInboundWebhookController";

const upload = multer(uploadConfig);
const publicApiRoutes = express.Router();

// Apply global rate limiting, authentication, and idempotency to all /api/v1 routes
publicApiRoutes.use(publicApiRateLimiter());
publicApiRoutes.use(isAuthPublicApi);
publicApiRoutes.use(apiIdempotency);

// Messages
publicApiRoutes.post(
  "/messages/send",
  checkApiScope("messages:send"),
  upload.array("medias"),
  PublicMessageController.sendMessage
);

// Contacts
publicApiRoutes.get(
  "/contacts",
  checkApiScope("contacts:read"),
  PublicContactController.index
);
publicApiRoutes.get(
  "/contacts/:id",
  checkApiScope("contacts:read"),
  PublicContactController.show
);
publicApiRoutes.post(
  "/contacts",
  checkApiScope("contacts:write"),
  PublicContactController.store
);

// Tickets
publicApiRoutes.get(
  "/tickets",
  checkApiScope("tickets:read"),
  PublicTicketController.index
);
publicApiRoutes.get(
  "/tickets/:id",
  checkApiScope("tickets:read"),
  PublicTicketController.show
);
publicApiRoutes.post(
  "/tickets",
  checkApiScope("tickets:write"),
  PublicTicketController.store
);
publicApiRoutes.post(
  "/tickets/:id/close",
  checkApiScope("tickets:write"),
  PublicTicketController.close
);

// CRM Deals
publicApiRoutes.get(
  "/crm/deals",
  checkApiScope("crm:read"),
  PublicCrmController.index
);
publicApiRoutes.post(
  "/crm/deals",
  checkApiScope("crm:write"),
  PublicCrmController.store
);
publicApiRoutes.patch(
  "/crm/deals/:id",
  checkApiScope("crm:write"),
  PublicCrmController.update
);

// Inbound Webhooks
publicApiRoutes.post(
  "/webhooks/inbound/:source",
  checkApiScope("webhooks:write"),
  PublicInboundWebhookController.handle
);

export default publicApiRoutes;
