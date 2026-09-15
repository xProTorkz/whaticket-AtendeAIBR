import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";

const PauseCampaignService = async (
  id: string | number,
  companyId: number
): Promise<Campaign> => {
  const campaign = await Campaign.findOne({
    where: { id, companyId }
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  campaign.status = "PAUSADA";
  await campaign.save();

  await campaign.reload({
    include: ["contactList", "whatsapp", "shipping"]
  });

  return campaign;
};

export default PauseCampaignService;
