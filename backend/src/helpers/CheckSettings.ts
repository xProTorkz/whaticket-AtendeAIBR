import Setting from "../models/Setting";
import AppError from "../errors/AppError";

const CheckSettings = async (
  key: string,
  companyId: number = 1
): Promise<string> => {
  let setting = await Setting.findOne({
    where: { key, companyId }
  });

  // Fallback para Empresa Padrão (id 1) caso a empresa ainda não tenha a configuração criada
  if (!setting && companyId !== 1) {
    setting = await Setting.findOne({
      where: { key, companyId: 1 }
    });
  }

  if (!setting) {
    throw new AppError("ERR_NO_SETTING_FOUND", 404);
  }

  return setting.value;
};

export default CheckSettings;
