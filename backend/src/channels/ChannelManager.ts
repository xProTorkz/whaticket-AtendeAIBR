import {
  IChannelAdapter,
  ChannelType,
  SendTextMessageParams,
  SendMediaMessageParams,
  ChannelSentMessage
} from "./types/ChannelTypes";
import { WhatsAppAdapter } from "./adapters/WhatsAppAdapter";
import AppError from "../errors/AppError";

export class ChannelManager {
  private static instance: ChannelManager;
  private adapters: Map<string, IChannelAdapter> = new Map();

  constructor() {
    // Registra o adaptador primário oficial
    this.registerAdapter(new WhatsAppAdapter());
  }

  public static getInstance(): ChannelManager {
    if (!ChannelManager.instance) {
      ChannelManager.instance = new ChannelManager();
    }
    return ChannelManager.instance;
  }

  public registerAdapter(adapter: IChannelAdapter): void {
    this.adapters.set(adapter.channelType.toLowerCase(), adapter);
  }

  public hasAdapter(channel: string): boolean {
    if (!channel) return false;
    return this.adapters.has(channel.toLowerCase());
  }

  public getAdapter(channel: string = "whatsapp"): IChannelAdapter {
    const normalized = (channel || "whatsapp").toLowerCase();
    const adapter = this.adapters.get(normalized);

    if (!adapter) {
      throw new AppError(
        `ERR_CHANNEL_NOT_SUPPORTED: Canal '${channel}' não possui adaptador registrado.`,
        400
      );
    }

    return adapter;
  }

  public async sendTextMessage(
    channel: string = "whatsapp",
    params: SendTextMessageParams
  ): Promise<ChannelSentMessage> {
    const adapter = this.getAdapter(channel);
    return adapter.sendTextMessage(params);
  }

  public async sendMediaMessage(
    channel: string = "whatsapp",
    params: SendMediaMessageParams
  ): Promise<ChannelSentMessage> {
    const adapter = this.getAdapter(channel);
    return adapter.sendMediaMessage(params);
  }

  public listAvailableChannels(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const channelManager = ChannelManager.getInstance();
export default channelManager;
