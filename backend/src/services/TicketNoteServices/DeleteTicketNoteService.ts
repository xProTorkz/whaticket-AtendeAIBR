import AppError from "../../errors/AppError";
import TicketNote from "../../models/TicketNote";
import { getIO } from "../../libs/socket";

interface Request {
  noteId: string | number;
  ticketId: string | number;
  companyId: number;
  userId?: number;
  userProfile?: string;
  isSuperAdmin?: boolean;
}

const DeleteTicketNoteService = async ({
  noteId,
  ticketId,
  companyId,
  userId,
  userProfile,
  isSuperAdmin
}: Request): Promise<void> => {
  const note = await TicketNote.findOne({
    where: {
      id: Number(noteId),
      ticketId: Number(ticketId),
      companyId
    }
  });

  if (!note) {
    throw new AppError("ERR_NO_NOTE_FOUND", 404);
  }

  // Apenas o autor da nota, administradores, gerentes ou superadmins podem excluir a nota
  const isAuthor = note.userId && Number(note.userId) === Number(userId);
  const isAdminOrManager = userProfile === "admin" || userProfile === "manager" || isSuperAdmin;

  if (!isAuthor && !isAdminOrManager) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await note.destroy();

  const io = getIO();
  io.to(`company-${companyId}-ticket-${ticketId}-notes`)
    .to(ticketId.toString())
    .emit(`company-${companyId}-ticket-note`, {
      action: "delete",
      noteId: Number(noteId),
      ticketId: Number(ticketId)
    });
};

export default DeleteTicketNoteService;
