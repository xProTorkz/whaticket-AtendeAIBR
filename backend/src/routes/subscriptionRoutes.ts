import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as SubscriptionController from "../controllers/SubscriptionController";

const subscriptionRoutes = Router();

subscriptionRoutes.get("/subscription/my-plan", isAuth, SubscriptionController.myPlan);
subscriptionRoutes.put("/subscription/my-plan", isAuth, SubscriptionController.updateMyPlan);

export default subscriptionRoutes;
