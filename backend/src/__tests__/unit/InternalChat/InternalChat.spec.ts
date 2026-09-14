import AppError from "../../../errors/AppError";
import InternalMessage from "../../../models/InternalMessage";
import User from "../../../models/User";
import CreateInternalMessageService from "../../../services/InternalChatServices/CreateInternalMessageService";
import ListInternalMessagesService from "../../../services/InternalChatServices/ListInternalMessagesService";
import MarkInternalMessagesAsReadService from "../../../services/InternalChatServices/MarkInternalMessagesAsReadService";
import ListInternalChatUsersService from "../../../services/InternalChatServices/ListInternalChatUsersService";

jest.mock("../../../models/InternalMessage");
jest.mock("../../../models/User");

const mockEmit = jest.fn();
jest.mock("../../../libs/socket", () => ({
  getIO: () => ({
    to: () => ({
      emit: mockEmit
    })
  })
}));

describe("Internal Chat Service", () => {
  const TENANT_A = 1;
  const TENANT_B = 2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("CreateInternalMessageService", () => {
    it("should successfully send an internal message to a colleague in the same tenant", async () => {
      (User.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 1 && where.companyId === TENANT_A) {
          return Promise.resolve({ id: 1, name: "Sender", companyId: TENANT_A });
        }
        if (where.id === 2 && where.companyId === TENANT_A) {
          return Promise.resolve({ id: 2, name: "Receiver", companyId: TENANT_A });
        }
        return Promise.resolve(null);
      });

      const mockCreated = {
        id: "internal-msg-uuid-1",
        senderId: 1,
        receiverId: 2,
        text: "Oi, você pode verificar o ticket 42?",
        companyId: TENANT_A,
        read: false,
        sender: { id: 1, name: "Sender", email: "sender@test.com" }
      };
      (InternalMessage.create as jest.Mock).mockResolvedValue(mockCreated);
      (InternalMessage.findByPk as jest.Mock).mockResolvedValue(mockCreated);

      const result = await CreateInternalMessageService({
        senderId: 1,
        receiverId: 2,
        text: "Oi, você pode verificar o ticket 42?",
        companyId: TENANT_A
      });

      expect(User.findOne).toHaveBeenCalledWith({
        where: { id: 1, companyId: TENANT_A }
      });
      expect(User.findOne).toHaveBeenCalledWith({
        where: { id: 2, companyId: TENANT_A }
      });
      expect(InternalMessage.create).toHaveBeenCalledWith({
        senderId: 1,
        receiverId: 2,
        text: "Oi, você pode verificar o ticket 42?",
        companyId: TENANT_A,
        read: false
      });
      expect(mockEmit).toHaveBeenCalledWith(
        `company-${TENANT_A}-internal-chat`,
        expect.objectContaining({ action: "newMessage" })
      );
      expect(result).toBeDefined();
    });

    it("should block sending message to user of another tenant (cross-tenant leakage)", async () => {
      (User.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 1 && where.companyId === TENANT_A) {
          return Promise.resolve({ id: 1, name: "Sender", companyId: TENANT_A });
        }
        return Promise.resolve(null);
      });

      await expect(
        CreateInternalMessageService({
          senderId: 1,
          receiverId: 99,
          text: "Mensagem vazada",
          companyId: TENANT_A
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining("ERR_RECEIVER_USER_NOT_FOUND_IN_TENANT")
      });

      expect(InternalMessage.create).not.toHaveBeenCalled();
    });

    it("should reject sending empty message", async () => {
      await expect(
        CreateInternalMessageService({
          senderId: 1,
          receiverId: 2,
          text: "   ",
          companyId: TENANT_A
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "ERR_INTERNAL_MESSAGE_EMPTY"
      });
    });

    it("should reject sending message to self", async () => {
      await expect(
        CreateInternalMessageService({
          senderId: 1,
          receiverId: 1,
          text: "Falando sozinho",
          companyId: TENANT_A
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "ERR_INTERNAL_MESSAGE_SELF"
      });
    });
  });

  describe("ListInternalMessagesService", () => {
    it("should list chat messages filtered by companyId and between two users", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ id: 2, companyId: TENANT_A });
      (InternalMessage.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [
          { id: "msg-1", text: "Olá", senderId: 1, receiverId: 2, companyId: TENANT_A },
          { id: "msg-2", text: "Olá, tudo bem?", senderId: 2, receiverId: 1, companyId: TENANT_A }
        ],
        count: 2
      });

      const res = await ListInternalMessagesService({
        userId: 1,
        targetUserId: 2,
        companyId: TENANT_A,
        pageNumber: "1"
      });

      expect(res.messages).toHaveLength(2);
      expect(res.count).toBe(2);
      expect(InternalMessage.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: TENANT_A
          })
        })
      );
    });

    it("should reject listing messages if target user is from another company", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        ListInternalMessagesService({
          userId: 1,
          targetUserId: 99,
          companyId: TENANT_A,
          pageNumber: "1"
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "ERR_NO_USER_FOUND"
      });
    });
  });

  describe("MarkInternalMessagesAsReadService", () => {
    it("should mark incoming messages as read", async () => {
      (InternalMessage.update as jest.Mock).mockResolvedValue([3]);

      await MarkInternalMessagesAsReadService({
        currentUserId: 1,
        targetUserId: 2,
        companyId: TENANT_A
      });

      expect(InternalMessage.update).toHaveBeenCalledWith(
        { read: true },
        {
          where: {
            senderId: 2,
            receiverId: 1,
            companyId: TENANT_A,
            read: false
          }
        }
      );
    });
  });

  describe("ListInternalChatUsersService", () => {
    it("should list active colleagues in the same company excluding the requester", async () => {
      const mockColleagues = [
        { id: 2, name: "Colega 2", email: "c2@test.com", profile: "agent" },
        { id: 3, name: "Colega 3", email: "c3@test.com", profile: "manager" }
      ];
      (User.findAll as jest.Mock).mockResolvedValue(mockColleagues);
      (InternalMessage.count as jest.Mock).mockResolvedValue(0);
      (InternalMessage.findOne as jest.Mock).mockResolvedValue(null);

      const list = await ListInternalChatUsersService({
        currentUserId: 1,
        companyId: TENANT_A
      });

      expect(User.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: TENANT_A
          })
        })
      );
      expect(list).toHaveLength(2);
    });
  });
});
