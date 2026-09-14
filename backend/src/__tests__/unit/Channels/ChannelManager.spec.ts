import { ChannelManager } from "../../../channels/ChannelManager";
import { WhatsAppAdapter } from "../../../channels/adapters/WhatsAppAdapter";
import Ticket from "../../../models/Ticket";

const mockSendMessage = jest.fn();
const mockSendMedia = jest.fn();

jest.mock("../../../providers/WhatsApp/whatsappProvider", () => ({
  whatsappProvider: {
    sendMessage: (...args: any[]) => mockSendMessage(...args),
    sendMedia: (...args: any[]) => mockSendMedia(...args),
    checkNumber: jest.fn().mockResolvedValue(true)
  }
}));

describe("Channel Abstraction & ChannelManager", () => {
  let channelManager: ChannelManager;

  const mockTicket = {
    id: 42,
    whatsappId: 1,
    channel: "whatsapp",
    companyId: 1
  } as unknown as Ticket;

  beforeEach(() => {
    jest.clearAllMocks();
    channelManager = ChannelManager.getInstance();
  });

  it("should maintain a singleton instance", () => {
    const instanceA = ChannelManager.getInstance();
    const instanceB = ChannelManager.getInstance();
    expect(instanceA).toBe(instanceB);
  });

  it("should have WhatsApp adapter registered by default", () => {
    expect(channelManager.hasAdapter("whatsapp")).toBe(true);
    const adapter = channelManager.getAdapter("whatsapp");
    expect(adapter).toBeInstanceOf(WhatsAppAdapter);
  });

  it("should not have mock/unimplemented channels registered (e.g. telegram, instagram)", () => {
    expect(channelManager.hasAdapter("telegram" as any)).toBe(false);
    expect(channelManager.hasAdapter("instagram" as any)).toBe(false);
  });

  it("should route sendTextMessage to the registered WhatsAppAdapter", async () => {
    mockSendMessage.mockResolvedValue({
      id: "wamid-12345",
      timestamp: 1600000000,
      ack: 1
    });

    const result = await channelManager.sendTextMessage("whatsapp", {
      ticket: mockTicket,
      to: "5511999999999",
      body: "Olá, mensagem de teste via ChannelManager",
      quotedMsgId: "quoted-1"
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      1,
      "5511999999999",
      "Olá, mensagem de teste via ChannelManager",
      { quotedMessageId: "quoted-1" }
    );
    expect(result.id).toBe("wamid-12345");
  });

  it("should route sendMediaMessage to WhatsAppAdapter with buffer conversion", async () => {
    mockSendMedia.mockResolvedValue({
      id: "wamid-media-999",
      timestamp: 1600000000,
      ack: 1
    });

    const buffer = Buffer.from("conteudo de teste de midia");
    const result = await channelManager.sendMediaMessage("whatsapp", {
      ticket: mockTicket,
      to: "5511888888888",
      media: {
        filename: "comprovante.pdf",
        mimetype: "application/pdf",
        data: buffer
      },
      body: "Segue comprovante"
    });

    expect(mockSendMedia).toHaveBeenCalledWith(
      1,
      "5511888888888",
      expect.objectContaining({
        filename: "comprovante.pdf",
        mimetype: "application/pdf"
      }),
      { caption: "Segue comprovante" }
    );
    expect(result.id).toBe("wamid-media-999");
  });

  it("should reject message dispatch when channel adapter is not supported", async () => {
    await expect(
      channelManager.sendTextMessage("telegram" as any, {
        ticket: mockTicket,
        to: "123456",
        body: "Teste"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("ERR_CHANNEL_NOT_SUPPORTED")
    });
  });
});
