import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";

const ShowWhatsAppService = async (
  id: string | number,
  companyId?: number
): Promise<Whatsapp> => {
  const where: any = { id };
  if (companyId) {
    where.companyId = companyId;
  }

  const whatsapp = await Whatsapp.findOne({
    where,
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage"]
      }
    ],
    order: [["queues", "name", "ASC"]]
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  return whatsapp;
};

export default ShowWhatsAppService;
