import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import CreateAuditLogService from "../AuditServices/CreateAuditLogService";
import AppError from "../../errors/AppError";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number;
  whatsappId?: number;
}

interface ActorUser {
  id?: number | string;
  profile?: string;
  isSuperAdmin?: boolean;
  companyId?: number;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  companyId?: number;
  actorUser?: ActorUser;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  companyId,
  actorUser
}: Request): Promise<Response> => {
  const { status, userId, queueId, whatsappId } = ticketData;

  // RBAC: visitante e colaborador não possuem permissão de alteração de tickets
  if (actorUser && !actorUser.isSuperAdmin) {
    if (actorUser.profile === "visitor" || actorUser.profile === "collaborator") {
      throw new AppError(
        "ERR_NO_PERMISSION: Usuários com perfil visitante ou colaborador não podem alterar tickets.",
        403
      );
    }
  }

  const ticket = await ShowTicketService(ticketId, companyId);
  await SetTicketMessagesAsRead(ticket);

  if (whatsappId && ticket.whatsappId !== whatsappId) {
    await CheckContactOpenTickets(ticket.contactId, whatsappId);
  }

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;
  const oldQueueId = ticket.queueId;
  const oldWhatsappId = ticket.whatsappId;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  await ticket.update({
    status,
    queueId,
    userId
  });

  if (whatsappId) {
    await ticket.update({
      whatsappId
    });
  }

  await ticket.reload();

  // Trilha de Auditoria: registra eventos críticos de atendimento
  const actorIdNumber = actorUser?.id ? Number(actorUser.id) : undefined;

  if (status && status !== oldStatus) {
    let action = "TICKET_STATUS_CHANGE";
    if (status === "closed") action = "TICKET_CLOSE";
    else if (oldStatus === "closed") action = "TICKET_REOPEN";

    CreateAuditLogService({
      companyId: ticket.companyId,
      userId: actorIdNumber,
      action,
      entity: "Ticket",
      entityId: ticket.id,
      details: { oldStatus, newStatus: status }
    });
  }

  if (userId !== undefined && userId !== oldUserId) {
    CreateAuditLogService({
      companyId: ticket.companyId,
      userId: actorIdNumber,
      action: "TICKET_USER_ASSIGN",
      entity: "Ticket",
      entityId: ticket.id,
      details: { oldUserId, newUserId: userId }
    });
  }

  if (queueId !== undefined && queueId !== oldQueueId) {
    CreateAuditLogService({
      companyId: ticket.companyId,
      userId: actorIdNumber,
      action: "TICKET_QUEUE_CHANGE",
      entity: "Ticket",
      entityId: ticket.id,
      details: { oldQueueId, newQueueId: queueId }
    });
  }

  if (whatsappId && whatsappId !== oldWhatsappId) {
    CreateAuditLogService({
      companyId: ticket.companyId,
      userId: actorIdNumber,
      action: "TICKET_TRANSFER_WHATSAPP",
      entity: "Ticket",
      entityId: ticket.id,
      details: { oldWhatsappId, newWhatsappId: whatsappId }
    });
  }

  const io = getIO();

  if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
    io.to(oldStatus).emit("ticket", {
      action: "delete",
      ticketId: ticket.id
    });
    io.to(`company-${ticket.companyId}-${oldStatus}`).emit("ticket", {
      action: "delete",
      ticketId: ticket.id
    });
  }

  io.to(ticket.status)
    .to("notification")
    .to(ticketId.toString())
    .emit("ticket", {
      action: "update",
      ticket
    });

  io.to(`company-${ticket.companyId}-${ticket.status}`)
    .to(`company-${ticket.companyId}-notification`)
    .to(ticketId.toString())
    .emit("ticket", {
      action: "update",
      ticket
    });

  return { ticket, oldStatus, oldUserId };
};

export default UpdateTicketService;
