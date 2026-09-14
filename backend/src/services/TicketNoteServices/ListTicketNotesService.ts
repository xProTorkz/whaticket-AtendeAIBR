import AppError from "../../errors/AppError";
import TicketNote from "../../models/TicketNote";
import Ticket from "../../models/Ticket";
import User from "../../models/User";

interface Request {
  ticketId: string | number;
  companyId: number;
}

const ListTicketNotesService = async ({
  ticketId,
  companyId
}: Request): Promise<TicketNote[]> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId }
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const notes = await TicketNote.findAll({
    where: {
      ticketId: Number(ticketId),
      companyId
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  return notes;
};

export default ListTicketNotesService;
