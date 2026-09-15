import * as Yup from "yup";
import AppError from "../../errors/AppError";
import ContactList from "../../models/ContactList";

interface Request {
  name: string;
  companyId: number;
}

const CreateContactListService = async ({
  name,
  companyId
}: Request): Promise<ContactList> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2)
  });

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const contactList = await ContactList.create({
    name,
    companyId
  });

  return contactList;
};

export default CreateContactListService;
