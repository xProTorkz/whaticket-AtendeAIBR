import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import User from "../../models/User";
import CreateTicketService from "../../services/TicketServices/CreateTicketService";
import UpdateTicketService from "../../services/TicketServices/UpdateTicketService";
import ShowTicketService from "../../services/TicketServices/ShowTicketService";
import { dispatchWebhookEvent } from "../../services/WebhookServices/WebhookDispatcher";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { status, queueId, userId, contactId, pageNumber = "1", limit = "20" } = req.query as any;

  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const page = Math.max(1, parseInt(pageNumber, 10) || 1);
  const offset = (page - 1) * take;

  const whereCondition: any = { companyId };

  if (status) whereCondition.status = status;
  if (queueId) whereCondition.queueId = queueId;
  if (userId) whereCondition.userId = userId;
  if (contactId) whereCondition.contactId = contactId;

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    limit: take,
    offset,
    order: [["updatedAt", "DESC"]],
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number", "email"] },
      { model: Queue, as: "queue", attributes: ["id", "name", "color"] },
      { model: User, as: "user", attributes: ["id", "name", "email"] }
    ]
  });

  const hasMore = count > offset + tickets.length;

  return res.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      status: t.status,
      lastMessage: t.lastMessage,
      unreadMessages: t.unreadMessages,
      contact: t.contact,
      queue: t.queue,
      user: t.user,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
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

  const ticket = await ShowTicketService(id, companyId);

  return res.json({
    id: ticket.id,
    status: ticket.status,
    lastMessage: ticket.lastMessage,
    unreadMessages: ticket.unreadMessages,
    contact: ticket.contact,
    queue: ticket.queue,
    user: ticket.user,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  const schema = Yup.object().shape({
    contactId: Yup.number().required("ERR_CONTACT_ID_REQUIRED"),
    status: Yup.string().default("open"),
    queueId: Yup.number().nullable(),
    userId: Yup.number().nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const { contactId, status = "open", queueId, userId } = req.body;

  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    queueId,
    companyId
  });

  dispatchWebhookEvent({
    companyId,
    event: "ticket.created",
    data: {
      id: ticket.id,
      status: ticket.status,
      contactId: ticket.contactId,
      queueId: ticket.queueId,
      userId: ticket.userId,
      createdAt: ticket.createdAt
    }
  });

  return res.status(201).json(ticket);
};

export const close = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const { ticket } = await UpdateTicketService({
    ticketData: { status: "closed" },
    ticketId: id,
    companyId
  });

  dispatchWebhookEvent({
    companyId,
    event: "ticket.closed",
    data: {
      id: ticket.id,
      status: ticket.status,
      contactId: ticket.contactId,
      queueId: ticket.queueId,
      userId: ticket.userId,
      closedAt: new Date()
    }
  });

  return res.json({
    id: ticket.id,
    status: ticket.status,
    closedAt: new Date()
  });
};
