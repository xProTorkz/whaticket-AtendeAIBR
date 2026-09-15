import { truncate, disconnect } from "../../utils/database";
import Ticket from "../../../models/Ticket";
import Contact from "../../../models/Contact";
import User from "../../../models/User";
import Queue from "../../../models/Queue";
import { index as dashboardIndex } from "../../../controllers/DashboardController";
import { Request, Response } from "express";

describe("Dashboard Real Metrics (Issue #14)", () => {
  beforeEach(async () => {
    await truncate();
  });

  afterAll(async () => {
    await disconnect();
  });

  it("should calculate real avgSupportTime or return null when no closed tickets exist", async () => {
    const contact = await Contact.create({
      name: "Contato Dash",
      number: "5511911112222",
      companyId: 1
    });

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Ticket fechado com duração de 5 minutos (300 segundos)
    await Ticket.create({
      contactId: contact.id,
      status: "closed",
      companyId: 1,
      createdAt: tenMinutesAgo,
      updatedAt: fiveMinutesAgo
    });

    let jsonResult: any = null;
    const mockReq = {
      user: { id: "1", companyId: 1, profile: "admin" },
      query: { days: "7" }
    } as unknown as Request;

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: (data: any) => {
        jsonResult = data;
        return mockRes;
      }
    } as unknown as Response;

    await dashboardIndex(mockReq, mockRes);

    expect(jsonResult).not.toBeNull();
    expect(jsonResult.counters.supportFinished).toBe(1);
    expect(jsonResult.counters.avgSupportTime).toBe(10); // 10 minutos (now - tenMinutesAgo)
    expect(jsonResult.counters.avgWaitTime).toBeNull(); // Sem cálculo fictício
    expect(jsonResult.counters.rating).toBeNull(); // Sem dados de rating fictícios
  });

  it("should return null for avgSupportTime when no tickets are closed in the period", async () => {
    const contact = await Contact.create({
      name: "Contato Aberto",
      number: "5511911113333",
      companyId: 1
    });

    // Apenas ticket aberto
    await Ticket.create({
      contactId: contact.id,
      status: "open",
      companyId: 1
    });

    let jsonResult: any = null;
    const mockReq = {
      user: { id: "1", companyId: 1, profile: "admin" },
      query: { days: "3" }
    } as unknown as Request;

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: (data: any) => {
        jsonResult = data;
        return mockRes;
      }
    } as unknown as Response;

    await dashboardIndex(mockReq, mockRes);

    expect(jsonResult).not.toBeNull();
    expect(jsonResult.counters.supportHappening).toBe(1);
    expect(jsonResult.counters.supportFinished).toBe(0);
    expect(jsonResult.counters.avgSupportTime).toBeNull(); // Sem fechamentos = null
  });

  it("should list attendants with real online calculation", async () => {
    await User.create({
      name: "Atendente Teste",
      email: "atendente@teste.com",
      password: "secretpassword",
      profile: "agent",
      companyId: 1
    });

    let jsonResult: any = null;
    const mockReq = {
      user: { id: "1", companyId: 1, profile: "admin" },
      query: { days: "7" }
    } as unknown as Request;

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: (data: any) => {
        jsonResult = data;
        return mockRes;
      }
    } as unknown as Response;

    await dashboardIndex(mockReq, mockRes);

    expect(jsonResult).not.toBeNull();
    expect(jsonResult.attendants.length).toBeGreaterThan(0);
    const attendant = jsonResult.attendants.find(
      (a: any) => a.email === "atendente@teste.com"
    );
    expect(attendant).toBeDefined();
    // Sem socket conectado no ambiente de teste, deve ser false (não hardcoded true)
    expect(attendant.online).toBe(false);
  });

  it("should calculate real avgWaitTime when tickets have queue entry and start timestamps", async () => {
    const contact = await Contact.create({
      name: "Contato Espera",
      number: "5511911114444",
      companyId: 1
    });

    const now = new Date();
    const twentyMinAgo = new Date(now.getTime() - 20 * 60 * 1000);
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Ticket aguardou 10 minutos (entre -20m e -10m) até ser atendido
    await Ticket.create({
      contactId: contact.id,
      status: "open",
      companyId: 1,
      createdAt: twentyMinAgo,
      queueEnteredAt: twentyMinAgo,
      startedAt: tenMinAgo
    });

    let jsonResult: any = null;
    const mockReq = {
      user: { id: "1", companyId: 1, profile: "admin" },
      query: { days: "7" }
    } as unknown as Request;

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: (data: any) => {
        jsonResult = data;
        return mockRes;
      }
    } as unknown as Response;

    await dashboardIndex(mockReq, mockRes);

    expect(jsonResult).not.toBeNull();
    expect(jsonResult.counters.avgWaitTime).toBe(10); // 10 minutos de espera real
  });

  it("should generate operational metrics by queue and detect SLA breaches", async () => {
    const queueFinanceiro = await Queue.create({
      name: "Financeiro",
      color: "#FF9900",
      sla: 15, // SLA de 15 minutos
      companyId: 1
    });

    const contact1 = await Contact.create({
      name: "Cliente Atrasado",
      number: "5511911115555",
      companyId: 1
    });

    const contact2 = await Contact.create({
      name: "Cliente no Prazo",
      number: "5511911116666",
      companyId: 1
    });

    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 min aguardando (> 15 min SLA)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 min aguardando (< 15 min SLA)

    // Ticket 1: estourou SLA (30 min aguardando)
    await Ticket.create({
      contactId: contact1.id,
      status: "pending",
      companyId: 1,
      queueId: queueFinanceiro.id,
      createdAt: thirtyMinAgo,
      queueEnteredAt: thirtyMinAgo
    });

    // Ticket 2: dentro do SLA (5 min aguardando)
    await Ticket.create({
      contactId: contact2.id,
      status: "pending",
      companyId: 1,
      queueId: queueFinanceiro.id,
      createdAt: fiveMinAgo,
      queueEnteredAt: fiveMinAgo
    });

    let jsonResult: any = null;
    const mockReq = {
      user: { id: "1", companyId: 1, profile: "admin" },
      query: { days: "7" }
    } as unknown as Request;

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: (data: any) => {
        jsonResult = data;
        return mockRes;
      }
    } as unknown as Response;

    await dashboardIndex(mockReq, mockRes);

    expect(jsonResult).not.toBeNull();
    expect(jsonResult.counters.waitingAboveSla).toBe(1);
    expect(Array.isArray(jsonResult.waitingAlertTickets)).toBe(true);
    expect(jsonResult.waitingAlertTickets.length).toBe(1);
    expect(jsonResult.waitingAlertTickets[0].contactName).toBe("Cliente Atrasado");
    expect(jsonResult.waitingAlertTickets[0].slaLimit).toBe(15);
    expect(jsonResult.waitingAlertTickets[0].waitMinutes).toBeGreaterThanOrEqual(29);

    // Verificação das métricas por fila
    expect(Array.isArray(jsonResult.queues)).toBe(true);
    const finQueue = jsonResult.queues.find((q: any) => q.id === queueFinanceiro.id);
    expect(finQueue).toBeDefined();
    expect(finQueue.pending).toBe(2);
    expect(finQueue.aboveSla).toBe(1);
    expect(finQueue.sla).toBe(15);
  });
});
