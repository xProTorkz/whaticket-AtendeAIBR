import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import { cancelCampaignJobs } from "../../queues";

const DeleteCampaignService = async (
  id: string | number,
  companyId: number
): Promise<void> => {
  const campaign = await Campaign.findOne({
    where: { id, companyId }
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  await cancelCampaignJobs(Number(id), companyId);

  await CampaignShipping.destroy({
    where: { campaignId: id, companyId }
  });

  await campaign.destroy();
};

export default DeleteCampaignService;
