import AppError from "../../errors/AppError";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";

const ShowContactListService = async (
  id: string | number,
  companyId: number
): Promise<ContactList> => {
  const contactList = await ContactList.findOne({
    where: { id, companyId },
    include: [
      {
        model: ContactListItem,
        as: "contactListItems"
      },
      {
        model: ContactListItem,
        as: "contacts"
      }
    ]
  });

  if (!contactList) {
    throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
  }

  return contactList;
};

export default ShowContactListService;
