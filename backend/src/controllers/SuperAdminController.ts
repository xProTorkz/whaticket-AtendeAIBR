import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import Plan from "../models/Plan";
import AuditLog from "../models/AuditLog";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";
import { getTenantEntitlements } from "../services/PlanServices/EntitlementService";

export const listCompanies = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const companies = await Company.findAll({
    include: [{ model: Plan, as: "planObj" }],
    order: [["id", "ASC"]]
  });

  const companiesWithEntitlements = await Promise.all(
    companies.map(async company => {
      try {
        const entitlements = await getTenantEntitlements(company.id);
        return {
          id: company.id,
          name: company.name,
          status: company.status,
          subscriptionStatus: entitlements.subscription.status,
          isTrial: entitlements.subscription.isTrial,
          trialEndsAt: entitlements.subscription.trialEndsAt,
          daysRemainingTrial: entitlements.subscription.daysRemainingTrial,
          plan: entitlements.plan,
          limits: entitlements.limits,
          usage: entitlements.usage,
          percentages: entitlements.percentages,
          nearLimit: entitlements.nearLimit,
          overLimit: entitlements.overLimit,
          customLimits: company.customLimits,
          customCapabilities: company.customCapabilities,
          createdAt: company.createdAt
        };
      } catch (e) {
        return {
          id: company.id,
          name: company.name,
          status: company.status,
          subscriptionStatus: company.subscriptionStatus,
          createdAt: company.createdAt
        };
      }
    })
  );

  return res.status(200).json(companiesWithEntitlements);
};

export const updateCompanyPlan = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id } = req.params;
  const { planId } = req.body;

  if (!planId) {
    throw new AppError("ERR_PLAN_ID_REQUIRED", 400);
  }

  const company = await Company.findByPk(id);
  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  const previousPlanId = company.planId;
  await company.update({
    planId: plan.id,
    plan: plan.name
  });

  CreateAuditLogService({
    companyId: company.id,
    userId: Number(req.user.id),
    action: "COMPANY_PLAN_CHANGED",
    entity: "Company",
    entityId: company.id,
    details: { previousPlanId, newPlanId: plan.id, planName: plan.name }
  });

  const updatedEntitlements = await getTenantEntitlements(company.id);
  return res.status(200).json(updatedEntitlements);
};

export const updateCompanyLimits = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id } = req.params;
  const { customLimits, customCapabilities } = req.body;

  const company = await Company.findByPk(id);
  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  await company.update({
    customLimits: customLimits !== undefined ? customLimits : company.customLimits,
    customCapabilities: customCapabilities !== undefined ? customCapabilities : company.customCapabilities
  });

  CreateAuditLogService({
    companyId: company.id,
    userId: Number(req.user.id),
    action: "COMPANY_LIMITS_OVERRIDE",
    entity: "Company",
    entityId: company.id,
    details: { customLimits, customCapabilities }
  });

  const updatedEntitlements = await getTenantEntitlements(company.id);
  return res.status(200).json(updatedEntitlements);
};

export const updateCompanyStatus = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id } = req.params;
  const { status, subscriptionStatus, isTrial, trialEndsAt, gracePeriodUntil } = req.body;

  const company = await Company.findByPk(id);
  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  await company.update({
    status: status !== undefined ? status : company.status,
    subscriptionStatus: subscriptionStatus !== undefined ? subscriptionStatus : company.subscriptionStatus,
    isTrial: isTrial !== undefined ? isTrial : company.isTrial,
    trialEndsAt: trialEndsAt !== undefined ? trialEndsAt : company.trialEndsAt,
    gracePeriodUntil: gracePeriodUntil !== undefined ? gracePeriodUntil : company.gracePeriodUntil
  });

  CreateAuditLogService({
    companyId: company.id,
    userId: Number(req.user.id),
    action: "COMPANY_STATUS_CHANGED",
    entity: "Company",
    entityId: company.id,
    details: { status, subscriptionStatus, isTrial, trialEndsAt, gracePeriodUntil }
  });

  const updatedEntitlements = await getTenantEntitlements(company.id);
  return res.status(200).json(updatedEntitlements);
};

export const getAudit = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { limit = 50 } = req.query;

  const logs = await AuditLog.findAll({
    where: {
      action: [
        "COMPANY_CREATE",
        "COMPANY_UPDATE",
        "COMPANY_DELETE",
        "COMPANY_PLAN_CHANGED",
        "COMPANY_LIMITS_OVERRIDE",
        "COMPANY_STATUS_CHANGED"
      ]
    },
    order: [["createdAt", "DESC"]],
    limit: Number(limit)
  });

  return res.status(200).json(logs);
};
