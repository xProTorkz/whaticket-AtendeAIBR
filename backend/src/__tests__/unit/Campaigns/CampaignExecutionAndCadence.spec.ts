import { truncate, disconnect } from "../../utils/database";
import Campaign from "../../../models/Campaign";
import CampaignShipping from "../../../models/CampaignShipping";
import CampaignSetting from "../../../models/CampaignSetting";
import ContactList from "../../../models/ContactList";
import ContactListItem from "../../../models/ContactListItem";
import Contact from "../../../models/Contact";
import User from "../../../models/User";
import Whatsapp from "../../../models/Whatsapp";
import CreateCampaignService from "../../../services/CampaignServices/CreateCampaignService";
import ShowCampaignService from "../../../services/CampaignServices/ShowCampaignService";
import StartCampaignService from "../../../services/CampaignServices/StartCampaignService";
import PauseCampaignService from "../../../services/CampaignServices/PauseCampaignService";
import CancelCampaignService from "../../../services/CampaignServices/CancelCampaignService";
import RestartCampaignService from "../../../services/CampaignServices/RestartCampaignService";
import { processCampaignJob, interpolateVariables } from "../../../queues/workers/CampaignWorker";
import { channelManager } from "../../../channels/ChannelManager";
import { store as storeCampaign } from "../../../controllers/CampaignController";

jest.mock("../../../providers/WhatsApp/whatsappProvider", () => ({
  whatsappProvider: {
    sendMessage: jest.fn().mockResolvedValue({ id: "msg-mock", body: "mock", timestamp: Date.now() }),
    sendMedia: jest.fn().mockResolvedValue({ id: "msg-media-mock", body: "mock", timestamp: Date.now() }),
    checkNumber: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock("../../../queues", () => ({
  enqueueCampaign: jest.fn().mockResolvedValue(undefined),
  cancelCampaignJobs: jest.fn().mockResolvedValue(undefined),
  campaignQueue: {
    add: jest.fn().mockResolvedValue({ id: "job-c1" }),
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

describe("Campaign Execution, Workers and Cadence (Issue #16)", () => {
  const TENANT_A = 1;
  const TENANT_B = 2;

  let userA: User;
  let whatsappA: Whatsapp;
  let contactListA: ContactList;
  let item1: ContactListItem;
  let item2: ContactListItem;
  let optOutItem: ContactListItem;

  beforeEach(async () => {
    await truncate();
    jest.clearAllMocks();

    userA = await User.create({
      name: "Campaign Manager",
      email: "manager@empresa-a.com",
      passwordHash: "hash123",
      profile: "manager",
      companyId: TENANT_A
    });

    whatsappA = await Whatsapp.create({
      name: "WhatsApp Conexao 1",
      status: "CONNECTED",
      isDefault: true,
      companyId: TENANT_A
    });

    contactListA = await ContactList.create({
      name: "Lista Black Friday",
      companyId: TENANT_A
    });

    item1 = await ContactListItem.create({
      name: "Carlos Silva",
      number: "5511988880001",
      email: "carlos@test.com",
      contactListId: contactListA.id,
      companyId: TENANT_A,
      isWhatsappValid: true,
      optOut: false
    });

    item2 = await ContactListItem.create({
      name: "Mariana Souza",
      number: "5511988880002",
      email: "mariana@test.com",
      contactListId: contactListA.id,
      companyId: TENANT_A,
      isWhatsappValid: true,
      optOut: false
    });

    optOutItem = await ContactListItem.create({
      name: "Cliente Com Optout",
      number: "5511988880003",
      email: "optout@test.com",
      contactListId: contactListA.id,
      companyId: TENANT_A,
      isWhatsappValid: true,
      optOut: true
    });
  });

  afterAll(async () => {
    await disconnect();
  });

  it("deve interpolar variáveis dinâmicas no texto da mensagem", () => {
    const rawTemplate = "Olá {nome}, confirmamos seu número {numero} e cupom {cupom}!";
    const customVars = [{ key: "cupom", value: "PROMO2026" }];

    const interpolated = interpolateVariables(rawTemplate, item1, customVars);

    expect(interpolated).toBe(
      "Olá Carlos Silva, confirmamos seu número 5511988880001 e cupom PROMO2026!"
    );
  });

  it("deve criar campanha com status INATIVA e permitir ciclo de vida programado/em andamento", async () => {
    const campaign = await CreateCampaignService({
      campaignData: {
        name: "Campanha Promocional",
        contactListId: contactListA.id,
        whatsappId: whatsappA.id,
        message1: "Olá {nome}, aproveite nossa promoção exclusiva!"
      },
      companyId: TENANT_A,
      userId: userA.id
    });

    expect(campaign.id).toBeDefined();
    expect(campaign.status).toBe("INATIVA");
    expect(campaign.contactListId).toBe(contactListA.id);

    // Iniciar campanha
    const runningCampaign = await StartCampaignService(campaign.id, TENANT_A);
    expect(runningCampaign.status).toBe("EM_ANDAMENTO");
  });

  it("deve processar job de disparo individual no worker e gravar status delivered com ChannelManager", async () => {
    const campaign = await Campaign.create({
      name: "Disparo Direto",
      contactListId: contactListA.id,
      whatsappId: whatsappA.id,
      message1: "Olá {nome}, seu cupom é {cupom}",
      status: "EM_ANDAMENTO",
      companyId: TENANT_A,
      userId: userA.id
    });

    await CampaignSetting.create({
      companyId: TENANT_A,
      key: "variables",
      value: JSON.stringify([{ key: "cupom", value: "DESCONTO10" }])
    });

    // Janela ampla para permitir execução no teste
    await CampaignSetting.create({
      companyId: TENANT_A,
      key: "operatingWindowStart",
      value: "0"
    });
    await CampaignSetting.create({
      companyId: TENANT_A,
      key: "operatingWindowEnd",
      value: "24"
    });

    const sendTextMessageSpy = jest
      .spyOn(channelManager, "sendTextMessage")
      .mockResolvedValue({
        id: "msg-camp-1",
        body: "Olá Carlos Silva, seu cupom é DESCONTO10",
        fromMe: true,
        channel: "whatsapp",
        timestamp: Date.now()
      });

    const fakeJob: any = {
      id: `campaign-${campaign.id}-item-${item1.id}`,
      data: {
        campaignId: campaign.id,
        contactListItemId: item1.id,
        companyId: TENANT_A
      },
      opts: { attempts: 3 },
      attemptsMade: 0,
      moveToDelayed: jest.fn()
    };

    await processCampaignJob(fakeJob);

    const shipping = await CampaignShipping.findOne({
      where: { campaignId: campaign.id, contactListItemId: item1.id }
    });

    expect(shipping).not.toBeNull();
    expect(shipping?.status).toBe("delivered");
    expect(shipping?.deliveredAt).not.toBeNull();
    expect(shipping?.message).toBe("Olá Carlos Silva, seu cupom é DESCONTO10");
    expect(sendTextMessageSpy).toHaveBeenCalledTimes(1);
  });

  it("idempotência: disparo já entregue não deve ser reenviado pelo worker", async () => {
    const campaign = await Campaign.create({
      name: "Campanha Idempotente",
      contactListId: contactListA.id,
      whatsappId: whatsappA.id,
      message1: "Mensagem Teste",
      status: "EM_ANDAMENTO",
      companyId: TENANT_A
    });

    await CampaignShipping.create({
      campaignId: campaign.id,
      contactListItemId: item1.id,
      companyId: TENANT_A,
      number: item1.number,
      status: "delivered",
      deliveredAt: new Date()
    });

    const sendTextMessageSpy = jest.spyOn(channelManager, "sendTextMessage");

    const fakeJob: any = {
      id: `campaign-${campaign.id}-item-${item1.id}`,
      data: {
        campaignId: campaign.id,
        contactListItemId: item1.id,
        companyId: TENANT_A
      },
      opts: { attempts: 3 },
      attemptsMade: 0
    };

    await processCampaignJob(fakeJob);

    expect(sendTextMessageSpy).not.toHaveBeenCalled();
  });

  it("proteção de opt-out: contato que solicitou opt-out tem envio suprimido sem bloquear suporte regular", async () => {
    const campaign = await Campaign.create({
      name: "Campanha OptOut Test",
      contactListId: contactListA.id,
      whatsappId: whatsappA.id,
      message1: "Mensagem para contato que pediu optout",
      status: "EM_ANDAMENTO",
      companyId: TENANT_A
    });

    // Janela ampla
    await CampaignSetting.create({
      companyId: TENANT_A,
      key: "operatingWindowStart",
      value: "0"
    });
    await CampaignSetting.create({
      companyId: TENANT_A,
      key: "operatingWindowEnd",
      value: "24"
    });

    const sendTextMessageSpy = jest.spyOn(channelManager, "sendTextMessage");

    const fakeJob: any = {
      id: `campaign-${campaign.id}-item-${optOutItem.id}`,
      data: {
        campaignId: campaign.id,
        contactListItemId: optOutItem.id,
        companyId: TENANT_A
      },
      opts: { attempts: 3 },
      attemptsMade: 0
    };

    await processCampaignJob(fakeJob);

    const shipping = await CampaignShipping.findOne({
      where: { campaignId: campaign.id, contactListItemId: optOutItem.id }
    });

    expect(sendTextMessageSpy).not.toHaveBeenCalled();
    expect(shipping).not.toBeNull();
    expect(shipping?.status).toBe("optout");
    expect(shipping?.error).toContain("opt-out");
  });

  it("controle de estado da campanha: pausar, cancelar e reiniciar", async () => {
    const campaign = await Campaign.create({
      name: "Ciclo de Controle",
      contactListId: contactListA.id,
      whatsappId: whatsappA.id,
      message1: "Msg",
      status: "EM_ANDAMENTO",
      companyId: TENANT_A
    });

    // 1. Pausar
    await PauseCampaignService(campaign.id, TENANT_A);
    await campaign.reload();
    expect(campaign.status).toBe("PAUSADA");

    // Worker pula execução quando PAUSADA
    const sendTextMessageSpy = jest.spyOn(channelManager, "sendTextMessage");
    const fakeJob: any = {
      id: `campaign-${campaign.id}-item-${item2.id}`,
      data: {
        campaignId: campaign.id,
        contactListItemId: item2.id,
        companyId: TENANT_A
      },
      opts: { attempts: 3 },
      attemptsMade: 0
    };
    await processCampaignJob(fakeJob);
    expect(sendTextMessageSpy).not.toHaveBeenCalled();

    // 2. Cancelar
    await CancelCampaignService(campaign.id, TENANT_A);
    await campaign.reload();
    expect(campaign.status).toBe("CANCELADA");

    // 3. Reiniciar
    await RestartCampaignService(campaign.id, TENANT_A);
    await campaign.reload();
    expect(campaign.status).toBe("EM_ANDAMENTO");
  });

  it("isolamento multi-tenant: tenant B não pode acessar dados de campanhas do tenant A", async () => {
    const campaign = await Campaign.create({
      name: "Campanha Confidencial A",
      companyId: TENANT_A
    });

    let tenantErr: any;
    try {
      await ShowCampaignService(campaign.id, TENANT_B);
    } catch (err) {
      tenantErr = err;
    }
    expect(tenantErr).toBeDefined();
    expect(tenantErr.message).toBe("ERR_NO_CAMPAIGN_FOUND");
  });

  it("RBAC: visitor e collaborator recebem 403 ao tentar criar campanha", async () => {
    const mockRes = () => {
      const res: any = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    const reqVisitor: any = {
      body: { name: "Campanha Inválida" },
      user: { id: "1", companyId: TENANT_A, profile: "visitor" }
    };
    let visitorErr: any;
    try {
      await storeCampaign(reqVisitor, mockRes());
    } catch (err) {
      visitorErr = err;
    }
    expect(visitorErr).toBeDefined();
    expect(visitorErr.message).toBe("ERR_NO_PERMISSION");
    expect(visitorErr.statusCode).toBe(403);

    const reqCollab: any = {
      body: { name: "Campanha Inválida" },
      user: { id: "1", companyId: TENANT_A, profile: "collaborator" }
    };
    let collabErr: any;
    try {
      await storeCampaign(reqCollab, mockRes());
    } catch (err) {
      collabErr = err;
    }
    expect(collabErr).toBeDefined();
    expect(collabErr.message).toBe("ERR_NO_PERMISSION");
    expect(collabErr.statusCode).toBe(403);
  });
});
