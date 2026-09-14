import * as Yup from "yup";
import AppError from "../../errors/AppError";
import TicketNote from "../../models/TicketNote";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import { getIO } from "../../libs/socket";

interface Request {
  body: string;
  ticketId: string | number;
  userId?: number;
  companyId: number;
}

const CreateTicketNoteService = async ({
  body,
  ticketId,
  userId,
  companyId
}: Request): Promise<TicketNote> => {
  const schema = Yup.object().shape({
    body: Yup.string().required("Conteúdo da nota é obrigatório").min(1)
  });

  try {
    await schema.validate({ body });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  // Valida pertencimento do ticket ao tenant
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId }
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const note = await TicketNote.create({
    body,
    ticketId: Number(ticketId),
    userId,
    companyId
  });

  const reloadedNote = await TicketNote.findByPk(note.id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"]
      }
    ]
  });

  if (!reloadedNote) {
    return note;
  }

  const io = getIO();
  io.to(`company-${companyId}-ticket-${ticketId}-notes`)
    .to(ticketId.toString())
    .emit(`company-${companyId}-ticket-note`, {
      action: "create",
      note: reloadedNote,
      ticketId: Number(ticketId)
    });

  return reloadedNote;
};

export default CreateTicketNoteService;
