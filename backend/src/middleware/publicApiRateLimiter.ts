import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export const publicApiRateLimiter = (options?: {
  max?: number;
  windowMs?: number;
}) => {
  const max = options?.max || 120; // 120 requests
  const windowMs = options?.windowMs || 60 * 1000; // 1 minute

  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = (req as any).apiKey;
    const clientKey = apiKey
      ? `key:${apiKey.id}`
      : `ip:${req.ip || req.connection.remoteAddress || "global"}`;

    const now = Date.now();
    let record = rateLimitStore.get(clientKey);

    if (!record || record.resetAt <= now) {
      record = {
        count: 0,
        resetAt: now + windowMs
      };
      rateLimitStore.set(clientKey, record);
    }

    record.count += 1;

    const remaining = Math.max(0, max - record.count);
    const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetInSeconds);

    if (record.count > max) {
      res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        message: `Taxa limite excedida. Máximo de ${max} requisições a cada ${Math.ceil(
          windowMs / 1000
        )} segundos. Tente novamente em ${resetInSeconds} segundos.`
      });
      return;
    }

    return next();
  };
};

export default publicApiRateLimiter;
