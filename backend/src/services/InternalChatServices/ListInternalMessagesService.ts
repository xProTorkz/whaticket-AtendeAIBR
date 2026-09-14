import { Op } from "sequelize";
import InternalMessage from "../../models/InternalMessage";
import User from "../../models/User";
import AppError from "../../errors/AppError";

interface Request {
  userId: number;
  targetUserId?: number;
  companyId: number;
  pageNumber?: string | number;
}

interface Response {
  messages: InternalMessage[];
  count: number;
  hasMore: boolean;
}

const ListInternalMessagesService = async ({
  userId,
  targetUserId,
  companyId,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const limit = 50;
  const offset = limit * (+pageNumber - 1);

  let whereClause: any = {
    companyId
  };

  if (targetUserId) {
    const targetUser = await User.findOne({
      where: { id: targetUserId, companyId }
    });

    if (!targetUser) {
      throw new AppError("ERR_NO_USER_FOUND", 404);
    }

    whereClause = {
      companyId,
      [Op.or]: [
        { senderId: userId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId }
      ]
    };
  } else {
    // Chat geral da empresa (sem destinatário específico)
    whereClause = {
      companyId,
      receiverId: null
    };
  }

  const { count, rows: messages } = await InternalMessage.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [["createdAt", "ASC"]],
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

  const hasMore = count > offset + messages.length;

  return {
    messages,
    count,
    hasMore
  };
};

export default ListInternalMessagesService;
