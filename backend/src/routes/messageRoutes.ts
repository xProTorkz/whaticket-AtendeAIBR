import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import isRole from "../middleware/isRole";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);

messageRoutes.get(
  "/messages/:ticketId",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  MessageController.index
);

messageRoutes.post(
  "/messages/:ticketId",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  upload.array("medias"),
  MessageController.store
);

messageRoutes.delete(
  "/messages/:messageId",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  MessageController.remove
);

export default messageRoutes;
