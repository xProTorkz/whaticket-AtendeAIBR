import AppError from "../../../errors/AppError";
import TicketNote from "../../../models/TicketNote";
import Ticket from "../../../models/Ticket";
import User from "../../../models/User";
import CreateTicketNoteService from "../../../services/TicketNoteServices/CreateTicketNoteService";
import ListTicketNotesService from "../../../services/TicketNoteServices/ListTicketNotesService";
import DeleteTicketNoteService from "../../../services/TicketNoteServices/DeleteTicketNoteService";

jest.mock("../../../models/TicketNote");
jest.mock("../../../models/Ticket");
jest.mock("../../../models/User");

const mockEmit = jest.fn();
jest.mock("../../../libs/socket", () => ({
  getIO: () => ({
    to: () => ({
      to: () => ({
        emit: mockEmit
      }),
      emit: mockEmit
    })
  })
}));

// Mock do provedor WhatsApp para provar que notas internas NUNCA disparam mensagens externas
const mockWbotSendMessage = jest.fn();
jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    sendMessage: mockWbotSendMessage,
    sendMedia: jest.fn()
  }
}));

describe("Ticket Notes Service (Internal Notes)", () => {
  const TENANT_A = 1;
  const TENANT_B = 2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("CreateTicketNoteService", () => {
    it("should successfully create an internal ticket note and emit socket event", async () => {
      const mockTicket = { id: 10, companyId: TENANT_A };
      (Ticket.findOne as jest.Mock).mockResolvedValue(mockTicket);

      const createdNote = {
        id: 1,
        body: "Cliente solicitou desconto especial no plano anual",
        ticketId: 10,
        userId: 5,
        companyId: TENANT_A,
        user: { id: 5, name: "Atendente Teste", email: "teste@atende.ai" }
      };
      (TicketNote.create as jest.Mock).mockResolvedValue(createdNote);
      (TicketNote.findByPk as jest.Mock).mockResolvedValue(createdNote);

      const note = await CreateTicketNoteService({
        body: "Cliente solicitou desconto especial no plano anual",
        ticketId: 10,
        userId: 5,
        companyId: TENANT_A
      });

      expect(Ticket.findOne).toHaveBeenCalledWith({
        where: { id: 10, companyId: TENANT_A }
      });
      expect(TicketNote.create).toHaveBeenCalledWith({
        body: "Cliente solicitou desconto especial no plano anual",
        ticketId: 10,
        userId: 5,
        companyId: TENANT_A
      });
      expect(mockEmit).toHaveBeenCalledWith(
        `company-${TENANT_A}-ticket-note`,
        expect.objectContaining({
          action: "create",
          ticketId: 10
        })
      );
      // Garantir que NENHUMA mensagem externa foi enviada pelo WhatsApp
      expect(mockWbotSendMessage).not.toHaveBeenCalled();
      expect(note).toBeDefined();
    });

    it("should fail to create note if ticket belongs to another company (cross-tenant)", async () => {
      (Ticket.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        CreateTicketNoteService({
          body: "Tentativa indevida",
          ticketId: 10,
          userId: 5,
          companyId: TENANT_B
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "ERR_NO_TICKET_FOUND"
      });

      expect(TicketNote.create).not.toHaveBeenCalled();
    });
  });

  describe("ListTicketNotesService", () => {
    it("should list internal notes isolated by companyId", async () => {
      const mockTicket = { id: 10, companyId: TENANT_A };
      (Ticket.findOne as jest.Mock).mockResolvedValue(mockTicket);

      const mockNotes = [
        { id: 1, body: "Nota 1", ticketId: 10, companyId: TENANT_A },
        { id: 2, body: "Nota 2", ticketId: 10, companyId: TENANT_A }
      ];
      (TicketNote.findAll as jest.Mock).mockResolvedValue(mockNotes);

      const notes = await ListTicketNotesService({
        ticketId: 10,
        companyId: TENANT_A
      });

      expect(Ticket.findOne).toHaveBeenCalledWith({
        where: { id: 10, companyId: TENANT_A }
      });
      expect(TicketNote.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ticketId: 10, companyId: TENANT_A }
        })
      );
      expect(notes).toHaveLength(2);
    });

    it("should block listing notes if user is from another tenant", async () => {
      (Ticket.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        ListTicketNotesService({
          ticketId: 10,
          companyId: TENANT_B
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "ERR_NO_TICKET_FOUND"
      });
    });
  });

  describe("DeleteTicketNoteService", () => {
    it("should allow author to delete their own note", async () => {
      const mockNote = {
        id: 1,
        ticketId: 10,
        userId: 5,
        companyId: TENANT_A,
        destroy: jest.fn().mockResolvedValue(true)
      };
      (TicketNote.findOne as jest.Mock).mockResolvedValue(mockNote);

      await DeleteTicketNoteService({
        noteId: 1,
        ticketId: 10,
        userId: 5,
        userProfile: "agent",
        companyId: TENANT_A
      });

      expect(mockNote.destroy).toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith(
        `company-${TENANT_A}-ticket-note`,
        expect.objectContaining({ action: "delete", noteId: 1, ticketId: 10 })
      );
    });

    it("should allow admin to delete notes created by other users", async () => {
      const mockNote = {
        id: 1,
        ticketId: 10,
        userId: 99,
        companyId: TENANT_A,
        destroy: jest.fn().mockResolvedValue(true)
      };
      (TicketNote.findOne as jest.Mock).mockResolvedValue(mockNote);

      await DeleteTicketNoteService({
        noteId: 1,
        ticketId: 10,
        userId: 1,
        userProfile: "admin",
        companyId: TENANT_A
      });

      expect(mockNote.destroy).toHaveBeenCalled();
    });

    it("should prevent non-admin user from deleting notes of other users", async () => {
      const mockNote = {
        id: 1,
        ticketId: 10,
        userId: 99,
        companyId: TENANT_A,
        destroy: jest.fn()
      };
      (TicketNote.findOne as jest.Mock).mockResolvedValue(mockNote);

      await expect(
        DeleteTicketNoteService({
          noteId: 1,
          ticketId: 10,
          userId: 5,
          userProfile: "agent",
          companyId: TENANT_A
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "ERR_NO_PERMISSION"
      });

      expect(mockNote.destroy).not.toHaveBeenCalled();
    });

    it("should reject deleting note across tenants with 404", async () => {
      (TicketNote.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        DeleteTicketNoteService({
          noteId: 1,
          ticketId: 10,
          userId: 5,
          userProfile: "admin",
          companyId: TENANT_B
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "ERR_NO_NOTE_FOUND"
      });
    });
  });
});
