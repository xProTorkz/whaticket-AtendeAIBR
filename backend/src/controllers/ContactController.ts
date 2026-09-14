import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListContactsService from "../services/ContactServices/ListContactsService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import ShowContactService from "../services/ContactServices/ShowContactService";
import UpdateContactService from "../services/ContactServices/UpdateContactService";
import DeleteContactService from "../services/ContactServices/DeleteContactService";

import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import AppError from "../errors/AppError";
import GetContactService from "../services/ContactServices/GetContactService";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

type IndexGetContactQuery = {
  name: string;
  number: string;
};

interface ExtraInfo {
  name: string;
  value: string;
}
interface ContactData {
  name: string;
  number: string;
  email?: string;
  extraInfo?: ExtraInfo[];
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const companyId = req.user?.companyId || 1;

  const { contacts, count, hasMore } = await ListContactsService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ contacts, count, hasMore });
};

export const getContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, number } = req.body as IndexGetContactQuery;
  const companyId = req.user?.companyId || 1;

  const contact = await GetContactService({
    name,
    number,
    companyId
  });

  return res.status(200).json(contact);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newContact: ContactData = req.body;
  const companyId = req.user?.companyId || 1;

  newContact.number = newContact.number.replace("-", "").replace(" ", "");

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string()
      .required()
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await CheckIsValidContact(newContact.number);
  const validNumber: any = await CheckContactNumber(newContact.number);

  const profilePicUrl = await GetProfilePicUrl(validNumber);

  let name = newContact.name;
  let number = validNumber;
  let email = newContact.email;
  let extraInfo = newContact.extraInfo;

  const contact = await CreateContactService({
    name,
    number,
    email,
    extraInfo,
    profilePicUrl,
    companyId
  });

  CreateAuditLogService({
    companyId,
    userId: Number(req.user.id),
    action: "CONTACT_CREATE",
    entity: "Contact",
    entityId: contact.id,
    details: { name: contact.name, number: contact.number }
  });

  const io = getIO();
  io.emit(`company-${companyId}-contact`, {
    action: "create",
    contact
  });
  io.emit("contact", {
    action: "create",
    contact
  });

  return res.status(200).json(contact);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const contact = await ShowContactService(contactId, companyId);

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const contactData: ContactData = req.body;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string().matches(
      /^\d+$/,
      "Invalid number format. Only numbers is allowed."
    )
  });

  try {
    await schema.validate(contactData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await CheckIsValidContact(contactData.number);

  const { contactId } = req.params;

  const contact = await UpdateContactService({ contactData, contactId, companyId });

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "CONTACT_UPDATE",
    entity: "Contact",
    entityId: contactId,
    details: contactData
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-contact`, {
    action: "update",
    contact
  });
  io.emit("contact", {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  await DeleteContactService(contactId, companyId);

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "CONTACT_DELETE",
    entity: "Contact",
    entityId: contactId
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-contact`, {
    action: "delete",
    contactId
  });
  io.emit("contact", {
    action: "delete",
    contactId
  });

  return res.status(200).json({ message: "Contact deleted" });
};
