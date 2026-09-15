import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import CreateAuditLogService from "../AuditServices/CreateAuditLogService";
import CreateTicketLifecycleEventService from "./CreateTicketLifecycleEventService";
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
  const oldUserId = ticket.user?.id || ticket.userId;
  const oldQueueId = ticket.queueId;
  const oldWhatsappId = ticket.whatsappId;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  const now = new Date();
  const updateFields: any = {
    status,
    queueId,
    userId
  };

  let waitDurationSeconds: number | null = null;
  let supportDurationSeconds: number | null = null;

  if (status && status !== oldStatus) {
    if (status === "open" && oldStatus === "pending") {
      updateFields.startedAt = now;
      const refWait = ticket.queueEnteredAt || ticket.createdAt;
      if (refWait) {
        waitDurationSeconds = Math.max(
          0,
          Math.round((now.getTime() - new Date(refWait).getTime()) / 1000)
        );
      }
    } else if (status === "closed") {
      updateFields.closedAt = now;
      const refStart = ticket.startedAt || ticket.createdAt;
      if (refStart) {
        supportDurationSeconds = Math.max(
          0,
          Math.round((now.getTime() - new Date(refStart).getTime()) / 1000)
        );
      }
    } else if (oldStatus === "closed") {
      updateFields.closedAt = null;
      if (status === "pending") {
        updateFields.queueEnteredAt = now;
        updateFields.startedAt = null;
      } else if (status === "open") {
        updateFields.startedAt = now;
      }
    }
  }

  if (queueId !== undefined && queueId !== oldQueueId) {
    updateFields.queueEnteredAt = now;
  }

  if (whatsappId) {
    updateFields.whatsappId = whatsappId;
  }

  await ticket.update(updateFields);
  await ticket.reload();

  const actorIdNumber = actorUser?.id ? Number(actorUser.id) : undefined;

  // Registro do Ciclo Real de Atendimento (TicketLifecycleEvents)
  if (status && status !== oldStatus) {
    if (status === "open" && oldStatus === "pending") {
      await CreateTicketLifecycleEventService({
        ticketId: ticket.id,
        companyId: ticket.companyId,
        userId: actorIdNumber || (userId ? Number(userId) : oldUserId),
        queueId: queueId !== undefined ? (queueId ? Number(queueId) : null) : oldQueueId,
        type: "started",
        waitDurationSeconds,
        details: JSON.stringify({ fromStatus: oldStatus, toStatus: status })
      });
    } else if (status === "closed") {
      await CreateTicketLifecycleEventService({
        ticketId: ticket.id,
        companyId: ticket.companyId,
        userId: actorIdNumber || oldUserId,
        queueId: oldQueueId,
        type: "closed",
        supportDurationSeconds,
        details: JSON.stringify({ fromStatus: oldStatus, toStatus: "closed" })
      });
    } else if (oldStatus === "closed") {
      await CreateTicketLifecycleEventService({
        ticketId: ticket.id,
        companyId: ticket.companyId,
        userId: actorIdNumber,
        queueId: queueId !== undefined ? (queueId ? Number(queueId) : null) : oldQueueId,
        type: "reopened",
        details: JSON.stringify({ fromStatus: "closed", toStatus: status })
      });
      if (status === "pending") {
        await CreateTicketLifecycleEventService({
          ticketId: ticket.id,
          companyId: ticket.companyId,
          userId: actorIdNumber,
          queueId: queueId !== undefined ? (queueId ? Number(queueId) : null) : oldQueueId,
          type: "queue_entered",
          details: "Entrada na fila após reabertura"
        });
      }
    }
  }

  if (queueId !== undefined && queueId !== oldQueueId) {
    await CreateTicketLifecycleEventService({
      ticketId: ticket.id,
      companyId: ticket.companyId,
      userId: actorIdNumber,
      queueId: queueId ? Number(queueId) : null,
      previousQueueId: oldQueueId || null,
      type: "queue_transferred",
      details: JSON.stringify({ oldQueueId, newQueueId: queueId })
    });
  }

  if (userId !== undefined && userId !== oldUserId) {
    const isNewAssign = !oldUserId && userId;
    await CreateTicketLifecycleEventService({
      ticketId: ticket.id,
      companyId: ticket.companyId,
      userId: userId ? Number(userId) : null,
      previousUserId: oldUserId || null,
      queueId: ticket.queueId || null,
      type: isNewAssign ? "assigned" : "user_transferred",
      details: JSON.stringify({ oldUserId, newUserId: userId })
    });
  }

  // Trilha de Auditoria: registra eventos críticos de atendimento
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
