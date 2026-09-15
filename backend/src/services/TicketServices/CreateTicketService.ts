import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import ShowContactService from "../ContactServices/ShowContactService";
import CreateTicketLifecycleEventService from "./CreateTicketLifecycleEventService";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  queueId?: number;
  companyId?: number;
}

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  queueId,
  companyId = 1
}: Request): Promise<Ticket> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(userId, companyId);

  await CheckContactOpenTickets(contactId, defaultWhatsapp.id);

  const { isGroup } = await ShowContactService(contactId, companyId);

  if (queueId === undefined) {
    const user = await User.findByPk(userId, { include: ["queues"] });
    queueId = user?.queues.length === 1 ? user.queues[0].id : undefined;
  }

  const now = new Date();
  const queueEnteredAt = queueId ? now : null;
  const startedAt = status === "open" ? now : null;
  const effectiveCompanyId = defaultWhatsapp.companyId || companyId;

  const { id }: Ticket = await defaultWhatsapp.$create("ticket", {
    contactId,
    status,
    isGroup,
    userId,
    queueId,
    queueEnteredAt,
    startedAt,
    companyId: effectiveCompanyId
  });

  const ticket = await Ticket.findByPk(id, { include: ["contact"] });

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  if (queueId) {
    await CreateTicketLifecycleEventService({
      ticketId: id,
      companyId: effectiveCompanyId,
      type: "queue_entered",
      queueId,
      userId
    });
  }

  if (userId) {
    await CreateTicketLifecycleEventService({
      ticketId: id,
      companyId: effectiveCompanyId,
      type: "assigned",
      userId,
      queueId
    });
  }

  if (status === "open") {
    await CreateTicketLifecycleEventService({
      ticketId: id,
      companyId: effectiveCompanyId,
      type: "started",
      userId,
      queueId,
      waitDurationSeconds: 0
    });
  }

  return ticket;
};

export default CreateTicketService;
