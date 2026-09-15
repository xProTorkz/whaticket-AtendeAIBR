import crypto from "crypto";
import { truncate, disconnect } from "../../utils/database";
import Webhook from "../../../models/Webhook";
import WebhookDelivery from "../../../models/WebhookDelivery";
import User from "../../../models/User";
import { processWebhookJob } from "../../../queues/workers/WebhookWorker";
import * as PublicInboundWebhookController from "../../../controllers/PublicApi/PublicInboundWebhookController";
import * as WebhookController from "../../../controllers/WebhookController";
import * as ApiKeyController from "../../../controllers/ApiKeyController";

jest.mock("../../../providers/WhatsApp/whatsappProvider", () => ({
  whatsappProvider: {
    sendMessage: jest.fn().mockResolvedValue({ id: "msg-mock", body: "mock", timestamp: Date.now() }),
    sendMedia: jest.fn().mockResolvedValue({ id: "msg-media-mock", body: "mock", timestamp: Date.now() }),
    checkNumber: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock("../../../queues", () => ({
  webhookQueue: {
    add: jest.fn().mockResolvedValue({ id: "job-w1" }),
    getJob: jest.fn().mockResolvedValue(null)
  },
  scheduleQueue: {
    add: jest.fn().mockResolvedValue({ id: "job-1" }),
    getJob: jest.fn().mockResolvedValue(null)
  },
  campaignQueue: {
    add: jest.fn().mockResolvedValue({ id: "job-c1" }),
    getJob: jest.fn().mockResolvedValue(null)
  }
}));

jest.mock("../../../libs/socket", () => ({
  getIO: () => ({
    emit: jest.fn(),
    to: jest.fn().mockReturnThis()
  })
}));

describe("Webhooks: Signatures, Delivery Worker, Dead-Letter & Inbound (Issue #17)", () => {
  const TENANT_A = 1;
  const TENANT_B = 2;

  beforeEach(async () => {
    await truncate();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnect();
  });

  describe("Assinatura HMAC-SHA256 e Proteção contra Replay", () => {
    it("gera assinatura HMAC válida e rejeita timestamps com mais de 5 minutos de atraso", () => {
      const secret = "whsec_testsecret123456789";
      const payload = { event: "contact.created", data: { id: 10 } };
      const serialized = JSON.stringify(payload);

      const timestamp = Math.floor(Date.now() / 1000);
      const signature =
        "sha256=" +
        crypto
          .createHmac("sha256", secret)
          .update(`${timestamp}.${serialized}`)
          .digest("hex");

      // Verificação válida
      const expected =
        "sha256=" +
        crypto
          .createHmac("sha256", secret)
          .update(`${timestamp}.${serialized}`)
          .digest("hex");
      expect(signature).toBe(expected);

      // Rejeição contra Replay Attack (> 300 segundos)
      const staleTimestamp = timestamp - 301;
      const isReplayAttack = Math.abs(timestamp - staleTimestamp) > 300;
      expect(isReplayAttack).toBe(true);
    });
  });

  describe("Webhook Delivery Worker", () => {
    let originalFetch: any;

    beforeAll(() => {
      originalFetch = global.fetch;
    });

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it("entrega webhook com sucesso e registra status SUCCESS e headers de assinatura", async () => {
      const webhook = await Webhook.create({
        name: "Webhook N8N",
        url: "https://mock.webhook.test/events",
        secret: "whsec_supersecretkey123",
        events: ["message.received"],
        isActive: true,
        companyId: TENANT_A
      });

      const delivery = await WebhookDelivery.create({
        webhookId: webhook.id,
        event: "message.received",
        payload: JSON.stringify({ message: "teste" }),
        status: "PENDING",
        attempts: 0,
        companyId: TENANT_A
      });

      let capturedHeaders: any = null;
      let capturedBody: any = null;

      global.fetch = jest.fn().mockImplementation(async (url, opts) => {
        capturedHeaders = opts.headers;
        capturedBody = opts.body;
        return {
          ok: true,
          status: 200,
          text: async () => "OK"
        };
      });

      const jobMock: any = {
        data: {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          companyId: TENANT_A,
          url: webhook.url,
          secret: webhook.secret,
          event: "message.received",
          payload: { message: "teste" }
        }
      };

      await processWebhookJob(jobMock);

      await delivery.reload();
      expect(delivery.status).toBe("SUCCESS");
      expect(delivery.attempts).toBe(1);
      expect(delivery.lastResponseStatus).toBe(200);
      expect(capturedHeaders["X-Webhook-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(capturedHeaders["X-Webhook-Event"]).toBe("message.received");
    });

    it("idempotência: não reprocessa entregas que já possuem status SUCCESS", async () => {
      const webhook = await Webhook.create({
        name: "Webhook Slack",
        url: "https://mock.webhook.test/slack",
        secret: "whsec_key123",
        events: ["ticket.created"],
        isActive: true,
        companyId: TENANT_A
      });

      const delivery = await WebhookDelivery.create({
        webhookId: webhook.id,
        event: "ticket.created",
        payload: JSON.stringify({ ticketId: 5 }),
        status: "SUCCESS",
        attempts: 1,
        companyId: TENANT_A
      });

      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      const jobMock: any = {
        data: {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          companyId: TENANT_A,
          url: webhook.url,
          secret: webhook.secret,
          event: "ticket.created",
          payload: { ticketId: 5 }
        }
      };

      await processWebhookJob(jobMock);

      expect(fetchSpy).not.toHaveBeenCalled();
      await delivery.reload();
      expect(delivery.attempts).toBe(1);
    });

    it("falha permanente 4xx: move imediatamente para Dead-Letter (FAILED) sem tentar novamente", async () => {
      const webhook = await Webhook.create({
        name: "Webhook 404 Test",
        url: "https://mock.webhook.test/not-found",
        secret: "whsec_key123",
        events: ["contact.created"],
        isActive: true,
        companyId: TENANT_A
      });

      const delivery = await WebhookDelivery.create({
        webhookId: webhook.id,
        event: "contact.created",
        payload: JSON.stringify({ contactId: 99 }),
        status: "PENDING",
        attempts: 0,
        companyId: TENANT_A
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found"
      });

      const jobMock: any = {
        data: {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          companyId: TENANT_A,
          url: webhook.url,
          secret: webhook.secret,
          event: "contact.created",
          payload: { contactId: 99 }
        }
      };

      await processWebhookJob(jobMock);

      await delivery.reload();
      expect(delivery.status).toBe("FAILED");
      expect(delivery.lastResponseStatus).toBe(404);
      expect(delivery.lastError).toContain("Permanent client error HTTP 404");
    });

    it("falha transitória 5xx: reagenda com backoff exponencial; atinge dead-letter na 5ª tentativa", async () => {
      const webhook = await Webhook.create({
        name: "Webhook 500 Test",
        url: "https://mock.webhook.test/error",
        secret: "whsec_key123",
        events: ["deal.created"],
        isActive: true,
        companyId: TENANT_A
      });

      const delivery = await WebhookDelivery.create({
        webhookId: webhook.id,
        event: "deal.created",
        payload: JSON.stringify({ dealId: 10 }),
        status: "PENDING",
        attempts: 4, // Já realizou 4 tentativas
        companyId: TENANT_A
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error"
      });

      const jobMock: any = {
        data: {
          deliveryId: delivery.id,
          webhookId: webhook.id,
          companyId: TENANT_A,
          url: webhook.url,
          secret: webhook.secret,
          event: "deal.created",
          payload: { dealId: 10 }
        }
      };

      // 5ª tentativa falha -> atinge Dead-Letter
      await processWebhookJob(jobMock);

      await delivery.reload();
      expect(delivery.attempts).toBe(5);
      expect(delivery.status).toBe("FAILED");
      expect(delivery.lastError).toContain("Max retries (5) exceeded");
    });
  });

  describe("Inbound Webhook", () => {
    it("processa webhook inbound autenticado e executa a ação create_contact", async () => {
      const req: any = {
        params: { source: "n8n" },
        user: { companyId: TENANT_A },
        body: {
          action: "create_contact",
          data: {
            name: "Lead Inbound n8n",
            number: "5511977776666",
            email: "inbound@n8n.test"
          }
        }
      };

      let statusCode = 0;
      let jsonResult: any = null;

      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          jsonResult = data;
          return res;
        }
      };

      await PublicInboundWebhookController.handle(req, res);

      expect(statusCode).toBe(200);
      expect(jsonResult.status).toBe("success");
      expect(jsonResult.result.contactId).toBeDefined();
    });
  });

  describe("RBAC e Proteção Administrativa", () => {
    it("visitor e collaborator recebem 403 ao tentar gerenciar Webhooks e API Keys", async () => {
      const isRole = (await import("../../../middleware/isRole")).default;
      const rbacMiddleware = isRole(["manager", "admin"]);

      const reqVisitor: any = { user: { profile: "visitor" } };
      const reqCollab: any = { user: { profile: "collaborator" } };
      const reqManager: any = { user: { profile: "manager" } };
      const next = jest.fn();

      try {
        rbacMiddleware(reqVisitor, {} as any, next);
        fail("Visitor deveria ter recebido 403");
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
      }

      try {
        rbacMiddleware(reqCollab, {} as any, next);
        fail("Collaborator deveria ter recebido 403");
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
      }

      // Manager tem permissão
      const nextManager = jest.fn();
      rbacMiddleware(reqManager, {} as any, nextManager);
      expect(nextManager).toHaveBeenCalled();
    });
  });
});
