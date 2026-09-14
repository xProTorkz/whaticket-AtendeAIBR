import Setting from "../models/Setting";
import AppError from "../errors/AppError";

export const ALLOWED_GLOBAL_FALLBACK_KEYS = ["userCreation", "CheckMsgIsGroup"];

const CheckSettings = async (
  key: string,
  companyId: number = 1
): Promise<string> => {
  let setting = await Setting.findOne({
    where: { key, companyId }
  });

  // Fallback para Empresa Padrão (id 1) estritamente restrito a configurações globais não-sensíveis
  if (
    !setting &&
    companyId !== 1 &&
    ALLOWED_GLOBAL_FALLBACK_KEYS.includes(key)
  ) {
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
