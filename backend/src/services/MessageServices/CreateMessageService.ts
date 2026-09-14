import { getIO } from "../../libs/socket";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

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

  const io = getIO();
  const targetCompanyId = message.companyId || message.ticket?.companyId;

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
