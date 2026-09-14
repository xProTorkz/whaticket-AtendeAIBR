import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import CreateAuditLogService from "../AuditServices/CreateAuditLogService";

interface Request {
  companyId: string | number;
  confirmCompanyName?: string;
  actorUserId?: number;
}

const DeleteCompanyService = async ({
  companyId,
  confirmCompanyName,
  actorUserId
}: Request): Promise<void> => {
  const parsedId = Number(companyId);

  // 1. Proteção absoluta do tenant padrão inicial
  if (parsedId === 1) {
    throw new AppError(
      "ERR_CANNOT_DELETE_DEFAULT_COMPANY: A Empresa Padrão (id 1) não pode ser excluída.",
      400
    );
  }

  const company = await Company.findByPk(parsedId, {
    include: ["users", "tickets", "contacts"]
  });

  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  // 2. Proteção explícita contra exclusão acidental via confirmação de nome
  if (!confirmCompanyName || confirmCompanyName !== company.name) {
    throw new AppError(
      `ERR_COMPANY_DELETE_CONFIRMATION_REQUIRED: Para excluir a empresa e todos os seus recursos em cascata, envie confirmCompanyName exatamente como '${company.name}'.`,
      400
    );
  }

  // 3. Registro de auditoria antes da operação destrutiva
  await CreateAuditLogService({
    companyId: parsedId,
    userId: actorUserId,
    action: "COMPANY_DELETED",
    entity: "Company",
    entityId: parsedId,
    details: {
      deletedCompanyName: company.name,
      usersCount: company.users?.length || 0,
      ticketsCount: company.tickets?.length || 0,
      contactsCount: company.contacts?.length || 0,
      deletedBy: actorUserId
    }
  });

  // 4. Exclusão em cascata controlada
  await company.destroy();
};

export default DeleteCompanyService;
