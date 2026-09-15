import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import { enqueueCampaign } from "../../queues";
import { Op } from "sequelize";

const RestartCampaignService = async (
  id: string | number,
  companyId: number
): Promise<Campaign> => {
  const campaign = await Campaign.findOne({
    where: { id, companyId }
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  // Resetar shippings com falha ou cancelados para pendente
  await CampaignShipping.update(
    { status: "pending", error: null as any },
    {
      where: {
        campaignId: id,
        companyId,
        status: { [Op.in]: ["failed", "cancelled"] }
      }
    }
  );

  campaign.status = "EM_ANDAMENTO";
  await campaign.save();

  await enqueueCampaign(campaign);

  await campaign.reload({
    include: ["contactList", "whatsapp", "shipping"]
  });

  return campaign;
};

export default RestartCampaignService;
