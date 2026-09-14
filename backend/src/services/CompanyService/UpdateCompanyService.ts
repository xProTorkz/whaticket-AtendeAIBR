import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import ShowCompanyService from "./ShowCompanyService";

interface CompanyData {
  name?: string;
  status?: boolean;
  plan?: string;
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

  const { name, status, plan } = companyData;

  await company.update({
    name,
    status,
    plan
  });

  return company;
};

export default UpdateCompanyService;
