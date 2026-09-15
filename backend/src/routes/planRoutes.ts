import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as PlanController from "../controllers/PlanController";

const planRoutes = Router();

// Public / Authenticated list of plans
planRoutes.get("/plans", isAuth, PlanController.index);
planRoutes.get("/plans/all", isAuth, PlanController.index);
planRoutes.get("/plans/list", PlanController.index); // Open list for signup/landing
planRoutes.get("/plans/:id", isAuth, PlanController.show);

// SuperAdmin operations
planRoutes.post("/plans", isAuth, PlanController.store);
planRoutes.put("/plans/:id", isAuth, PlanController.update);
planRoutes.delete("/plans/:id", isAuth, PlanController.remove);

export default planRoutes;
