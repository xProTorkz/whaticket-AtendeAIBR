import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import { cancelCampaignJobs } from "../../queues";

const CancelCampaignService = async (
  id: string | number,
  companyId: number
): Promise<Campaign> => {
  const campaign = await Campaign.findOne({
    where: { id, companyId }
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  campaign.status = "CANCELADA";
  await campaign.save();

  await cancelCampaignJobs(campaign.id, companyId);

  await campaign.reload({
    include: ["contactList", "whatsapp", "shipping"]
  });

  return campaign;
};

export default CancelCampaignService;
