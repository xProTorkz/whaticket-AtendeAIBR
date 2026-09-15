import { Request, Response } from "express";
import * as Yup from "yup";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import CreateOrUpdateContactService from "../../services/ContactServices/CreateOrUpdateContactService";
import { dispatchWebhookEvent } from "../../services/WebhookServices/WebhookDispatcher";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { searchParam = "", pageNumber = "1", limit = "20" } = req.query as any;

  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const page = Math.max(1, parseInt(pageNumber, 10) || 1);
  const offset = (page - 1) * take;

  const whereCondition: any = {
    companyId
  };

  if (searchParam) {
    whereCondition[Op.or] = [
      { name: { [Op.like]: `%${searchParam.toLowerCase()}%` } },
      { number: { [Op.like]: `%${searchParam}%` } },
      { email: { [Op.like]: `%${searchParam.toLowerCase()}%` } }
    ];
  }

  const { count, rows: contacts } = await Contact.findAndCountAll({
    where: whereCondition,
    limit: take,
    offset,
    order: [["name", "ASC"]],
    include: ["extraInfo", "tags"]
  });

  const hasMore = count > offset + contacts.length;

  return res.json({
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      email: c.email,
      isGroup: c.isGroup,
      optOut: c.optOut || false,
      extraInfo: c.extraInfo,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    })),
    count,
    page,
    limit: take,
    hasMore
  });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const contact = await Contact.findOne({
    where: { id, companyId },
    include: ["extraInfo", "tags"]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  return res.json({
    id: contact.id,
    name: contact.name,
    number: contact.number,
    email: contact.email,
    isGroup: contact.isGroup,
    optOut: contact.optOut || false,
    extraInfo: contact.extraInfo,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  const schema = Yup.object().shape({
    name: Yup.string().required("ERR_NAME_REQUIRED"),
    number: Yup.string()
      .required("ERR_NUMBER_REQUIRED")
      .matches(/^[0-9]+$/, "ERR_INVALID_NUMBER_FORMAT"),
    email: Yup.string().email("ERR_INVALID_EMAIL").nullable(),
    optOut: Yup.boolean().nullable(),
    extraInfo: Yup.array()
      .of(
        Yup.object().shape({
          name: Yup.string().required(),
          value: Yup.string().required()
        })
      )
      .nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const { name, number, email, optOut = false, extraInfo = [] } = req.body;

  const existingContact = await Contact.findOne({
    where: { number, companyId }
  });

  const contact = await CreateOrUpdateContactService({
    name,
    number,
    email,
    isGroup: false,
    optOut,
    extraInfo,
    companyId
  });

  const eventType = existingContact ? "contact.updated" : "contact.created";

  dispatchWebhookEvent({
    companyId,
    event: eventType,
    data: {
      id: contact.id,
      name: contact.name,
      number: contact.number,
      email: contact.email,
      optOut: contact.optOut,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt
    }
  });

  return res.status(existingContact ? 200 : 201).json({
    id: contact.id,
    name: contact.name,
    number: contact.number,
    email: contact.email,
    optOut: contact.optOut,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt
  });
};
