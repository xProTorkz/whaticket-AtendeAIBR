import {
  IChannelAdapter,
  ChannelType,
  SendTextMessageParams,
  SendMediaMessageParams,
  ChannelSentMessage
} from "../types/ChannelTypes";
import { whatsappProvider } from "../../providers/WhatsApp/whatsappProvider";
import AppError from "../../errors/AppError";

export class WhatsAppAdapter implements IChannelAdapter {
  readonly channelType: ChannelType = "whatsapp";

  async sendTextMessage(params: SendTextMessageParams): Promise<ChannelSentMessage> {
    const { to, body, ticket, quotedMsgId } = params;

    if (!ticket.whatsappId) {
      throw new AppError("ERR_NO_WHATSAPP_SESSION_ASSOCIATED", 400);
    }

    const providerMessage = await whatsappProvider.sendMessage(
      ticket.whatsappId,
      to,
      body,
      { quotedMessageId: quotedMsgId }
    );

    return {
      id: providerMessage.id,
      body: providerMessage.body || body,
      fromMe: true,
      channel: "whatsapp",
      timestamp: providerMessage.timestamp || Date.now()
    };
  }

  async sendMediaMessage(params: SendMediaMessageParams): Promise<ChannelSentMessage> {
    const { to, media, ticket, body } = params;

    if (!ticket.whatsappId) {
      throw new AppError("ERR_NO_WHATSAPP_SESSION_ASSOCIATED", 400);
    }

    const bufferData = Buffer.isBuffer(media.data)
      ? media.data
      : Buffer.from(String(media.data), "base64");

    const providerMessage = await whatsappProvider.sendMedia(
      ticket.whatsappId,
      to,
      {
        filename: media.filename,
        mimetype: media.mimetype,
        data: bufferData
      },
      { caption: body }
    );

    return {
      id: providerMessage.id,
      body: providerMessage.body || body || "",
      fromMe: true,
      channel: "whatsapp",
      timestamp: providerMessage.timestamp || Date.now()
    };
  }

  async checkContactIdentifier(identifier: string, companyId?: number): Promise<string | boolean> {
    // Para WhatsApp, usa sessionId padrão ou busca validação de número
    try {
      // sessionId 1 como fallback se não especificado
      return await whatsappProvider.checkNumber(1, identifier);
    } catch {
      return identifier;
    }
  }
}
