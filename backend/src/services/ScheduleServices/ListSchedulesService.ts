import { Op } from "sequelize";
import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  contactId?: number | string;
  userId?: number | string;
  companyId: number;
  pageNumber?: string | number;
}

interface Response {
  schedules: Schedule[];
  count: number;
  hasMore: boolean;
}

const ListSchedulesService = async ({
  searchParam = "",
  contactId,
  userId,
  companyId,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const limit = 20;
  const offset = limit * (Number(pageNumber) - 1);

  const whereCondition: any = { companyId };

  if (contactId) {
    whereCondition.contactId = contactId;
  }

  if (userId) {
    whereCondition.userId = userId;
  }

  if (searchParam) {
    whereCondition.body = {
      [Op.like]: `%${searchParam.toLowerCase()}%`
    };
  }

  const { count, rows: schedules } = await Schedule.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["sendAt", "ASC"]],
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number"] },
      { model: User, as: "user", attributes: ["id", "name"] }
    ]
  });

  const hasMore = count > offset + schedules.length;

  return {
    schedules,
    count,
    hasMore
  };
};

export default ListSchedulesService;
