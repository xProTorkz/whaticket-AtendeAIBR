let mockRateLimitConfig: any = null;

jest.mock("express-rate-limit", () => {
  return jest.fn().mockImplementation((config: any) => {
    mockRateLimitConfig = config;
    const middleware: any = (req: any, res: any, next: any) => {
      if (req.rateLimitExceeded && config.handler) {
        return config.handler(req, res, next);
      }
      return next();
    };
    middleware.config = config;
    return middleware;
  });
});

import { Request, Response } from "express";
import { authLimiter, generalLimiter } from "../../../middleware/rateLimiter";

describe("Security Hardening & Rate Limiter", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      ip: "127.0.0.1"
    };
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
  });

  describe("authLimiter configuration & handler", () => {
    it("should configure authLimiter with 15-minute window and 20 max attempts", () => {
      expect(authLimiter).toBeDefined();
      const config = (authLimiter as any).config;
      expect(config.windowMs).toBe(15 * 60 * 1000);
      expect(config.max).toBe(20);
      expect(config.standardHeaders).toBe(true);
    });

    it("should respond with HTTP 429 when authLimiter limit is reached", () => {
      const config = (authLimiter as any).config;
      config.handler(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Muitas tentativas")
        })
      );
    });
  });

  describe("generalLimiter configuration & handler", () => {
    it("should configure generalLimiter with 1-minute window and 300 max requests", () => {
      expect(generalLimiter).toBeDefined();
      const config = (generalLimiter as any).config;
      expect(config.windowMs).toBe(1 * 60 * 1000);
      expect(config.max).toBe(300);
      expect(config.standardHeaders).toBe(true);
    });

    it("should respond with HTTP 429 when generalLimiter limit is reached", () => {
      const config = (generalLimiter as any).config;
      config.handler(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Limite de requisições excedido")
        })
      );
    });
  });

  describe("Production JWT Secret Validation", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("should throw a fatal security error in production if JWT_SECRET is default", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "mysecret";
      process.env.JWT_REFRESH_SECRET = "a_very_long_valid_secret_key_32_bytes_long!";

      expect(() => {
        require("../../../config/auth");
      }).toThrow("FATAL DE SEGURANÇA: JWT_SECRET obrigatório em produção");
    });

    it("should throw a fatal security error in production if JWT_SECRET is shorter than 32 chars", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "short_secret_123";
      process.env.JWT_REFRESH_SECRET = "a_very_long_valid_secret_key_32_bytes_long!";

      expect(() => {
        require("../../../config/auth");
      }).toThrow("FATAL DE SEGURANÇA: JWT_SECRET obrigatório em produção");
    });

    it("should throw a fatal security error in production if JWT_REFRESH_SECRET is default", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "a_very_long_valid_secret_key_32_bytes_long!";
      process.env.JWT_REFRESH_SECRET = "myanothersecret";

      expect(() => {
        require("../../../config/auth");
      }).toThrow("FATAL DE SEGURANÇA: JWT_REFRESH_SECRET obrigatório em produção");
    });

    it("should succeed in production when both secrets are strong (>= 32 chars and not default)", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "super_secure_production_secret_key_1234567890!";
      process.env.JWT_REFRESH_SECRET = "super_secure_production_refresh_secret_key_0987654321!";

      expect(() => {
        const authConfig = require("../../../config/auth").default;
        expect(authConfig.secret).toBe("super_secure_production_secret_key_1234567890!");
        expect(authConfig.refreshSecret).toBe("super_secure_production_refresh_secret_key_0987654321!");
      }).not.toThrow();
    });
  });
});
