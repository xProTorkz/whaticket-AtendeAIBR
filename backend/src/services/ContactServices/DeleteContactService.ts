import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";

const DeleteContactService = async (
  id: string,
  companyId?: number
): Promise<void> => {
  const where: any = { id };
  if (companyId) where.companyId = companyId;

  const contact = await Contact.findOne({ where });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  await contact.destroy();
};

export default DeleteContactService;
