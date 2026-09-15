import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import isRole from "../middleware/isRole";
import uploadConfig from "../config/upload";
import * as CampaignController from "../controllers/CampaignController";

const campaignRoutes = Router();
const upload = multer(uploadConfig);

campaignRoutes.get(
  "/campaigns",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  CampaignController.index
);

campaignRoutes.post(
  "/campaigns",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  CampaignController.store
);

campaignRoutes.get(
  "/campaigns/:id",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  CampaignController.show
);

campaignRoutes.put(
  "/campaigns/:id",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  CampaignController.update
);

campaignRoutes.delete(
  "/campaigns/:id",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  CampaignController.remove
);

campaignRoutes.post(
  "/campaigns/:id/start",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  CampaignController.start
);

campaignRoutes.post(
  "/campaigns/:id/pause",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  CampaignController.pause
);

campaignRoutes.post(
  "/campaigns/:id/cancel",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  CampaignController.cancel
);

campaignRoutes.post(
  "/campaigns/:id/restart",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  CampaignController.restart
);

campaignRoutes.post(
  "/campaigns/:id/media-upload",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  upload.single("file"),
  CampaignController.mediaUpload
);

campaignRoutes.delete(
  "/campaigns/:id/media-upload",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  CampaignController.deleteMedia
);

export default campaignRoutes;
