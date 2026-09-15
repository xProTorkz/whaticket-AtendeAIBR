import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";
import Whatsapp from "../../models/Whatsapp";
import CampaignShipping from "../../models/CampaignShipping";

const ShowCampaignService = async (
  id: string | number,
  companyId: number
): Promise<Campaign> => {
  const campaign = await Campaign.findOne({
    where: { id, companyId },
    include: [
      {
        model: ContactList,
        as: "contactList",
        include: [
          {
            model: ContactListItem,
            as: "contacts"
          }
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"]
      },
      {
        model: CampaignShipping,
        as: "shipping"
      }
    ]
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  return campaign;
};

export default ShowCampaignService;
