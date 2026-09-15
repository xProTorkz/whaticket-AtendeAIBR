import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import ApiKey from "../models/ApiKey";

const checkApiScope = (requiredScope: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = (req as any).apiKey as ApiKey;

    if (!apiKey) {
      throw new AppError("ERR_UNAUTHORIZED: Missing API Key context", 401);
    }

    const scopes = apiKey.scopes || [];

    // Wildcard access or explicit scope
    const hasScope =
      scopes.includes("*") ||
      scopes.includes(requiredScope) ||
      scopes.includes(requiredScope.split(":")[0] + ":*");

    if (!hasScope) {
      throw new AppError(
        `ERR_FORBIDDEN_SCOPE: API key does not have required scope '${requiredScope}'`,
        403
      );
    }

    return next();
  };
};

export default checkApiScope;
