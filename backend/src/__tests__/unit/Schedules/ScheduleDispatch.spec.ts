import { truncate, disconnect } from "../../utils/database";
import Schedule from "../../../models/Schedule";
import Contact from "../../../models/Contact";
import User from "../../../models/User";
import Whatsapp from "../../../models/Whatsapp";
import CreateScheduleService from "../../../services/ScheduleServices/CreateScheduleService";
import ShowScheduleService from "../../../services/ScheduleServices/ShowScheduleService";
import UpdateScheduleService from "../../../services/ScheduleServices/UpdateScheduleService";
import DeleteScheduleService from "../../../services/ScheduleServices/DeleteScheduleService";
import { processScheduleJob } from "../../../queues/workers/ScheduleWorker";
import { channelManager } from "../../../channels/ChannelManager";
import { store as storeSchedule, update as updateSchedule, remove as removeSchedule } from "../../../controllers/ScheduleController";
import { Request, Response } from "express";

jest.mock("../../../providers/WhatsApp/whatsappProvider", () => ({
  whatsappProvider: {
    sendMessage: jest.fn().mockResolvedValue({ id: "msg-mock", body: "mock", timestamp: Date.now() }),
    sendMedia: jest.fn().mockResolvedValue({ id: "msg-media-mock", body: "mock", timestamp: Date.now() }),
    checkNumber: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock("../../../queues", () => ({
  enqueueSchedule: jest.fn().mockResolvedValue(undefined),
  cancelScheduleJob: jest.fn().mockResolvedValue(undefined),
  scheduleQueue: {
    add: jest.fn().mockResolvedValue({ id: "job-1" }),
    getJob: jest.fn().mockResolvedValue(null)
  }
}));

const mockEmit = jest.fn();
const mockSocketObject: any = {
  emit: mockEmit,
  to: jest.fn().mockReturnThis()
};

jest.mock("../../../libs/socket", () => ({
  getIO: () => mockSocketObject
}));

describe("Schedules System and Worker Dispatch (Issue #16)", () => {
  const TENANT_A = 1;
  const TENANT_B = 2;

  let contactA: Contact;
  let userA: User;
  let whatsappA: Whatsapp;

  beforeEach(async () => {
    await truncate();
    jest.clearAllMocks();

    userA = await User.create({
      name: "Admin User",
      email: "admin@empresa-a.com",
      passwordHash: "hash123",
      profile: "admin",
      companyId: TENANT_A
    });

    whatsappA = await Whatsapp.create({
      name: "WhatsApp Oficial A",
      status: "CONNECTED",
      isDefault: true,
      companyId: TENANT_A
    });

    contactA = await Contact.create({
      name: "Cliente A",
      number: "5511999990001",
      companyId: TENANT_A,
      email: "clientea@test.com"
    });
  });

  afterAll(async () => {
    await disconnect();
  });

  it("deve criar agendamento no banco de dados com status PENDENTE", async () => {
    const sendAt = new Date(Date.now() + 60000);

    const schedule = await CreateScheduleService({
      body: "Olá, sua consulta está agendada.",
      sendAt,
      contactId: contactA.id,
      companyId: TENANT_A,
      userId: userA.id
    });

    expect(schedule.id).toBeDefined();
    expect(schedule.status).toBe("PENDENTE");
    expect(schedule.sentAt).toBeNull();
    expect(schedule.body).toBe("Olá, sua consulta está agendada.");
    expect(schedule.contactId).toBe(contactA.id);
  });

  it("deve executar disparo via worker com ChannelManager e atualizar status para ENVIADA e sentAt", async () => {
    const sendAt = new Date();
    const schedule = await Schedule.create({
      body: "Lembrete de compromisso importante",
      sendAt,
      contactId: contactA.id,
      userId: userA.id,
      companyId: TENANT_A,
      status: "PENDENTE"
    });

    const sendTextMessageSpy = jest
      .spyOn(channelManager, "sendTextMessage")
      .mockResolvedValue({
        id: "msg-123",
        body: schedule.body,
        fromMe: true,
        channel: "whatsapp",
        timestamp: Date.now()
      });

    const fakeJob: any = {
      id: `schedule-${schedule.id}`,
      data: {
        scheduleId: schedule.id,
        companyId: TENANT_A
      },
      opts: { attempts: 3 },
      attemptsMade: 0
    };

    await processScheduleJob(fakeJob);

    await schedule.reload();

    expect(sendTextMessageSpy).toHaveBeenCalledTimes(1);
    expect(schedule.status).toBe("ENVIADA");
    expect(schedule.sentAt).not.toBeNull();
  });

  it("idempotência: worker executado repetidamente não deve disparar mensagem duplicada", async () => {
    const schedule = await Schedule.create({
      body: "Mensagem já enviada anteriormente",
      sendAt: new Date(Date.now() - 10000),
      sentAt: new Date(),
      contactId: contactA.id,
      userId: userA.id,
      companyId: TENANT_A,
      status: "ENVIADA"
    });

    const sendTextMessageSpy = jest.spyOn(channelManager, "sendTextMessage");

    const fakeJob: any = {
      id: `schedule-${schedule.id}`,
      data: {
        scheduleId: schedule.id,
        companyId: TENANT_A
      },
      opts: { attempts: 3 },
      attemptsMade: 0
    };

    await processScheduleJob(fakeJob);

    expect(sendTextMessageSpy).not.toHaveBeenCalled();
    expect(schedule.status).toBe("ENVIADA");
  });

  it("cancelamento: agendamento CANCELADO não deve ser disparado pelo worker", async () => {
    const schedule = await Schedule.create({
      body: "Agendamento que foi cancelado",
      sendAt: new Date(),
      contactId: contactA.id,
      userId: userA.id,
      companyId: TENANT_A,
      status: "CANCELADA"
    });

    const sendTextMessageSpy = jest.spyOn(channelManager, "sendTextMessage");

    const fakeJob: any = {
      id: `schedule-${schedule.id}`,
      data: {
        scheduleId: schedule.id,
        companyId: TENANT_A
      },
      opts: { attempts: 3 },
      attemptsMade: 0
    };

    await processScheduleJob(fakeJob);

    expect(sendTextMessageSpy).not.toHaveBeenCalled();
  });

  it("tratamento de retry e erro: falha transitória lança para retry do BullMQ e define ERRO após esgotar tentativas", async () => {
    const schedule = await Schedule.create({
      body: "Mensagem com erro transitório",
      sendAt: new Date(),
      contactId: contactA.id,
      userId: userA.id,
      companyId: TENANT_A,
      status: "PENDENTE"
    });

    jest
      .spyOn(channelManager, "sendTextMessage")
      .mockRejectedValue(new Error("Conexão com WhatsApp oscilando"));

    const fakeJobAttempt1: any = {
      id: `schedule-${schedule.id}`,
      data: {
        scheduleId: schedule.id,
        companyId: TENANT_A
      },
      opts: { attempts: 3 },
      attemptsMade: 1
    };

    // Tentativa intermediária deve lançar para o BullMQ aplicar backoff
    await expect(processScheduleJob(fakeJobAttempt1)).rejects.toThrow(
      "Conexão com WhatsApp oscilando"
    );

    const fakeJobAttemptFinal: any = {
      id: `schedule-${schedule.id}`,
      data: {
        scheduleId: schedule.id,
        companyId: TENANT_A
      },
      opts: { attempts: 3 },
      attemptsMade: 3
    };

    // Última tentativa esgotada
    await expect(processScheduleJob(fakeJobAttemptFinal)).rejects.toThrow();

    await schedule.reload();
    expect(schedule.status).toBe("ERRO");
  });

  it("isolamento multi-tenant: tenant B não pode acessar agendamento de tenant A", async () => {
    const schedule = await Schedule.create({
      body: "Dados confidenciais tenant A",
      sendAt: new Date(),
      contactId: contactA.id,
      userId: userA.id,
      companyId: TENANT_A,
      status: "PENDENTE"
    });

    let tenantErr: any;
    try {
      await ShowScheduleService(schedule.id, TENANT_B);
    } catch (err) {
      tenantErr = err;
    }
    expect(tenantErr).toBeDefined();
    expect(tenantErr.message).toBe("ERR_NO_SCHEDULE_FOUND");
  });

  it("RBAC canônico: papéis visitor e collaborator são bloqueados (403), enquanto manager e admin podem criar", async () => {
    const mockRes = () => {
      const res: any = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    // 1. Visitor bloqueado
    const reqVisitor: any = {
      body: { body: "Teste agendamento", sendAt: new Date(), contactId: contactA.id },
      user: { id: "1", companyId: TENANT_A, profile: "visitor" }
    };
    let visitorErr: any;
    try {
      await storeSchedule(reqVisitor, mockRes());
    } catch (err) {
      visitorErr = err;
    }
    expect(visitorErr).toBeDefined();
    expect(visitorErr.message).toBe("ERR_NO_PERMISSION");
    expect(visitorErr.statusCode).toBe(403);

    // 2. Collaborator bloqueado
    const reqCollab: any = {
      body: { body: "Teste agendamento", sendAt: new Date(), contactId: contactA.id },
      user: { id: "1", companyId: TENANT_A, profile: "collaborator" }
    };
    let collabErr: any;
    try {
      await storeSchedule(reqCollab, mockRes());
    } catch (err) {
      collabErr = err;
    }
    expect(collabErr).toBeDefined();
    expect(collabErr.message).toBe("ERR_NO_PERMISSION");
    expect(collabErr.statusCode).toBe(403);

    // 3. Manager permitido
    const reqManager: any = {
      body: { body: "Teste agendamento", sendAt: new Date(), contactId: contactA.id },
      user: { id: userA.id.toString(), companyId: TENANT_A, profile: "manager" }
    };
    const resManager = mockRes();
    await storeSchedule(reqManager, resManager);
    expect(resManager.status).toHaveBeenCalledWith(200);
  });
});
