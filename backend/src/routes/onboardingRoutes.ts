import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as OnboardingController from "../controllers/OnboardingController";

const onboardingRoutes = Router();

onboardingRoutes.get("/onboarding", isAuth, OnboardingController.show);
onboardingRoutes.post("/onboarding/step", isAuth, OnboardingController.updateStep);
onboardingRoutes.post("/onboarding/complete", isAuth, OnboardingController.complete);

export default onboardingRoutes;
