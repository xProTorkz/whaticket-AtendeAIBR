import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { isAgentOrAbove, isManagerOrAdmin } from "../middleware/isRole";
import * as QueueController from "../controllers/QueueController";

const queueRoutes = Router();

queueRoutes.get("/queue", isAuth, isAgentOrAbove, QueueController.index);
queueRoutes.post("/queue", isAuth, isManagerOrAdmin, QueueController.store);
queueRoutes.get("/queue/:queueId", isAuth, isAgentOrAbove, QueueController.show);
queueRoutes.put("/queue/:queueId", isAuth, isManagerOrAdmin, QueueController.update);
queueRoutes.delete("/queue/:queueId", isAuth, isManagerOrAdmin, QueueController.remove);

export default queueRoutes;
