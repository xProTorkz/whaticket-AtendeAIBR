import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { isAdmin, isAgentOrAbove } from "../middleware/isRole";
import * as SettingController from "../controllers/SettingController";

const settingRoutes = Router();

settingRoutes.get("/settings", isAuth, isAgentOrAbove, SettingController.index);
settingRoutes.put("/settings/:settingKey", isAuth, isAdmin, SettingController.update);

export default settingRoutes;
