import AppError from "../../errors/AppError";
import ContactList from "../../models/ContactList";

interface Request {
  id: string | number;
  name: string;
  companyId: number;
}

const UpdateContactListService = async ({
  id,
  name,
  companyId
}: Request): Promise<ContactList> => {
  const contactList = await ContactList.findOne({
    where: { id, companyId }
  });

  if (!contactList) {
    throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
  }

  await contactList.update({ name });

  return contactList;
};

export default UpdateContactListService;
