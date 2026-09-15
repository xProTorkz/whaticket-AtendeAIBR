import { Request, Response, NextFunction } from "express";
import ApiIdempotencyKey from "../models/ApiIdempotencyKey";
import { Op } from "sequelize";

const apiIdempotency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Only apply to mutating requests
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  const rawKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
  if (!rawKey || typeof rawKey !== "string" || rawKey.trim() === "") {
    return next();
  }

  const idempotencyKey = rawKey.trim();
  const companyId = req.user?.companyId;

  if (!companyId) {
    return next();
  }

  try {
    const existing = await ApiIdempotencyKey.findOne({
      where: {
        companyId,
        idempotencyKey,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (existing) {
      res.setHeader("X-Cache-Lookup", "HIT");
      res.setHeader("X-Idempotency-Key", idempotencyKey);
      try {
        const parsed = JSON.parse(existing.responseBody);
        res.status(existing.statusCode).json(parsed);
        return;
      } catch (err) {
        res.status(existing.statusCode).send(existing.responseBody);
        return;
      }
    }

    res.setHeader("X-Cache-Lookup", "MISS");
    res.setHeader("X-Idempotency-Key", idempotencyKey);

    // Intercept response to store result
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let capturedBody: any = null;

    res.json = (body: any): Response => {
      capturedBody = body;
      return originalJson(body);
    };

    res.send = (body: any): Response => {
      if (capturedBody === null) {
        capturedBody = body;
      }
      return originalSend(body);
    };

    res.on("finish", async () => {
      // Save idempotent record on finish for successful or recognized responses
      if (capturedBody !== null && res.statusCode < 500) {
        const bodyStr =
          typeof capturedBody === "string"
            ? capturedBody
            : JSON.stringify(capturedBody);

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        try {
          await ApiIdempotencyKey.create({
            idempotencyKey,
            companyId,
            method: req.method,
            path: req.originalUrl || req.path,
            statusCode: res.statusCode,
            responseBody: bodyStr,
            expiresAt
          });
        } catch (err) {
          // If collision occurred concurrently, ignore
        }
      }
    });

    return next();
  } catch (err) {
    return next(err);
  }
};

export default apiIdempotency;
