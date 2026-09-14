import { Request, Response } from "express";
import { health, ready } from "../../../controllers/HealthController";
import sequelize from "../../../database";
import * as redisStoreModule from "../../../libs/redisStore";

jest.mock("../../../database", () => ({
  authenticate: jest.fn()
}));

jest.mock("../../../libs/redisStore", () => ({
  getRedisClient: jest.fn()
}));

describe("Health & Readiness Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockReq = {};
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("GET /health (Liveness)", () => {
    it("should return 200 OK with process metrics, memory and uptime", async () => {
      await health(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ok",
          uptime: expect.any(Number),
          timestamp: expect.any(String),
          process: expect.objectContaining({
            pid: expect.any(Number),
            nodeVersion: expect.any(String),
            memoryUsage: expect.objectContaining({
              rss: expect.any(String),
              heapUsed: expect.any(String)
            })
          })
        })
      );
    });
  });

  describe("GET /ready (Readiness)", () => {
    it("should return 200 ok when DB is connected and Redis is not configured", async () => {
      delete process.env.REDIS_URL;
      (sequelize.authenticate as jest.Mock).mockResolvedValueOnce(undefined);

      await ready(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ok",
          checks: {
            database: "ok",
            redis: "not_configured"
          }
        })
      );
    });

    it("should return 200 ok when DB and Redis are both connected", async () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      (sequelize.authenticate as jest.Mock).mockResolvedValueOnce(undefined);
      (redisStoreModule.getRedisClient as jest.Mock).mockReturnValueOnce({
        ping: jest.fn().mockResolvedValueOnce("PONG")
      });

      await ready(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ok",
          checks: {
            database: "ok",
            redis: "ok"
          }
        })
      );
    });

    it("should return 503 error when database authentication fails", async () => {
      (sequelize.authenticate as jest.Mock).mockRejectedValueOnce(
        new Error("Connection refused")
      );

      await ready(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          checks: expect.objectContaining({
            database: "error"
          })
        })
      );
    });

    it("should return 503 error when Redis ping fails", async () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      (sequelize.authenticate as jest.Mock).mockResolvedValueOnce(undefined);
      (redisStoreModule.getRedisClient as jest.Mock).mockReturnValueOnce({
        ping: jest.fn().mockRejectedValueOnce(new Error("Redis connection dropped"))
      });

      await ready(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          checks: expect.objectContaining({
            redis: "error"
          })
        })
      );
    });
  });
});
