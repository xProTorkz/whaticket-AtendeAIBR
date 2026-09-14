import User from "../../models/User";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import UpdateDeletedUserOpenTicketsStatus from "../../helpers/UpdateDeletedUserOpenTicketsStatus";

const DeleteUserService = async (
  id: string | number,
  companyId?: number,
  actorIsSuperAdmin?: boolean
): Promise<void> => {
  const where: any = { id };
  if (companyId) {
    where.companyId = companyId;
  }

  const user = await User.findOne({
    where
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  if (user.isSuperAdmin && !actorIsSuperAdmin) {
    throw new AppError(
      "ERR_CANNOT_DELETE_SUPERADMIN: Apenas outro SuperAdmin pode excluir um usuário SuperAdmin.",
      403
    );
  }

  const userOpenTickets: Ticket[] = await user.$get("tickets", {
    where: { status: "open" }
  });

  if (userOpenTickets.length > 0) {
    UpdateDeletedUserOpenTicketsStatus(userOpenTickets);
  }

  await user.destroy();
};

export default DeleteUserService;
