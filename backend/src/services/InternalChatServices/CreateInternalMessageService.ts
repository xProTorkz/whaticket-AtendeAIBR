import * as Yup from "yup";
import AppError from "../../errors/AppError";
import InternalMessage from "../../models/InternalMessage";
import User from "../../models/User";
import { getIO } from "../../libs/socket";

interface Request {
  text: string;
  senderId: number;
  receiverId?: number;
  companyId: number;
}

const CreateInternalMessageService = async ({
  text,
  senderId,
  receiverId,
  companyId
}: Request): Promise<InternalMessage> => {
  if (receiverId && Number(senderId) === Number(receiverId)) {
    throw new AppError("ERR_INTERNAL_MESSAGE_SELF", 400);
  }

  const schema = Yup.object().shape({
    text: Yup.string().trim().required("ERR_INTERNAL_MESSAGE_EMPTY").min(1, "ERR_INTERNAL_MESSAGE_EMPTY")
  });

  try {
    await schema.validate({ text });
  } catch (err: any) {
    throw new AppError(err.message || "ERR_INTERNAL_MESSAGE_EMPTY", 400);
  }

  // 1. Validação estrita de remetente no tenant
  const sender = await User.findOne({
    where: { id: senderId, companyId }
  });

  if (!sender) {
    throw new AppError("ERR_SENDER_USER_NOT_FOUND_IN_TENANT", 404);
  }

  // 2. Validação estrita de destinatário no tenant (se fornecido)
  if (receiverId) {
    const receiver = await User.findOne({
      where: { id: receiverId, companyId }
    });

    if (!receiver) {
      throw new AppError(
        "ERR_RECEIVER_USER_NOT_FOUND_IN_TENANT: Destinatário não pertence a este tenant.",
        404
      );
    }
  }

  const message = await InternalMessage.create({
    text,
    senderId,
    receiverId: receiverId || null,
    companyId,
    read: false
  });

  const reloadedMessage = await InternalMessage.findByPk(message.id, {
    include: [
      {
        model: User,
        as: "sender",
        attributes: ["id", "name", "email", "profile"]
      },
      {
        model: User,
        as: "receiver",
        attributes: ["id", "name", "email", "profile"]
      }
    ]
  });

  if (!reloadedMessage) {
    return message;
  }

  const io = getIO();

  // Emite para a sala de chat geral do tenant
  io.to(`company-${companyId}-internal-chat`).emit(`company-${companyId}-internal-chat`, {
    action: "newMessage",
    message: reloadedMessage
  });

  // Emite especificamente para o destinatário (para notificações em tempo real)
  if (receiverId) {
    io.to(`company-${companyId}-user-${receiverId}`).emit(
      `company-${companyId}-internal-chat-notification`,
      {
        action: "newMessage",
        message: reloadedMessage
      }
    );
  }

  return reloadedMessage;
};

export default CreateInternalMessageService;
