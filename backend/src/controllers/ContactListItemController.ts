import { Request, Response } from "express";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import ContactListItem from "../models/ContactListItem";
import { getIO } from "../libs/socket";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
  contactListId?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber = "1", searchParam = "", contactListId } = req.query as IndexQuery;
  const { companyId } = req.user;

  const limit = 20;
  const offset = limit * (Number(pageNumber) - 1);

  const whereCondition: any = { companyId };

  if (contactListId) {
    whereCondition.contactListId = contactListId;
  }

  if (searchParam) {
    whereCondition[Op.or] = [
      { name: { [Op.like]: `%${searchParam.toLowerCase()}%` } },
      { number: { [Op.like]: `%${searchParam.toLowerCase()}%` } },
      { email: { [Op.like]: `%${searchParam.toLowerCase()}%` } }
    ];
  }

  const { count, rows: contacts } = await ContactListItem.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + contacts.length;

  return res.json({ contacts, count, hasMore });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { contactListId } = req.query as IndexQuery;
  const { companyId } = req.user;

  const whereCondition: any = { companyId };
  if (contactListId) {
    whereCondition.contactListId = contactListId;
  }

  const records = await ContactListItem.findAll({
    where: whereCondition,
    order: [["name", "ASC"]]
  });

  return res.json(records);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, number, email, contactListId, isWhatsappValid = true } = req.body;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await ContactListItem.create({
    name,
    number: String(number).replace(/[^0-9]/g, ""),
    email,
    contactListId,
    companyId,
    isWhatsappValid
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactListItem`, {
      action: "create",
      record
    });
  } catch (_) {}

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const record = await ContactListItem.findOne({
    where: { id, companyId }
  });

  if (!record) {
    throw new AppError("ERR_NO_CONTACT_LIST_ITEM_FOUND", 404);
  }

  return res.status(200).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { name, number, email, isWhatsappValid } = req.body;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const record = await ContactListItem.findOne({
    where: { id, companyId }
  });

  if (!record) {
    throw new AppError("ERR_NO_CONTACT_LIST_ITEM_FOUND", 404);
  }

  await record.update({
    name: name !== undefined ? name : record.name,
    number: number !== undefined ? String(number).replace(/[^0-9]/g, "") : record.number,
    email: email !== undefined ? email : record.email,
    isWhatsappValid: isWhatsappValid !== undefined ? isWhatsappValid : record.isWhatsappValid
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactListItem`, {
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

  const record = await ContactListItem.findOne({
    where: { id, companyId }
  });

  if (!record) {
    throw new AppError("ERR_NO_CONTACT_LIST_ITEM_FOUND", 404);
  }

  await record.destroy();

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactListItem`, {
      action: "delete",
      id
    });
  } catch (_) {}

  return res.status(200).json({ message: "Contact item deleted" });
};
