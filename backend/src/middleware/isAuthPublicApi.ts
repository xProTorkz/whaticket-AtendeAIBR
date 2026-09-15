import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import AppError from "../errors/AppError";
import ApiKey from "../models/ApiKey";

const isAuthPublicApi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.headers["x-api-key"]) {
    token = req.headers["x-api-key"] as string;
  }

  if (!token) {
    throw new AppError("ERR_API_KEY_MISSING: Missing Authorization header or X-API-Key", 401);
  }

  const keyHash = crypto.createHash("sha256").update(token).digest("hex");

  const apiKey = await ApiKey.findOne({
    where: { keyHash }
  });

  if (!apiKey) {
    throw new AppError("ERR_API_KEY_INVALID: Invalid API key", 401);
  }

  if (apiKey.revokedAt) {
    throw new AppError("ERR_API_KEY_REVOKED: API key has been revoked", 401);
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    throw new AppError("ERR_API_KEY_EXPIRED: API key has expired", 401);
  }

  // Bind tenant strictly from authenticated API Key
  req.user = {
    id: String(apiKey.userId || "api"),
    profile: "admin",
    companyId: apiKey.companyId
  };

  (req as any).apiKey = apiKey;

  // Asynchronously update lastUsedAt without waiting
  apiKey.update({ lastUsedAt: new Date() }).catch(() => {
    // Ignore async update failure
  });

  return next();
};

export default isAuthPublicApi;
