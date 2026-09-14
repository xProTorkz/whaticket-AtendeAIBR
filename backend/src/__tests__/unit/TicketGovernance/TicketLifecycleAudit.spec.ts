import AppError from "../../../errors/AppError";
import UpdateTicketService from "../../../services/TicketServices/UpdateTicketService";
import ShowTicketService from "../../../services/TicketServices/ShowTicketService";
import CreateAuditLogService from "../../../services/AuditServices/CreateAuditLogService";

jest.mock("../../../services/TicketServices/ShowTicketService");
jest.mock("../../../services/AuditServices/CreateAuditLogService");
jest.mock("../../../helpers/CheckContactOpenTickets", () => jest.fn());
jest.mock("../../../helpers/SetTicketMessagesAsRead", () => jest.fn());

const mockEmit = jest.fn();
jest.mock("../../../libs/socket", () => ({
  getIO: () => ({
    to: () => ({
      to: () => ({
        to: () => ({
          emit: mockEmit
        }),
        emit: mockEmit
      }),
      emit: mockEmit
    })
  })
}));

describe("Ticket Governance & Audit Logging in Lifecycle", () => {
  const TENANT_A = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("RBAC in Ticket Mutation", () => {
    it("should throw 403 when visitor attempts to update ticket", async () => {
      await expect(
        UpdateTicketService({
          ticketData: { status: "closed" },
          ticketId: 10,
          companyId: TENANT_A,
          actorUser: { id: 9, profile: "visitor", companyId: TENANT_A }
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining("ERR_NO_PERMISSION")
      });

      expect(ShowTicketService).not.toHaveBeenCalled();
    });

    it("should throw 403 when collaborator attempts to update ticket", async () => {
      await expect(
        UpdateTicketService({
          ticketData: { queueId: 2 },
          ticketId: 10,
          companyId: TENANT_A,
          actorUser: { id: 8, profile: "collaborator", companyId: TENANT_A }
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining("ERR_NO_PERMISSION")
      });

      expect(ShowTicketService).not.toHaveBeenCalled();
    });

    it("should allow superadmin even if profile is not standard", async () => {
      const mockTicket = {
        id: 10,
        status: "open",
        queueId: 1,
        whatsappId: 1,
        companyId: TENANT_A,
        contact: { id: 100 },
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue(true)
      };
      (ShowTicketService as jest.Mock).mockResolvedValue(mockTicket);

      await UpdateTicketService({
        ticketData: { queueId: 2 },
        ticketId: 10,
        companyId: TENANT_A,
        actorUser: { id: 1, profile: "visitor", isSuperAdmin: true, companyId: TENANT_A }
      });

      expect(mockTicket.update).toHaveBeenCalled();
    });
  });

  describe("Audit Trail for Lifecycle Actions", () => {
    it("should log TICKET_CLOSE when ticket is finalized", async () => {
      const mockTicket = {
        id: 10,
        status: "open",
        queueId: 1,
        whatsappId: 1,
        companyId: TENANT_A,
        contact: { id: 100 },
        update: jest.fn().mockImplementation(async (data) => {
          Object.assign(mockTicket, data);
        }),
        reload: jest.fn().mockResolvedValue(true)
      };
      (ShowTicketService as jest.Mock).mockResolvedValue(mockTicket);

      await UpdateTicketService({
        ticketData: { status: "closed" },
        ticketId: 10,
        companyId: TENANT_A,
        actorUser: { id: 5, profile: "agent", companyId: TENANT_A }
      });

      expect(CreateAuditLogService).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: TENANT_A,
          userId: 5,
          action: "TICKET_CLOSE",
          entity: "Ticket",
          entityId: 10,
          details: { oldStatus: "open", newStatus: "closed" }
        })
      );
    });

    it("should log TICKET_REOPEN when closed ticket is reopened", async () => {
      const mockTicket = {
        id: 10,
        status: "closed",
        queueId: 1,
        whatsappId: 1,
        companyId: TENANT_A,
        contact: { id: 100 },
        update: jest.fn().mockImplementation(async (data) => {
          Object.assign(mockTicket, data);
        }),
        reload: jest.fn().mockResolvedValue(true)
      };
      (ShowTicketService as jest.Mock).mockResolvedValue(mockTicket);

      await UpdateTicketService({
        ticketData: { status: "open" },
        ticketId: 10,
        companyId: TENANT_A,
        actorUser: { id: 5, profile: "agent", companyId: TENANT_A }
      });

      expect(CreateAuditLogService).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: TENANT_A,
          userId: 5,
          action: "TICKET_REOPEN",
          entity: "Ticket",
          entityId: 10,
          details: { oldStatus: "closed", newStatus: "open" }
        })
      );
    });

    it("should log TICKET_USER_ASSIGN when ticket is assigned to another user", async () => {
      const mockTicket = {
        id: 10,
        status: "open",
        queueId: 1,
        whatsappId: 1,
        user: { id: 2 },
        companyId: TENANT_A,
        contact: { id: 100 },
        update: jest.fn().mockImplementation(async (data) => {
          Object.assign(mockTicket, data);
        }),
        reload: jest.fn().mockResolvedValue(true)
      };
      (ShowTicketService as jest.Mock).mockResolvedValue(mockTicket);

      await UpdateTicketService({
        ticketData: { userId: 7 },
        ticketId: 10,
        companyId: TENANT_A,
        actorUser: { id: 2, profile: "manager", companyId: TENANT_A }
      });

      expect(CreateAuditLogService).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: TENANT_A,
          userId: 2,
          action: "TICKET_USER_ASSIGN",
          entity: "Ticket",
          entityId: 10,
          details: { oldUserId: 2, newUserId: 7 }
        })
      );
    });

    it("should log TICKET_QUEUE_CHANGE when queue is changed", async () => {
      const mockTicket = {
        id: 10,
        status: "open",
        queueId: 1,
        whatsappId: 1,
        companyId: TENANT_A,
        contact: { id: 100 },
        update: jest.fn().mockImplementation(async (data) => {
          Object.assign(mockTicket, data);
        }),
        reload: jest.fn().mockResolvedValue(true)
      };
      (ShowTicketService as jest.Mock).mockResolvedValue(mockTicket);

      await UpdateTicketService({
        ticketData: { queueId: 3 },
        ticketId: 10,
        companyId: TENANT_A,
        actorUser: { id: 2, profile: "admin", companyId: TENANT_A }
      });

      expect(CreateAuditLogService).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: TENANT_A,
          userId: 2,
          action: "TICKET_QUEUE_CHANGE",
          entity: "Ticket",
          entityId: 10,
          details: { oldQueueId: 1, newQueueId: 3 }
        })
      );
    });

    it("should log TICKET_TRANSFER_WHATSAPP when connection is transferred", async () => {
      const mockTicket = {
        id: 10,
        status: "open",
        queueId: 1,
        whatsappId: 1,
        companyId: TENANT_A,
        contact: { id: 100 },
        update: jest.fn().mockImplementation(async (data) => {
          Object.assign(mockTicket, data);
        }),
        reload: jest.fn().mockResolvedValue(true)
      };
      (ShowTicketService as jest.Mock).mockResolvedValue(mockTicket);

      await UpdateTicketService({
        ticketData: { whatsappId: 4 },
        ticketId: 10,
        companyId: TENANT_A,
        actorUser: { id: 2, profile: "admin", companyId: TENANT_A }
      });

      expect(CreateAuditLogService).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: TENANT_A,
          userId: 2,
          action: "TICKET_TRANSFER_WHATSAPP",
          entity: "Ticket",
          entityId: 10,
          details: { oldWhatsappId: 1, newWhatsappId: 4 }
        })
      );
    });
  });
});
