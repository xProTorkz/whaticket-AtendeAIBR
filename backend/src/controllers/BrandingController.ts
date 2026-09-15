import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import { getTenantEntitlements } from "../services/PlanServices/EntitlementService";

export const showCurrent = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const entitlements = await getTenantEntitlements(companyId);

  return res.status(200).json(entitlements.branding);
};

export const showPublic = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;
  const targetId = companyId ? Number(companyId) : 1;

  const company = await Company.findByPk(targetId);

  if (!company) {
    return res.status(200).json({
      brandName: "AtendeAI BR",
      brandLogo: null,
      primaryColor: "#006b52",
      secondaryColor: "#004d40",
      brandFavicon: null,
      loginMessage: "Bem-vindo ao AtendeAI BR"
    });
  }

  return res.status(200).json({
    brandName: company.brandName || company.name || "AtendeAI BR",
    brandLogo: company.brandLogo || null,
    primaryColor: company.primaryColor || "#006b52",
    secondaryColor: company.secondaryColor || "#004d40",
    brandFavicon: company.brandFavicon || null,
    loginMessage: company.loginMessage || `Bem-vindo ao ${company.brandName || company.name || "AtendeAI BR"}`
  });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  if (req.user.profile !== "admin" && !req.user.isSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { brandName, brandLogo, primaryColor, secondaryColor, brandFavicon, loginMessage } = req.body;

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  await company.update({
    brandName: brandName !== undefined ? brandName : company.brandName,
    brandLogo: brandLogo !== undefined ? brandLogo : company.brandLogo,
    primaryColor: primaryColor !== undefined ? primaryColor : company.primaryColor,
    secondaryColor: secondaryColor !== undefined ? secondaryColor : company.secondaryColor,
    brandFavicon: brandFavicon !== undefined ? brandFavicon : company.brandFavicon,
    loginMessage: loginMessage !== undefined ? loginMessage : company.loginMessage
  });

  return res.status(200).json({
    brandName: company.brandName,
    brandLogo: company.brandLogo,
    primaryColor: company.primaryColor,
    secondaryColor: company.secondaryColor,
    brandFavicon: company.brandFavicon,
    loginMessage: company.loginMessage
  });
};
