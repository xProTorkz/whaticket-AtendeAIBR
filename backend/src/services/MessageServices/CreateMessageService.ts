import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import CreateTicketLifecycleEventService from "../TicketServices/CreateTicketLifecycleEventService";

interface MessageData {
  id: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  ack?: number;
  quotedMsgId?: string;
  companyId?: number;
}
interface Request {
  messageData: MessageData;
  companyId?: number;
}

const CreateMessageService = async ({
  messageData,
  companyId
}: Request): Promise<Message> => {
  if (companyId && !messageData.companyId) {
    messageData.companyId = companyId;
  }

  if (!messageData.companyId && messageData.ticketId) {
    const ticket = await Ticket.findByPk(messageData.ticketId);
    if (ticket) {
      messageData.companyId = ticket.companyId;
    }
  }

  await Message.upsert(messageData);

  const message = await Message.findByPk(messageData.id, {
    include: [
      "contact",
      {
        model: Ticket,
        as: "ticket",
        include: [
          "contact",
          "queue",
          {
            model: Whatsapp,
            as: "whatsapp",
            attributes: ["name"]
          }
        ]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  // Registra primeiro atendimento / primeira resposta humana
  if (messageData.fromMe && message.ticket && !message.ticket.firstResponseAt) {
    const now = new Date();
    const refStart = message.ticket.startedAt || message.ticket.createdAt;
    const responseDurationSeconds = refStart
      ? Math.max(0, Math.round((now.getTime() - new Date(refStart).getTime()) / 1000))
      : null;

    await message.ticket.update({ firstResponseAt: now });

    await CreateTicketLifecycleEventService({
      ticketId: message.ticket.id,
      companyId: message.ticket.companyId,
      userId: message.ticket.userId || null,
      queueId: message.ticket.queueId || null,
      type: "first_response",
      waitDurationSeconds: responseDurationSeconds,
      details: JSON.stringify({ messageId: message.id })
    });
  }

  const io = getIO();
  const targetCompanyId = message.companyId || message.ticket?.companyId;

  if (targetCompanyId) {
    import("../WebhookServices/WebhookDispatcher").then(({ dispatchWebhookEvent }) => {
      dispatchWebhookEvent({
        companyId: targetCompanyId,
        event: messageData.fromMe ? "message.sent" : "message.received",
        data: {
          id: message.id,
          ticketId: message.ticketId,
          contactId: message.contactId || message.ticket?.contactId,
          body: message.body,
          fromMe: message.fromMe,
          mediaType: message.mediaType,
          mediaUrl: message.mediaUrl,
          createdAt: message.createdAt
        }
      });
    }).catch(() => {});
  }

  io.to(message.ticketId.toString())
    .to(message.ticket.status)
    .to("notification")
    .to(`company-${targetCompanyId}-notification`)
    .emit("appMessage", {
      action: "create",
      message,
      ticket: message.ticket,
      contact: message.ticket.contact
    });

  return message;
};

export default CreateMessageService;
