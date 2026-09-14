import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { isAdmin } from "../middleware/isRole";
import WhatsAppSessionController from "../controllers/WhatsAppSessionController";

const whatsappSessionRoutes = Router();

whatsappSessionRoutes.post(
  "/whatsappsession/:whatsappId",
  isAuth,
  isAdmin,
  WhatsAppSessionController.store
);

whatsappSessionRoutes.put(
  "/whatsappsession/:whatsappId",
  isAuth,
  isAdmin,
  WhatsAppSessionController.update
);

whatsappSessionRoutes.delete(
  "/whatsappsession/:whatsappId",
  isAuth,
  isAdmin,
  WhatsAppSessionController.remove
);

export default whatsappSessionRoutes;
