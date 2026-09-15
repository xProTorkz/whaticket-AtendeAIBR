import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import ShowCompanyService from "./ShowCompanyService";

interface CompanyData {
  name?: string;
  status?: boolean;
  plan?: string;
  planId?: number;
  subscriptionStatus?: string;
  isTrial?: boolean;
  trialEndsAt?: Date | string;
  gracePeriodUntil?: Date | string;
  customLimits?: any;
  customCapabilities?: any;
  brandName?: string;
  brandLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  brandFavicon?: string;
  loginMessage?: string;
}

interface Request {
  companyData: CompanyData;
  companyId: string | number;
}

const UpdateCompanyService = async ({
  companyData,
  companyId
}: Request): Promise<Company> => {
  const company = await ShowCompanyService(companyId);

  const schema = Yup.object().shape({
    name: Yup.string().min(2)
  });

  try {
    await schema.validate(companyData);
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  await company.update(companyData);

  return company;
};

export default UpdateCompanyService;
