import { Request, Response } from "express";
import AppError from "../errors/AppError";
import ListCompaniesService from "../services/CompanyService/ListCompaniesService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import CreateCompanyService from "../services/CompanyService/CreateCompanyService";
import UpdateCompanyService from "../services/CompanyService/UpdateCompanyService";
import DeleteCompanyService from "../services/CompanyService/DeleteCompanyService";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const companies = await ListCompaniesService();
  return res.status(200).json(companies);
};

export const listPlan = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const companyId = Number(id);

  if (!req.user?.isSuperAdmin && req.user?.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return res.status(200).json({
    plan: {
      useCampaigns: true,
      useKanban: true,
      useOpenAi: false,
      useIntegrations: false,
      useSchedules: true,
      useInternalChat: true,
      useExternalApi: true
    }
  });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const companyId = Number(id);

  if (!req.user?.isSuperAdmin && req.user?.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const company = await ShowCompanyService(companyId);
  return res.status(200).json(company);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { name, plan, status } = req.body;
  const company = await CreateCompanyService({ name, plan, status });

  CreateAuditLogService({
    companyId: company.id,
    userId: Number(req.user.id),
    action: "COMPANY_CREATE",
    entity: "Company",
    entityId: company.id,
    details: { name, plan }
  });

  return res.status(201).json(company);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const companyId = Number(id);

  if (!req.user?.isSuperAdmin && (req.user?.companyId !== companyId || req.user?.profile !== "admin")) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { name, plan, status } = req.body;
  const company = await UpdateCompanyService({
    companyData: { name, plan, status },
    companyId
  });

  CreateAuditLogService({
    companyId,
    userId: Number(req.user.id),
    action: "COMPANY_UPDATE",
    entity: "Company",
    entityId: companyId,
    details: { name, plan, status }
  });

  return res.status(200).json(company);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (!req.user?.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id } = req.params;
  const { confirmCompanyName } = req.body;

  await DeleteCompanyService({
    companyId: id,
    confirmCompanyName,
    actorUserId: Number(req.user.id)
  });

  return res.status(200).json({ message: "Company deleted successfully" });
};
