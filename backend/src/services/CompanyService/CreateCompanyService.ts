import * as Yup from "yup";
import { v4 as uuidv4 } from "uuid";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Setting from "../../models/Setting";

interface CompanyData {
  name: string;
  plan?: string;
  status?: boolean;
}

const CreateCompanyService = async (
  companyData: CompanyData
): Promise<Company> => {
  const schema = Yup.object().shape({
    name: Yup.string().required("Nome da empresa é obrigatório").min(2)
  });

  try {
    await schema.validate(companyData);
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const company = await Company.create({
    name: companyData.name,
    plan: companyData.plan || "default",
    status: companyData.status !== undefined ? companyData.status : true
  });

  // Inicializa configurações padrão isoladas para o novo tenant
  await Setting.create({
    companyId: company.id,
    key: "userCreation",
    value: "enabled"
  });

  await Setting.create({
    companyId: company.id,
    key: "userApiToken",
    value: uuidv4()
  });

  return company;
};

export default CreateCompanyService;
