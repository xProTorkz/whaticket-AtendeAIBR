import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import authConfig from "../config/auth";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId?: number;
  isSuperAdmin?: boolean;
  iat: number;
  exp: number;
}

const isAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = verify(token, authConfig.secret);
    const { id, profile, companyId, isSuperAdmin } = decoded as TokenPayload;

    let canonicalProfile = profile;
    let isSuper = Boolean(isSuperAdmin);

    if (canonicalProfile === "superadmin") {
      canonicalProfile = "admin";
      isSuper = true;
    } else if (canonicalProfile === "supervisor") {
      canonicalProfile = "manager";
    } else if (canonicalProfile === "user") {
      canonicalProfile = "agent";
    }

    req.user = {
      id,
      profile: canonicalProfile,
      companyId: Number(companyId || 1),
      isSuperAdmin: isSuper
    };
  } catch (err) {
    throw new AppError(
      "Invalid token. We'll try to assign a new one on next request",
      403
    );
  }

  return next();
};

export default isAuth;
