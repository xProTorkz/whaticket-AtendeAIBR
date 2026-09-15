import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  ONBOARDING_STEPS,
  getOrCreateOnboarding,
  updateOnboardingStep,
  completeOnboarding
} from "../services/OnboardingServices/OnboardingService";

export const show = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const onboarding = await getOrCreateOnboarding(companyId);

  return res.status(200).json({
    onboarding,
    steps: ONBOARDING_STEPS
  });
};

export const updateStep = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { step, data, nextStep } = req.body;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  if (!step) {
    throw new AppError("ERR_STEP_REQUIRED", 400);
  }

  const onboarding = await updateOnboardingStep({
    companyId,
    step,
    data,
    nextStep
  });

  return res.status(200).json(onboarding);
};

export const complete = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const onboarding = await completeOnboarding(companyId);

  return res.status(200).json(onboarding);
};
