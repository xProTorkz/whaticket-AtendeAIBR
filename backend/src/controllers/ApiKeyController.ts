import { Request, Response } from "express";
import crypto from "crypto";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import ApiKey from "../models/ApiKey";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  const apiKeys = await ApiKey.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]],
    attributes: [
      "id",
      "name",
      "keyPrefix",
      "scopes",
      "expiresAt",
      "revokedAt",
      "lastUsedAt",
      "createdAt",
      "updatedAt"
    ]
  });

  return res.json({ apiKeys });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const userId = req.user.id ? parseInt(req.user.id, 10) : null;

  const schema = Yup.object().shape({
    name: Yup.string().required("ERR_NAME_REQUIRED"),
    scopes: Yup.array().of(Yup.string()).min(1, "ERR_SCOPES_REQUIRED"),
    expiresAt: Yup.date().nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const { assertCanCreateResource, assertHasCapability } = await import("../services/PlanServices/EntitlementService");
  await assertHasCapability(companyId, "apiIntegrations");
  await assertCanCreateResource(companyId, "apiKeys");

  const { name, scopes, expiresAt } = req.body;

  // Generate high-entropy API key: atd_live_<48 hex chars>
  const randomPart = crypto.randomBytes(24).toString("hex");
  const rawKey = `atd_live_${randomPart}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await ApiKey.create({
    name,
    keyPrefix,
    keyHash,
    scopes,
    expiresAt: expiresAt || null,
    companyId,
    userId: isNaN(userId as number) ? null : userId
  });

  // Return the rawKey strictly on creation. It cannot be recovered later.
  return res.status(201).json({
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt
    },
    rawKey
  });
};

export const revoke = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const apiKey = await ApiKey.findOne({
    where: { id, companyId }
  });

  if (!apiKey) {
    throw new AppError("ERR_NO_API_KEY_FOUND", 404);
  }

  apiKey.revokedAt = new Date();
  await apiKey.save();

  return res.json({
    id: apiKey.id,
    revokedAt: apiKey.revokedAt
  });
};

export const rotate = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const userId = req.user.id ? parseInt(req.user.id, 10) : null;
  const { id } = req.params;

  const oldKey = await ApiKey.findOne({
    where: { id, companyId }
  });

  if (!oldKey) {
    throw new AppError("ERR_NO_API_KEY_FOUND", 404);
  }

  // Revoke old key
  oldKey.revokedAt = new Date();
  await oldKey.save();

  // Create new key with same permissions
  const randomPart = crypto.randomBytes(24).toString("hex");
  const rawKey = `atd_live_${randomPart}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const newKey = await ApiKey.create({
    name: `${oldKey.name} (Rotacionada)`,
    keyPrefix,
    keyHash,
    scopes: oldKey.scopes,
    expiresAt: oldKey.expiresAt,
    companyId,
    userId: isNaN(userId as number) ? null : userId
  });

  return res.status(201).json({
    apiKey: {
      id: newKey.id,
      name: newKey.name,
      keyPrefix: newKey.keyPrefix,
      scopes: newKey.scopes,
      expiresAt: newKey.expiresAt,
      createdAt: newKey.createdAt
    },
    rawKey
  });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const apiKey = await ApiKey.findOne({
    where: { id, companyId }
  });

  if (!apiKey) {
    throw new AppError("ERR_NO_API_KEY_FOUND", 404);
  }

  await apiKey.destroy();

  return res.status(200).json({ message: "API Key deleted" });
};
