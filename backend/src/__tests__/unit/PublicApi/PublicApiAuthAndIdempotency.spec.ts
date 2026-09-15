import crypto from "crypto";
import { Request, Response } from "express";
import { truncate, disconnect } from "../../utils/database";
import ApiKey from "../../../models/ApiKey";
import ApiIdempotencyKey from "../../../models/ApiIdempotencyKey";
import Contact from "../../../models/Contact";
import Company from "../../../models/Company";
import isAuthPublicApi from "../../../middleware/isAuthPublicApi";
import checkApiScope from "../../../middleware/checkApiScope";
import apiIdempotency from "../../../middleware/apiIdempotency";
import publicApiRateLimiter from "../../../middleware/publicApiRateLimiter";
import * as PublicContactController from "../../../controllers/PublicApi/PublicContactController";
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

describe("Public API v1: Auth, Scopes, Idempotency & Rate Limit (Issue #17)", () => {
  const TENANT_A = 1;
  const TENANT_B = 2;

  beforeEach(async () => {
    await truncate();
    jest.clearAllMocks();

    await Company.findOrCreate({
      where: { id: TENANT_B },
      defaults: { id: TENANT_B, name: "Empresa B", plan: "default", status: true }
    });
  });

  afterAll(async () => {
    await disconnect();
  });

  const createTestApiKey = async (
    companyId: number,
    scopes: string[],
    options?: { revoked?: boolean; expired?: boolean }
  ) => {
    const rawKey = `atd_live_${crypto.randomBytes(24).toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await ApiKey.create({
      name: `Test Key ${companyId}`,
      keyPrefix,
      keyHash,
      scopes,
      expiresAt: options?.expired ? new Date(Date.now() - 3600000) : null,
      revokedAt: options?.revoked ? new Date() : null,
      companyId
    });

    return { rawKey, apiKey };
  };

  it("autentica com sucesso usando Bearer Token e define o tenant correto", async () => {
    const { rawKey, apiKey } = await createTestApiKey(TENANT_A, ["contacts:read"]);

    const req: any = {
      headers: {
        authorization: `Bearer ${rawKey}`
      }
    };
    const res: any = {};
    const next = jest.fn();

    await isAuthPublicApi(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.companyId).toBe(TENANT_A);
    expect(req.apiKey.id).toBe(apiKey.id);
  });

  it("autentica com sucesso usando header X-API-Key", async () => {
    const { rawKey } = await createTestApiKey(TENANT_B, ["*"]);

    const req: any = {
      headers: {
        "x-api-key": rawKey
      }
    };
    const res: any = {};
    const next = jest.fn();

    await isAuthPublicApi(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.companyId).toBe(TENANT_B);
  });

  it("rejeita chave de API inválida com HTTP 401", async () => {
    const req: any = {
      headers: {
        authorization: "Bearer atd_live_invalidkey1234567890"
      }
    };
    const res: any = {};
    const next = jest.fn();

    try {
      await isAuthPublicApi(req, res, next);
      fail("Deveria ter lançado erro");
    } catch (err: any) {
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain("ERR_API_KEY_INVALID");
    }
  });

  it("rejeita chave de API revogada com HTTP 401", async () => {
    const { rawKey } = await createTestApiKey(TENANT_A, ["*"], { revoked: true });

    const req: any = {
      headers: {
        authorization: `Bearer ${rawKey}`
      }
    };
    const res: any = {};
    const next = jest.fn();

    try {
      await isAuthPublicApi(req, res, next);
      fail("Deveria ter lançado erro");
    } catch (err: any) {
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain("ERR_API_KEY_REVOKED");
    }
  });

  it("rejeita chave de API expirada com HTTP 401", async () => {
    const { rawKey } = await createTestApiKey(TENANT_A, ["*"], { expired: true });

    const req: any = {
      headers: {
        authorization: `Bearer ${rawKey}`
      }
    };
    const res: any = {};
    const next = jest.fn();

    try {
      await isAuthPublicApi(req, res, next);
      fail("Deveria ter lançado erro");
    } catch (err: any) {
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain("ERR_API_KEY_EXPIRED");
    }
  });

  it("validação de escopos: bloqueia acesso a rotas não autorizadas (403)", () => {
    const scopeMiddleware = checkApiScope("messages:send");

    const req: any = {
      apiKey: {
        scopes: ["contacts:read", "contacts:write"]
      }
    };
    const res: any = {};
    const next = jest.fn();

    try {
      scopeMiddleware(req, res, next);
      fail("Deveria ter lançado erro de escopo");
    } catch (err: any) {
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain("ERR_FORBIDDEN_SCOPE");
    }
    expect(next).not.toHaveBeenCalled();
  });

  it("validação de escopos: libera acesso quando possui escopo exato ou wildcard (*)", () => {
    const scopeMiddleware = checkApiScope("messages:send");

    // Teste com escopo exato
    const req1: any = { apiKey: { scopes: ["messages:send"] } };
    const next1 = jest.fn();
    scopeMiddleware(req1, {} as any, next1);
    expect(next1).toHaveBeenCalled();

    // Teste com wildcard
    const req2: any = { apiKey: { scopes: ["*"] } };
    const next2 = jest.fn();
    scopeMiddleware(req2, {} as any, next2);
    expect(next2).toHaveBeenCalled();
  });

  it("isolamento multi-tenant: API Key do Tenant A não acessa contatos do Tenant B", async () => {
    await Contact.create({
      name: "Contato Empresa A",
      number: "5511911110000",
      companyId: TENANT_A,
      isGroup: false
    });

    const contactB = await Contact.create({
      name: "Contato Empresa B",
      number: "5511922220000",
      companyId: TENANT_B,
      isGroup: false
    });

    // Requisição autenticada no Tenant A
    const reqA: any = {
      user: { companyId: TENANT_A },
      query: { searchParam: "" }
    };
    let jsonResultA: any = null;
    const resA: any = {
      json: (data: any) => {
        jsonResultA = data;
        return resA;
      }
    };

    await PublicContactController.index(reqA, resA);
    expect(jsonResultA.contacts.length).toBe(1);
    expect(jsonResultA.contacts[0].name).toBe("Contato Empresa A");

    // Tentativa de ver contato do Tenant B com chave do Tenant A
    const reqShow: any = {
      user: { companyId: TENANT_A },
      params: { id: String(contactB.id) }
    };
    try {
      await PublicContactController.show(reqShow, resA);
      fail("Deveria ter retornado 404 para contato de outro tenant");
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
    }
  });

  it("idempotência: segunda requisição com a mesma Idempotency-Key retorna resposta cacheada (HIT)", async () => {
    const idempotencyKey = "req-uuid-12345";

    // 1. Primeira requisição (MISS)
    let nextCalled1 = false;
    const req1: any = {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey },
      user: { companyId: TENANT_A },
      originalUrl: "/api/v1/contacts"
    };

    const headers1: Record<string, any> = {};
    let statusCode1 = 200;
    let sentBody1: any = null;

    const res1: any = {
      setHeader: (k: string, v: any) => (headers1[k] = v),
      status: (code: number) => {
        statusCode1 = code;
        return res1;
      },
      json: (data: any) => {
        sentBody1 = data;
        return res1;
      },
      send: (data: any) => {
        sentBody1 = data;
        return res1;
      },
      statusCode: 201,
      on: (event: string, cb: Function) => {
        if (event === "finish") {
          // Simula evento de finalização
          setTimeout(cb, 10);
        }
      }
    };

    await apiIdempotency(req1, res1, () => {
      nextCalled1 = true;
      res1.json({ id: 101, name: "Contato Criado", status: "success" });
    });

    expect(nextCalled1).toBe(true);
    expect(headers1["X-Cache-Lookup"]).toBe("MISS");

    // Aguarda persistência assíncrona
    await new Promise((r) => setTimeout(r, 50));

    // Valida que o registro de idempotência foi persistido
    const saved = await ApiIdempotencyKey.findOne({
      where: { companyId: TENANT_A, idempotencyKey }
    });
    expect(saved).not.toBeNull();
    expect(saved?.statusCode).toBe(201);

    // 2. Segunda requisição com a MESMA chave (deve retornar HIT sem chamar o controller)
    let nextCalled2 = false;
    const req2: any = {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey },
      user: { companyId: TENANT_A },
      originalUrl: "/api/v1/contacts"
    };

    const headers2: Record<string, any> = {};
    let statusCode2 = 0;
    let sentBody2: any = null;

    const res2: any = {
      setHeader: (k: string, v: any) => (headers2[k] = v),
      status: (code: number) => {
        statusCode2 = code;
        return res2;
      },
      json: (data: any) => {
        sentBody2 = data;
        return res2;
      }
    };

    await apiIdempotency(req2, res2, () => {
      nextCalled2 = true;
    });

    expect(nextCalled2).toBe(false); // NÃO deve executar o controller novamente
    expect(headers2["X-Cache-Lookup"]).toBe("HIT");
    expect(statusCode2).toBe(201);
    expect(sentBody2.id).toBe(101);
    expect(sentBody2.name).toBe("Contato Criado");
  });

  it("rate limiting: aplica headers X-RateLimit e bloqueia requisições em excesso (HTTP 429)", () => {
    const limiter = publicApiRateLimiter({ max: 3, windowMs: 60000 });

    const req: any = {
      apiKey: { id: 999 },
      ip: "127.0.0.1"
    };

    const makeCall = () => {
      let status = 200;
      let body: any = null;
      let headers: Record<string, any> = {};
      let nextCalled = false;

      const res: any = {
        setHeader: (k: string, v: any) => (headers[k] = v),
        status: (code: number) => {
          status = code;
          return res;
        },
        json: (data: any) => {
          body = data;
          return res;
        }
      };

      limiter(req, res, () => {
        nextCalled = true;
      });

      return { status, body, headers, nextCalled };
    };

    // Chamadas 1, 2 e 3 devem passar
    expect(makeCall().nextCalled).toBe(true);
    expect(makeCall().nextCalled).toBe(true);
    const res3 = makeCall();
    expect(res3.nextCalled).toBe(true);
    expect(res3.headers["X-RateLimit-Remaining"]).toBe(0);

    // 4ª chamada deve retornar 429 Too Many Requests
    const res4 = makeCall();
    expect(res4.nextCalled).toBe(false);
    expect(res4.status).toBe(429);
    expect(res4.body?.error).toBe("TOO_MANY_REQUESTS");
  });

  it("ausência de secrets em listagem de chaves: listagem nunca retorna keyHash ou rawKey", async () => {
    await createTestApiKey(TENANT_A, ["messages:send"]);

    const req: any = {
      user: { companyId: TENANT_A }
    };
    let jsonResult: any = null;
    const res: any = {
      json: (data: any) => {
        jsonResult = data;
        return res;
      }
    };

    await ApiKeyController.index(req, res);

    expect(jsonResult.apiKeys.length).toBe(1);
    const key = jsonResult.apiKeys[0].toJSON();
    expect(key.keyPrefix).toBeDefined();
    expect(key.keyHash).toBeUndefined(); // Nunca deve ser exposto
    expect(key.rawKey).toBeUndefined(); // Nunca deve ser exposto
  });
});
