import { Op } from "sequelize";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";

interface Request {
  searchParam?: string;
  companyId: number;
  pageNumber?: string | number;
}

interface Response {
  records: ContactList[];
  count: number;
  hasMore: boolean;
}

const ListContactListsService = async ({
  searchParam = "",
  companyId,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const limit = 20;
  const offset = limit * (Number(pageNumber) - 1);

  const whereCondition: any = { companyId };

  if (searchParam) {
    whereCondition.name = {
      [Op.like]: `%${searchParam.toLowerCase()}%`
    };
  }

  const { count, rows: records } = await ContactList.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["name", "ASC"]],
    include: [{ model: ContactListItem, as: "contactListItems", attributes: ["id", "isWhatsappValid"] }]
  });

  const hasMore = count > offset + records.length;

  return {
    records,
    count,
    hasMore
  };
};

export default ListContactListsService;
