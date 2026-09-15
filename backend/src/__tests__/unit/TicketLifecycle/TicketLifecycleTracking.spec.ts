import { truncate, disconnect } from "../../utils/database";
import Ticket from "../../../models/Ticket";
import Contact from "../../../models/Contact";
import User from "../../../models/User";
import Queue from "../../../models/Queue";
import Whatsapp from "../../../models/Whatsapp";
import TicketLifecycleEvent from "../../../models/TicketLifecycleEvent";
import UpdateTicketService from "../../../services/TicketServices/UpdateTicketService";
import CreateMessageService from "../../../services/MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../../../services/TicketServices/FindOrCreateTicketService";
import { showLifecycle } from "../../../controllers/TicketController";
import { Request, Response } from "express";

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    sendMessage: jest.fn().mockResolvedValue({}),
    sendMedia: jest.fn().mockResolvedValue({}),
    deleteMessage: jest.fn().mockResolvedValue(true),
    init: jest.fn(),
    close: jest.fn()
  }
}));
jest.mock("../../../helpers/CheckContactOpenTickets", () => jest.fn());
jest.mock("../../../helpers/SetTicketMessagesAsRead", () => jest.fn());

const mockEmit = jest.fn();
const mockSocketObject: any = {
  emit: mockEmit
};
mockSocketObject.to = jest.fn().mockReturnValue(mockSocketObject);

jest.mock("../../../libs/socket", () => ({
  getIO: () => mockSocketObject
}));

describe("Ticket Lifecycle and SLA Tracking (Issue #15)", () => {
  const TENANT_A = 1;
  const TENANT_B = 2;

  beforeEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("should record queue_entered event and queueEnteredAt on inbound ticket creation", async () => {
    const whatsapp = await Whatsapp.create({
      name: "WhatsApp Conexão",
      status: "CONNECTED",
      companyId: TENANT_A
    });

    const contact = await Contact.create({
      name: "Cliente Inbound",
      number: "5511999990001",
      companyId: TENANT_A
    });

    const ticket = await FindOrCreateTicketService(
      contact,
      whatsapp.id,
      1,
      undefined,
      TENANT_A
    );

    expect(ticket).toBeDefined();
    expect(ticket.status).toBe("pending");
    expect(ticket.queueEnteredAt).not.toBeNull();

    const events = await TicketLifecycleEvent.findAll({
      where: { ticketId: ticket.id, companyId: TENANT_A }
    });

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.type === "queue_entered")).toBe(true);
  });

  it("should record assignment, start, first response and close lifecycle events with accurate durations", async () => {
    const contact = await Contact.create({
      name: "Cliente Atendimento",
      number: "5511999990002",
      companyId: TENANT_A
    });

    const user = await User.create({
      name: "Atendente Operacional",
      email: "atendente.ops@teste.com",
      password: "secretpassword",
      profile: "agent",
      companyId: TENANT_A
    });

    const queue = await Queue.create({
      name: "Suporte Técnico",
      color: "#0055FF",
      sla: 20,
      companyId: TENANT_A
    });

    const pastTime = new Date(Date.now() - 300 * 1000); // 5 minutos atrás

    const ticket = await Ticket.create({
      contactId: contact.id,
      status: "pending",
      companyId: TENANT_A,
      queueId: queue.id,
      queueEnteredAt: pastTime,
      createdAt: pastTime
    });

    // 1. Atribuição de atendente
    await UpdateTicketService({
      ticketData: { userId: user.id },
      ticketId: ticket.id,
      companyId: TENANT_A,
      actorUser: { id: user.id, profile: "agent", companyId: TENANT_A }
    });

    let events = await TicketLifecycleEvent.findAll({
      where: { ticketId: ticket.id, type: "assigned" }
    });
    expect(events.length).toBe(1);
    expect(events[0].userId).toBe(user.id);

    // 2. Início do atendimento (pending -> open)
    await UpdateTicketService({
      ticketData: { status: "open" },
      ticketId: ticket.id,
      companyId: TENANT_A,
      actorUser: { id: user.id, profile: "agent", companyId: TENANT_A }
    });

    await ticket.reload();
    expect(ticket.status).toBe("open");
    expect(ticket.startedAt).not.toBeNull();

    const startedEvents = await TicketLifecycleEvent.findAll({
      where: { ticketId: ticket.id, type: "started" }
    });
    expect(startedEvents.length).toBe(1);
    expect(startedEvents[0].waitDurationSeconds).toBeGreaterThanOrEqual(290);

    // 3. Primeira resposta humana
    await CreateMessageService({
      messageData: {
        id: "msg-first-resp-1",
        ticketId: ticket.id,
        body: "Olá, como posso ajudar?",
        fromMe: true,
        read: true,
        companyId: TENANT_A
      },
      companyId: TENANT_A
    });

    await ticket.reload();
    expect(ticket.firstResponseAt).not.toBeNull();

    const firstRespEvents = await TicketLifecycleEvent.findAll({
      where: { ticketId: ticket.id, type: "first_response" }
    });
    expect(firstRespEvents.length).toBe(1);

    // 4. Encerramento do atendimento (open -> closed)
    await UpdateTicketService({
      ticketData: { status: "closed" },
      ticketId: ticket.id,
      companyId: TENANT_A,
      actorUser: { id: user.id, profile: "agent", companyId: TENANT_A }
    });

    await ticket.reload();
    expect(ticket.status).toBe("closed");
    expect(ticket.closedAt).not.toBeNull();

    const closedEvents = await TicketLifecycleEvent.findAll({
      where: { ticketId: ticket.id, type: "closed" }
    });
    expect(closedEvents.length).toBe(1);
    expect(closedEvents[0].supportDurationSeconds).toBeDefined();

    // 5. Reabertura do atendimento
    await UpdateTicketService({
      ticketData: { status: "pending" },
      ticketId: ticket.id,
      companyId: TENANT_A,
      actorUser: { id: user.id, profile: "agent", companyId: TENANT_A }
    });

    await ticket.reload();
    expect(ticket.status).toBe("pending");
    expect(ticket.closedAt).toBeNull();

    const reopenedEvents = await TicketLifecycleEvent.findAll({
      where: { ticketId: ticket.id, type: "reopened" }
    });
    expect(reopenedEvents.length).toBe(1);
  });

  it("should record queue transfer event and update queueEnteredAt", async () => {
    const contact = await Contact.create({
      name: "Cliente Transfer",
      number: "5511999990003",
      companyId: TENANT_A
    });

    const queue1 = await Queue.create({
      name: "Fila N1",
      color: "#111111",
      sla: 10,
      companyId: TENANT_A
    });

    const queue2 = await Queue.create({
      name: "Fila N2",
      color: "#222222",
      sla: 15,
      companyId: TENANT_A
    });

    const ticket = await Ticket.create({
      contactId: contact.id,
      status: "pending",
      companyId: TENANT_A,
      queueId: queue1.id,
      queueEnteredAt: new Date(Date.now() - 600 * 1000)
    });

    const adminUser = await User.create({
      name: "Admin Queue Transfer",
      email: "admin.qtransfer@teste.com",
      password: "secretpassword",
      profile: "admin",
      companyId: TENANT_A
    });

    await UpdateTicketService({
      ticketData: { queueId: queue2.id },
      ticketId: ticket.id,
      companyId: TENANT_A,
      actorUser: { id: adminUser.id, profile: "admin", companyId: TENANT_A }
    });

    await ticket.reload();
    expect(ticket.queueId).toBe(queue2.id);

    const transferEvents = await TicketLifecycleEvent.findAll({
      where: { ticketId: ticket.id, type: "queue_transferred" }
    });
    expect(transferEvents.length).toBe(1);
    expect(transferEvents[0].previousQueueId).toBe(queue1.id);
    expect(transferEvents[0].queueId).toBe(queue2.id);
  });

  it("should enforce tenant isolation on showLifecycle endpoint", async () => {
    const contactA = await Contact.create({
      name: "Contato Empresa A",
      number: "5511999990004",
      companyId: TENANT_A
    });

    const ticketA = await Ticket.create({
      contactId: contactA.id,
      status: "pending",
      companyId: TENANT_A
    });

    await TicketLifecycleEvent.create({
      ticketId: ticketA.id,
      companyId: TENANT_A,
      type: "queue_entered"
    });

    let jsonResult: any = null;
    let statusCode: number = 200;

    // Tentativa de acesso pelo Tenant B ao ticket do Tenant A
    const mockReqTenantB = {
      params: { ticketId: ticketA.id.toString() },
      user: { id: "2", companyId: TENANT_B, profile: "agent" }
    } as unknown as Request;

    const mockResTenantB = {
      status: jest.fn().mockImplementation((code: number) => {
        statusCode = code;
        return mockResTenantB;
      }),
      json: (data: any) => {
        jsonResult = data;
        return mockResTenantB;
      }
    } as unknown as Response;

    await expect(showLifecycle(mockReqTenantB, mockResTenantB)).rejects.toMatchObject({
      statusCode: 404
    });

    // Acesso pelo Tenant A legítimo
    const mockReqTenantA = {
      params: { ticketId: ticketA.id.toString() },
      user: { id: "1", companyId: TENANT_A, profile: "agent" }
    } as unknown as Request;

    const mockResTenantA = {
      status: jest.fn().mockImplementation((code: number) => {
        statusCode = code;
        return mockResTenantA;
      }),
      json: (data: any) => {
        jsonResult = data;
        return mockResTenantA;
      }
    } as unknown as Response;

    await showLifecycle(mockReqTenantA, mockResTenantA);

    expect(statusCode).toBe(200);
    expect(Array.isArray(jsonResult)).toBe(true);
    expect(jsonResult.length).toBe(1);
    expect(jsonResult[0].ticketId).toBe(ticketA.id);
    expect(jsonResult[0].companyId).toBe(TENANT_A);
  });
});
