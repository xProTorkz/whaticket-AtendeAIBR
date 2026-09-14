import express from "express";
import isAuth from "../middleware/isAuth";
import { isAdmin, isAgentOrAbove } from "../middleware/isRole";
import * as WhatsAppController from "../controllers/WhatsAppController";

const whatsappRoutes = express.Router();

whatsappRoutes.get("/whatsapp/", isAuth, isAgentOrAbove, WhatsAppController.index);
whatsappRoutes.post("/whatsapp/", isAuth, isAdmin, WhatsAppController.store);
whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, isAgentOrAbove, WhatsAppController.show);
whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, isAdmin, WhatsAppController.update);
whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  isAdmin,
  WhatsAppController.remove
);

export default whatsappRoutes;
