import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import CreateOrUpdateContactService from "../../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../../services/TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../../services/TicketServices/ShowTicketService";
import SendWhatsAppMessage from "../../services/WbotServices/SendWhatsAppMessage";
import SendWhatsAppMedia from "../../services/WbotServices/SendWhatsAppMedia";
import { dispatchWebhookEvent } from "../../services/WebhookServices/WebhookDispatcher";

export const sendMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user.companyId;

  const schema = Yup.object().shape({
    number: Yup.string()
      .required("ERR_NUMBER_REQUIRED")
      .matches(/^[0-9]+$/, "ERR_INVALID_NUMBER_FORMAT"),
    body: Yup.string().when("media", {
      is: undefined,
      then: Yup.string().required("ERR_BODY_REQUIRED")
    }),
    whatsappId: Yup.number().nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const { number, body, whatsappId } = req.body;
  const medias = req.files as Express.Multer.File[];

  let defaultWhatsapp = null;
  if (whatsappId) {
    // Ensure the requested whatsapp belongs to this tenant
    const Whatsapp = (await import("../../models/Whatsapp")).default;
    defaultWhatsapp = await Whatsapp.findOne({
      where: { id: whatsappId, companyId }
    });
    if (!defaultWhatsapp) {
      throw new AppError("ERR_NO_DEF_WAPP_FOUND", 404);
    }
  } else {
    defaultWhatsapp = await GetDefaultWhatsApp(companyId);
  }

  const contact = await CreateOrUpdateContactService({
    name: number,
    number,
    isGroup: false,
    companyId
  });

  const ticket = await FindOrCreateTicketService(
    contact,
    defaultWhatsapp.id,
    0,
    undefined,
    companyId
  );

  let sentMessageResult: any = null;

  if (medias && medias.length > 0) {
    for (const media of medias) {
      sentMessageResult = await SendWhatsAppMedia({
        media,
        ticket
      });
    }
  } else {
    sentMessageResult = await SendWhatsAppMessage({
      body,
      ticket
    });
  }

  // Trigger outbound webhook event
  dispatchWebhookEvent({
    companyId,
    event: "message.sent",
    data: {
      id: sentMessageResult?.id || ticket.id,
      ticketId: ticket.id,
      contactId: contact.id,
      number: contact.number,
      body: body || medias?.[0]?.originalname,
      fromMe: true,
      timestamp: Math.floor(Date.now() / 1000)
    }
  });

  return res.status(201).json({
    status: "success",
    message: {
      id: sentMessageResult?.id || ticket.id,
      ticketId: ticket.id,
      contactId: contact.id,
      number: contact.number,
      body: body || medias?.[0]?.originalname,
      fromMe: true,
      createdAt: new Date().toISOString()
    }
  });
};
