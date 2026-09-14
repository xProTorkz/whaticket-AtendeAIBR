import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as CompanyController from "../controllers/CompanyController";

const companyRoutes = Router();

companyRoutes.get("/companies", isAuth, CompanyController.index);
companyRoutes.get("/companies/:id", isAuth, CompanyController.show);
companyRoutes.post("/companies", isAuth, CompanyController.store);
companyRoutes.put("/companies/:id", isAuth, CompanyController.update);
companyRoutes.delete("/companies/:id", isAuth, CompanyController.remove);

export default companyRoutes;
