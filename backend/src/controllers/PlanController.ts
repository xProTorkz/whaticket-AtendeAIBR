import { Request, Response } from "express";
import Plan from "../models/Plan";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const isSuperAdmin = Boolean(req.user?.isSuperAdmin);

  const plans = await Plan.findAll({
    where: isSuperAdmin ? undefined : { isPublic: true },
    order: [["price", "ASC"]]
  });

  return res.status(200).json(plans);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const plan = await Plan.findByPk(id);

  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  return res.status(200).json(plan);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const {
    name,
    description,
    maxUsers,
    maxConnections,
    maxContacts,
    maxCampaigns,
    maxContactLists,
    maxSchedules,
    maxApiKeys,
    maxWebhooks,
    maxStorageMb,
    maxAiTokens,
    capabilities,
    price,
    billingCycle,
    isPublic
  } = req.body;

  if (!name) {
    throw new AppError("ERR_PLAN_NAME_REQUIRED", 400);
  }

  const plan = await Plan.create({
    name,
    description,
    maxUsers: maxUsers ?? 3,
    maxConnections: maxConnections ?? 1,
    maxContacts: maxContacts ?? 1000,
    maxCampaigns: maxCampaigns ?? 2,
    maxContactLists: maxContactLists ?? 5,
    maxSchedules: maxSchedules ?? 50,
    maxApiKeys: maxApiKeys ?? 1,
    maxWebhooks: maxWebhooks ?? 2,
    maxStorageMb: maxStorageMb ?? 1024,
    maxAiTokens: maxAiTokens ?? 0,
    capabilities: capabilities || {},
    price: price ?? 0,
    billingCycle: billingCycle || "monthly",
    isPublic: isPublic !== undefined ? isPublic : true
  });

  return res.status(201).json(plan);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id } = req.params;
  const plan = await Plan.findByPk(id);

  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  await plan.update(req.body);

  return res.status(200).json(plan);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id } = req.params;
  const plan = await Plan.findByPk(id);

  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  await plan.destroy();

  return res.status(200).json({ message: "Plan deleted successfully" });
};
