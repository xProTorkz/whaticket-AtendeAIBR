import { Request, Response } from "express";
import sequelize from "../database";
import { getRedisClient } from "../libs/redisStore";
import { logger } from "../utils/logger";

export const health = async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memoryUsage: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      }
    }
  });
};

export const ready = async (req: Request, res: Response): Promise<Response> => {
  const checks: Record<string, string> = {
    database: "pending",
    redis: "pending"
  };

  let isReady = true;

  // 1. Check Database connection
  try {
    await sequelize.authenticate();
    checks.database = "ok";
  } catch (err: any) {
    checks.database = "error";
    isReady = false;
    logger.error({ info: "Health check database error", err: err?.message || err });
  }

  // 2. Check Redis connection
  const redisClient = getRedisClient();
  if (process.env.REDIS_URL) {
    if (redisClient) {
      try {
        const pong = await redisClient.ping();
        checks.redis = pong === "PONG" ? "ok" : "error";
        if (checks.redis === "error") isReady = false;
      } catch (err: any) {
        checks.redis = "error";
        isReady = false;
        logger.error({ info: "Health check redis error", err: err?.message || err });
      }
    } else {
      checks.redis = "connecting";
      isReady = false;
    }
  } else {
    checks.redis = "not_configured";
  }

  const statusCode = isReady ? 200 : 503;

  return res.status(statusCode).json({
    status: isReady ? "ok" : "error",
    checks,
    timestamp: new Date().toISOString()
  });
};
