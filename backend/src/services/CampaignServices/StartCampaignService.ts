import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import { enqueueCampaign } from "../../queues";

const StartCampaignService = async (
  id: string | number,
  companyId: number
): Promise<Campaign> => {
  const campaign = await Campaign.findOne({
    where: { id, companyId }
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  if (!campaign.contactListId) {
    throw new AppError("ERR_CAMPAIGN_NO_CONTACT_LIST", 400);
  }

  campaign.status = "EM_ANDAMENTO";
  await campaign.save();

  await enqueueCampaign(campaign);

  import("../WebhookServices/WebhookDispatcher").then(({ dispatchWebhookEvent }) => {
    dispatchWebhookEvent({
      companyId: campaign.companyId,
      event: "campaign.started",
      data: {
        id: campaign.id,
        name: campaign.name,
        contactListId: campaign.contactListId,
        startedAt: new Date()
      }
    });
  }).catch(() => {});

  await campaign.reload({
    include: ["contactList", "whatsapp", "shipping"]
  });

  return campaign;
};

export default StartCampaignService;
