import AuditLog from "../../models/AuditLog";
import { logger } from "../../utils/logger";

interface Request {
  companyId: number;
  userId?: number;
  action: string;
  entity: string;
  entityId?: string | number;
  details?: Record<string, any> | string;
}

const CreateAuditLogService = async ({
  companyId,
  userId,
  action,
  entity,
  entityId,
  details
}: Request): Promise<AuditLog | null> => {
  try {
    const formattedDetails =
      typeof details === "object" ? JSON.stringify(details) : (details || "");

    const auditLog = await AuditLog.create({
      companyId: companyId || 1,
      userId,
      action,
      entity,
      entityId: entityId ? String(entityId) : "",
      details: formattedDetails
    });

    return auditLog;
  } catch (err: any) {
    logger.error({
      info: "Falha ao gravar log de auditoria",
      action,
      entity,
      error: err?.message || err
    });
    return null;
  }
};

export default CreateAuditLogService;
