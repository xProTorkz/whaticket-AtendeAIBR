import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import formatBody from "../helpers/Mustache";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";
import TicketLifecycleEvent from "../models/TicketLifecycleEvent";
import User from "../models/User";
import Queue from "../models/Queue";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const userId = req.user.id;
  const companyId = req.user?.companyId || 1;

  let queueIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    companyId
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId }: TicketData = req.body;
  const companyId = req.user?.companyId || 1;

  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    companyId
  });

  const io = getIO();
  io.to(ticket.status).emit("ticket", {
    action: "update",
    ticket
  });
  io.to(`company-${companyId}-${ticket.status}`).emit("ticket", {
    action: "update",
    ticket
  });

  return res.status(200).json(ticket);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const contact = await ShowTicketService(ticketId, companyId);

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const { ticket } = await UpdateTicketService({
    ticketData,
    ticketId,
    companyId,
    actorUser: req.user
  });

  if (ticket.status === "closed") {
    const whatsapp = await ShowWhatsAppService(ticket.whatsappId, ticket.companyId);

    const { farewellMessage } = whatsapp;

    if (farewellMessage) {
      await SendWhatsAppMessage({
        body: formatBody(farewellMessage, ticket.contact),
        ticket
      });
    }
  }

  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const ticket = await DeleteTicketService(ticketId, companyId);

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "TICKET_DELETE",
    entity: "Ticket",
    entityId: ticketId
  });

  const io = getIO();
  io.to(ticket.status).to(ticketId).to("notification").emit("ticket", {
    action: "delete",
    ticketId: +ticketId
  });

  io.to(`company-${req.user.companyId}-${ticket.status}`)
    .to(ticketId)
    .to(`company-${req.user.companyId}-notification`)
    .emit("ticket", {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};

export const showLifecycle = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const ticket = await ShowTicketService(ticketId, companyId);
  const events = await TicketLifecycleEvent.findAll({
    where: {
      ticketId: ticket.id,
      companyId: ticket.companyId
    },
    include: [
      { model: User, as: "user", attributes: ["id", "name", "email"] },
      { model: Queue, as: "queue", attributes: ["id", "name", "color"] }
    ],
    order: [["createdAt", "ASC"]]
  });

  return res.status(200).json(events);
};
