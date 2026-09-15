import { Request, Response } from "express";
import AppError from "../errors/AppError";
import ContactList from "../models/ContactList";
import CreateContactListService from "../services/ContactListServices/CreateContactListService";
import ListContactListsService from "../services/ContactListServices/ListContactListsService";
import ShowContactListService from "../services/ContactListServices/ShowContactListService";
import UpdateContactListService from "../services/ContactListServices/UpdateContactListService";
import DeleteContactListService from "../services/ContactListServices/DeleteContactListService";
import ImportContactsToContactListService from "../services/ContactListServices/ImportContactsToContactListService";
import { getIO } from "../libs/socket";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber, searchParam } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { records, count, hasMore } = await ListContactListsService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ records, count, hasMore });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const records = await ContactList.findAll({
    where: { companyId },
    order: [["name", "ASC"]]
  });

  return res.json(records);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name } = req.body;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await CreateContactListService({
    name,
    companyId
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactList`, {
      action: "create",
      record
    });
  } catch (_) {}

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const record = await ShowContactListService(id, companyId);

  return res.status(200).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { name } = req.body;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await UpdateContactListService({
    id,
    name,
    companyId
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactList`, {
      action: "update",
      record
    });
  } catch (_) {}

  return res.status(200).json(record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await DeleteContactListService(id, companyId);

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactList`, {
      action: "delete",
      id
    });
  } catch (_) {}

  return res.status(200).json({ message: "Contact list deleted" });
};

export const upload = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;
  const file = req.file as Express.Multer.File;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const imported = await ImportContactsToContactListService({
    contactListId: id,
    companyId,
    file
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactListItem-${id}`, {
      action: "reload",
      records: imported
    });
  } catch (_) {}

  return res.status(200).json({ message: "Imported successfully", count: imported.length });
};
