import AppError from "../../errors/AppError";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";

const DeleteContactListService = async (
  id: string | number,
  companyId: number
): Promise<void> => {
  const contactList = await ContactList.findOne({
    where: { id, companyId }
  });

  if (!contactList) {
    throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
  }

  await ContactListItem.destroy({
    where: { contactListId: id, companyId }
  });

  await contactList.destroy();
};

export default DeleteContactListService;
