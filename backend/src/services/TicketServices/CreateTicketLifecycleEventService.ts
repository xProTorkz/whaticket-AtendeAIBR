import TicketLifecycleEvent from "../../models/TicketLifecycleEvent";
import { getIO } from "../../libs/socket";

export type TicketLifecycleType =
  | "queue_entered"
  | "assigned"
  | "started"
  | "first_response"
  | "queue_transferred"
  | "user_transferred"
  | "closed"
  | "reopened";

export interface LifecycleEventData {
  ticketId: number;
  companyId: number;
  type: TicketLifecycleType;
  userId?: number | null;
  queueId?: number | null;
  previousUserId?: number | null;
  previousQueueId?: number | null;
  waitDurationSeconds?: number | null;
  supportDurationSeconds?: number | null;
  details?: string | null;
}

const CreateTicketLifecycleEventService = async (
  data: LifecycleEventData
): Promise<TicketLifecycleEvent> => {
  const event = await TicketLifecycleEvent.create({
    ticketId: data.ticketId,
    companyId: data.companyId,
    userId: data.userId ? Number(data.userId) : null,
    queueId: data.queueId ? Number(data.queueId) : null,
    type: data.type,
    previousUserId: data.previousUserId ? Number(data.previousUserId) : null,
    previousQueueId: data.previousQueueId ? Number(data.previousQueueId) : null,
    waitDurationSeconds:
      data.waitDurationSeconds !== undefined && data.waitDurationSeconds !== null
        ? Math.round(Number(data.waitDurationSeconds))
        : null,
    supportDurationSeconds:
      data.supportDurationSeconds !== undefined && data.supportDurationSeconds !== null
        ? Math.round(Number(data.supportDurationSeconds))
        : null,
    details: data.details || null
  });

  try {
    const io = getIO();
    io.to(`company-${data.companyId}`).emit(
      `company-${data.companyId}-ticket-lifecycle`,
      {
        action: "create",
        event
      }
    );
  } catch (err) {
    // Socket não inicializado (ex: ambiente de teste)
  }

  return event;
};

export default CreateTicketLifecycleEventService;
