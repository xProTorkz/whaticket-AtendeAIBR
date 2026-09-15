import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as BrandingController from "../controllers/BrandingController";

const brandingRoutes = Router();

brandingRoutes.get("/branding/public/:companyId?", BrandingController.showPublic);
brandingRoutes.get("/branding/current", isAuth, BrandingController.showCurrent);
brandingRoutes.put("/branding", isAuth, BrandingController.update);

export default brandingRoutes;
