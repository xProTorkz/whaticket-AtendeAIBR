import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as SuperAdminController from "../controllers/SuperAdminController";

const superAdminRoutes = Router();

superAdminRoutes.get("/superadmin/companies", isAuth, SuperAdminController.listCompanies);
superAdminRoutes.put("/superadmin/companies/:id/plan", isAuth, SuperAdminController.updateCompanyPlan);
superAdminRoutes.put("/superadmin/companies/:id/limits", isAuth, SuperAdminController.updateCompanyLimits);
superAdminRoutes.put("/superadmin/companies/:id/status", isAuth, SuperAdminController.updateCompanyStatus);
superAdminRoutes.get("/superadmin/audit", isAuth, SuperAdminController.getAudit);

export default superAdminRoutes;
