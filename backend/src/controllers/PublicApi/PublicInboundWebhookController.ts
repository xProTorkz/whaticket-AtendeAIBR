import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import CreateOrUpdateContactService from "../../services/ContactServices/CreateOrUpdateContactService";
import { dispatchWebhookEvent } from "../../services/WebhookServices/WebhookDispatcher";
import { logger } from "../../utils/logger";

export const handle = async (req: Request, res: Response): Promise<Response> => {
  const { source } = req.params;
  const companyId = req.user.companyId;
  const payload = req.body || {};

  logger.info(
    `[InboundWebhook] Received inbound webhook from source: ${source} for company ${companyId}`
  );

  const { action, data } = payload;

  if (action === "create_contact" && data?.number) {
    const contact = await CreateOrUpdateContactService({
      name: data.name || data.number,
      number: data.number,
      email: data.email,
      isGroup: false,
      companyId
    });

    dispatchWebhookEvent({
      companyId,
      event: "contact.created",
      data: {
        id: contact.id,
        name: contact.name,
        number: contact.number,
        source
      }
    });

    return res.status(200).json({
      status: "success",
      source,
      action,
      result: { contactId: contact.id }
    });
  }

  // Default acknowledgement for custom inbound triggers (e.g. n8n workflow triggers)
  return res.status(200).json({
    status: "received",
    source,
    action: action || "custom_event",
    companyId,
    receivedAt: new Date().toISOString()
  });
};
