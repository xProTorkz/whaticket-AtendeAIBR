import { Op } from "sequelize";
import User from "../../models/User";
import InternalMessage from "../../models/InternalMessage";

interface Request {
  currentUserId: number;
  companyId: number;
}

export interface InternalChatUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  unreadCount: number;
  lastMessage?: {
    text: string;
    createdAt: Date;
    fromMe: boolean;
  };
}

const ListInternalChatUsersService = async ({
  currentUserId,
  companyId
}: Request): Promise<InternalChatUser[]> => {
  const users = await User.findAll({
    where: {
      companyId,
      id: {
        [Op.ne]: currentUserId
      }
    },
    attributes: ["id", "name", "email", "profile"],
    order: [["name", "ASC"]]
  });

  const chatUsers: InternalChatUser[] = [];

  for (const user of users) {
    const unreadCount = await InternalMessage.count({
      where: {
        companyId,
        senderId: user.id,
        receiverId: currentUserId,
        read: false
      }
    });

    const lastMsg = await InternalMessage.findOne({
      where: {
        companyId,
        [Op.or]: [
          { senderId: currentUserId, receiverId: user.id },
          { senderId: user.id, receiverId: currentUserId }
        ]
      },
      order: [["createdAt", "DESC"]]
    });

    chatUsers.push({
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile,
      unreadCount,
      lastMessage: lastMsg
        ? {
            text: lastMsg.text,
            createdAt: lastMsg.createdAt,
            fromMe: lastMsg.senderId === currentUserId
          }
        : undefined
    });
  }

  return chatUsers;
};

export default ListInternalChatUsersService;
