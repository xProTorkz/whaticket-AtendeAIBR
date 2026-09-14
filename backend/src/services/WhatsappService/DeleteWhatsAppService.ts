import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

const DeleteWhatsAppService = async (
  id: string,
  companyId?: number
): Promise<void> => {
  const where: any = { id };
  if (companyId) where.companyId = companyId;

  const whatsapp = await Whatsapp.findOne({ where });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  await whatsapp.destroy();
};

export default DeleteWhatsAppService;
