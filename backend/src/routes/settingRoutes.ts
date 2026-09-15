import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { isAdmin, isAgentOrAbove } from "../middleware/isRole";
import * as SettingController from "../controllers/SettingController";

const settingRoutes = Router();

settingRoutes.get("/public-settings/:settingKey", SettingController.publicShow);
settingRoutes.get("/settings", isAuth, isAgentOrAbove, SettingController.index);
settingRoutes.get("/settings/:settingKey", isAuth, SettingController.show);
settingRoutes.put("/settings/:settingKey", isAuth, isAdmin, SettingController.update);

export default settingRoutes;
