import { Router } from "express";
import * as HealthController from "../controllers/HealthController";

const healthRoutes = Router();

healthRoutes.get("/health", HealthController.health);
healthRoutes.get("/ready", HealthController.ready);

export default healthRoutes;
