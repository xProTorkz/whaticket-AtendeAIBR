import AppError from "../../../errors/AppError";
import Contact from "../../../models/Contact";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import Message from "../../../models/Message";
import AuditLog from "../../../models/AuditLog";

import ShowContactService from "../../../services/ContactServices/ShowContactService";
import DeleteContactService from "../../../services/ContactServices/DeleteContactService";
import ShowTicketService from "../../../services/TicketServices/ShowTicketService";
import DeleteTicketService from "../../../services/TicketServices/DeleteTicketService";
import ShowUserService from "../../../services/UserServices/ShowUserService";
import DeleteUserService from "../../../services/UserServices/DeleteUserService";
import ListMessagesService from "../../../services/MessageServices/ListMessagesService";
import DeleteWhatsAppMessage from "../../../services/WbotServices/DeleteWhatsAppMessage";
import CreateAuditLogService from "../../../services/AuditServices/CreateAuditLogService";

jest.mock("../../../models/Contact");
jest.mock("../../../models/Ticket");
jest.mock("../../../models/User");
jest.mock("../../../models/Message");
jest.mock("../../../models/AuditLog");
jest.mock("../../../helpers/UpdateDeletedUserOpenTicketsStatus", () => jest.fn());
jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    deleteMessage: jest.fn().mockResolvedValue(true)
  }
}));

describe("Tenant Data Isolation", () => {
  const TENANT_A = 1;
  const TENANT_B = 2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Contact Isolation", () => {
    it("should allow Tenant A to view its own contact", async () => {
      const mockContact = { id: 101, name: "Cliente A", companyId: TENANT_A };
      (Contact.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 101 && where.companyId === TENANT_A) {
          return Promise.resolve(mockContact);
        }
        return Promise.resolve(null);
      });

      const contact = await ShowContactService(101, TENANT_A);
      expect(contact).toEqual(mockContact);
    });

    it("should block Tenant B from viewing Tenant A's contact (returns 404)", async () => {
      (Contact.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 101 && where.companyId === TENANT_A) {
          return Promise.resolve({ id: 101, companyId: TENANT_A });
        }
        return Promise.resolve(null);
      });

      await expect(ShowContactService(101, TENANT_B)).rejects.toMatchObject({
        message: "ERR_NO_CONTACT_FOUND",
        statusCode: 404
      });
    });

    it("should block Tenant B from deleting Tenant A's contact", async () => {
      (Contact.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 101 && where.companyId === TENANT_A) {
          return Promise.resolve({ id: 101, companyId: TENANT_A, destroy: jest.fn() });
        }
        return Promise.resolve(null);
      });

      await expect(DeleteContactService("101", TENANT_B)).rejects.toMatchObject({
        message: "ERR_NO_CONTACT_FOUND",
        statusCode: 404
      });
    });
  });

  describe("Ticket Isolation", () => {
    it("should allow Tenant A to view its own ticket", async () => {
      const mockTicket = { id: 201, status: "open", companyId: TENANT_A };
      (Ticket.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 201 && where.companyId === TENANT_A) {
          return Promise.resolve(mockTicket);
        }
        return Promise.resolve(null);
      });

      const ticket = await ShowTicketService(201, TENANT_A);
      expect(ticket).toEqual(mockTicket);
    });

    it("should block Tenant B from viewing Tenant A's ticket", async () => {
      (Ticket.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 201 && where.companyId === TENANT_A) {
          return Promise.resolve({ id: 201, companyId: TENANT_A });
        }
        return Promise.resolve(null);
      });

      await expect(ShowTicketService(201, TENANT_B)).rejects.toMatchObject({
        message: "ERR_NO_TICKET_FOUND",
        statusCode: 404
      });
    });

    it("should block Tenant B from deleting Tenant A's ticket", async () => {
      (Ticket.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 201 && where.companyId === TENANT_A) {
          return Promise.resolve({ id: 201, companyId: TENANT_A, destroy: jest.fn() });
        }
        return Promise.resolve(null);
      });

      await expect(DeleteTicketService("201", TENANT_B)).rejects.toMatchObject({
        message: "ERR_NO_TICKET_FOUND",
        statusCode: 404
      });
    });
  });

  describe("User Isolation", () => {
    it("should allow Tenant A to view its own user", async () => {
      const mockUser = { id: 1, name: "Atendente A", companyId: TENANT_A };
      (User.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 1 && where.companyId === TENANT_A) {
          return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
      });

      const user = await ShowUserService(1, TENANT_A);
      expect(user).toEqual(mockUser);
    });

    it("should block Tenant B from viewing Tenant A's user", async () => {
      (User.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 1 && where.companyId === TENANT_A) {
          return Promise.resolve({ id: 1, companyId: TENANT_A });
        }
        return Promise.resolve(null);
      });

      await expect(ShowUserService(1, TENANT_B)).rejects.toMatchObject({
        message: "ERR_NO_USER_FOUND",
        statusCode: 404
      });
    });

    it("should block Tenant B from deleting Tenant A's user", async () => {
      (User.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 1 && where.companyId === TENANT_A) {
          return Promise.resolve({
            id: 1,
            companyId: TENANT_A,
            destroy: jest.fn(),
            $get: jest.fn().mockResolvedValue([])
          });
        }
        return Promise.resolve(null);
      });

      await expect(DeleteUserService(1, TENANT_B)).rejects.toMatchObject({
        message: "ERR_NO_USER_FOUND",
        statusCode: 404
      });
    });
  });

  describe("Message Isolation", () => {
    it("should block Tenant B from listing messages of Tenant A's ticket", async () => {
      (Ticket.findOne as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === "301" && where.companyId === TENANT_A) {
          return Promise.resolve({ id: 301, companyId: TENANT_A });
        }
        return Promise.resolve(null);
      });

      await expect(
        ListMessagesService({ ticketId: "301", companyId: TENANT_B })
      ).rejects.toMatchObject({
        message: "ERR_NO_TICKET_FOUND",
        statusCode: 404
      });
    });

    it("should block Tenant B from deleting Tenant A's WhatsApp message", async () => {
      const mockMessage = {
        id: "msg_123",
        companyId: TENANT_A,
        ticket: {
          whatsappId: 1,
          contact: { number: "5511999999999" },
          isGroup: false
        },
        fromMe: true,
        update: jest.fn()
      };

      (Message.findByPk as jest.Mock).mockResolvedValue(mockMessage);

      await expect(
        DeleteWhatsAppMessage("msg_123", TENANT_B)
      ).rejects.toMatchObject({
        message: "No message found with this ID.",
        statusCode: 404
      });
    });
  });

  describe("Audit Log Isolation", () => {
    it("should record audit logs scoped to the specific companyId", async () => {
      const mockCreatedLog = {
        id: 1,
        companyId: TENANT_B,
        userId: 2,
        action: "delete",
        entity: "Ticket",
        entityId: "201",
        details: JSON.stringify({ reason: "Duplicate" })
      };

      (AuditLog.create as jest.Mock).mockResolvedValue(mockCreatedLog);

      const log = await CreateAuditLogService({
        companyId: TENANT_B,
        userId: 2,
        action: "delete",
        entity: "Ticket",
        entityId: 201,
        details: { reason: "Duplicate" }
      });

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: TENANT_B,
          userId: 2,
          action: "delete",
          entity: "Ticket"
        })
      );
      expect(log).toEqual(mockCreatedLog);
    });
  });
});
