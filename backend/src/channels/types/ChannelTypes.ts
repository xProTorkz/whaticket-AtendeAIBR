import Ticket from "../../models/Ticket";

export type ChannelType = "whatsapp" | "instagram" | "telegram" | "webchat";

export interface SendTextMessageParams {
  to: string;
  body: string;
  ticket: Ticket;
  quotedMsgId?: string;
}

export interface SendMediaMessageParams {
  to: string;
  media: {
    filename: string;
    mimetype: string;
    data: Buffer | string;
  };
  ticket: Ticket;
  body?: string;
}

export interface ChannelSentMessage {
  id: string;
  body: string;
  fromMe: boolean;
  channel: ChannelType;
  timestamp: number;
}

export interface IChannelAdapter {
  readonly channelType: ChannelType;
  sendTextMessage(params: SendTextMessageParams): Promise<ChannelSentMessage>;
  sendMediaMessage(params: SendMediaMessageParams): Promise<ChannelSentMessage>;
  checkContactIdentifier(identifier: string, companyId?: number): Promise<string | boolean>;
}
