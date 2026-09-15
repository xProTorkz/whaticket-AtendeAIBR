import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import { enqueueCampaign, cancelCampaignJobs } from "../../queues";

interface Request {
  campaignData: any;
  id: string | number;
  companyId: number;
}

const UpdateCampaignService = async ({
  campaignData,
  id,
  companyId
}: Request): Promise<Campaign> => {
  const campaign = await Campaign.findOne({
    where: { id, companyId }
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  if (campaign.status === "EM_ANDAMENTO") {
    throw new AppError("ERR_NO_UPDATE_RUNNING_CAMPAIGN", 400);
  }

  const {
    name,
    status,
    confirmation,
    scheduledAt,
    message1,
    message2,
    message3,
    message4,
    message5,
    confirmationMessage1,
    confirmationMessage2,
    confirmationMessage3,
    confirmationMessage4,
    confirmationMessage5,
    whatsappId,
    contactListId,
    tagListId
  } = campaignData;

  await campaign.update({
    name: name || campaign.name,
    status: status || campaign.status,
    confirmation: confirmation !== undefined ? confirmation : campaign.confirmation,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : campaign.scheduledAt,
    message1: message1 !== undefined ? message1 : campaign.message1,
    message2: message2 !== undefined ? message2 : campaign.message2,
    message3: message3 !== undefined ? message3 : campaign.message3,
    message4: message4 !== undefined ? message4 : campaign.message4,
    message5: message5 !== undefined ? message5 : campaign.message5,
    confirmationMessage1: confirmationMessage1 !== undefined ? confirmationMessage1 : campaign.confirmationMessage1,
    confirmationMessage2: confirmationMessage2 !== undefined ? confirmationMessage2 : campaign.confirmationMessage2,
    confirmationMessage3: confirmationMessage3 !== undefined ? confirmationMessage3 : campaign.confirmationMessage3,
    confirmationMessage4: confirmationMessage4 !== undefined ? confirmationMessage4 : campaign.confirmationMessage4,
    confirmationMessage5: confirmationMessage5 !== undefined ? confirmationMessage5 : campaign.confirmationMessage5,
    whatsappId: whatsappId !== undefined ? (whatsappId ? Number(whatsappId) : null) : campaign.whatsappId,
    contactListId: contactListId !== undefined ? (contactListId ? Number(contactListId) : null) : campaign.contactListId,
    tagListId: tagListId !== undefined ? tagListId : campaign.tagListId
  });

  if (campaign.status === "PROGRAMADA" && campaign.contactListId) {
    await enqueueCampaign(campaign);
  } else if (campaign.status === "INATIVA" || campaign.status === "CANCELADA") {
    await cancelCampaignJobs(campaign.id, companyId);
  }

  await campaign.reload({
    include: ["contactList", "whatsapp", "shipping"]
  });

  return campaign;
};

export default UpdateCampaignService;
