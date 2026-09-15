import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isRole from "../middleware/isRole";
import * as CampaignSettingController from "../controllers/CampaignSettingController";

const campaignSettingRoutes = Router();

campaignSettingRoutes.get(
  "/campaign-settings",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  CampaignSettingController.index
);

campaignSettingRoutes.post(
  "/campaign-settings",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  CampaignSettingController.store
);

export default campaignSettingRoutes;
