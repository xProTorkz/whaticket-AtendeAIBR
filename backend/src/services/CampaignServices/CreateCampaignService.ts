import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import { enqueueCampaign } from "../../queues";

interface Request {
  campaignData: {
    name: string;
    status?: string;
    confirmation?: boolean;
    scheduledAt?: string | Date;
    message1?: string;
    message2?: string;
    message3?: string;
    message4?: string;
    message5?: string;
    confirmationMessage1?: string;
    confirmationMessage2?: string;
    confirmationMessage3?: string;
    confirmationMessage4?: string;
    confirmationMessage5?: string;
    whatsappId?: number | string;
    contactListId?: number | string;
    tagListId?: string;
  };
  companyId: number;
  userId?: number;
}

const CreateCampaignService = async ({
  campaignData,
  companyId,
  userId
}: Request): Promise<Campaign> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2)
  });

  try {
    await schema.validate({ name: campaignData.name });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const { assertCanCreateResource, assertHasCapability } = await import("../PlanServices/EntitlementService");
  await assertHasCapability(companyId, "campaigns");
  await assertCanCreateResource(companyId, "campaigns");

  const {
    name,
    status = "INATIVA",
    confirmation = false,
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

  const campaign = await Campaign.create({
    name,
    status,
    confirmation,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : (null as any),
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
    whatsappId: whatsappId ? Number(whatsappId) : (null as any),
    contactListId: contactListId ? Number(contactListId) : (null as any),
    tagListId,
    companyId,
    userId
  });

  // Se criada com agendamento programado e lista definida
  if (campaign.status === "PROGRAMADA" && campaign.contactListId) {
    await enqueueCampaign(campaign);
  }

  await campaign.reload({
    include: ["contactList", "whatsapp", "shipping"]
  });

  return campaign;
};

export default CreateCampaignService;
