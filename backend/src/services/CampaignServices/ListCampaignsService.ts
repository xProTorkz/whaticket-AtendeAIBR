import { Op } from "sequelize";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import Whatsapp from "../../models/Whatsapp";
import CampaignShipping from "../../models/CampaignShipping";

interface Request {
  searchParam?: string;
  companyId: number;
  pageNumber?: string | number;
}

interface Response {
  records: Campaign[];
  count: number;
  hasMore: boolean;
}

const ListCampaignsService = async ({
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

  const { count, rows: records } = await Campaign.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      { model: ContactList, as: "contactList", attributes: ["id", "name"] },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name"] },
      { model: CampaignShipping, as: "shipping" }
    ]
  });

  const hasMore = count > offset + records.length;

  return {
    records,
    count,
    hasMore
  };
};

export default ListCampaignsService;
