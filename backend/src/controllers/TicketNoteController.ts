import { Request, Response } from "express";
import CreateTicketNoteService from "../services/TicketNoteServices/CreateTicketNoteService";
import ListTicketNotesService from "../services/TicketNoteServices/ListTicketNotesService";
import DeleteTicketNoteService from "../services/TicketNoteServices/DeleteTicketNoteService";
import AppError from "../errors/AppError";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body } = req.body;
  const companyId = req.user?.companyId || 1;
  const userId = req.user?.id ? Number(req.user.id) : undefined;

  // Visitantes não podem adicionar notas internas
  if (req.user?.profile === "visitor") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const note = await CreateTicketNoteService({
    body,
    ticketId,
    userId,
    companyId
  });

  return res.status(201).json(note);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const companyId = req.user?.companyId || 1;

  const notes = await ListTicketNotesService({
    ticketId,
    companyId
  });

  return res.status(200).json(notes);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId, noteId } = req.params;
  const companyId = req.user?.companyId || 1;
  const userId = req.user?.id ? Number(req.user.id) : undefined;
  const userProfile = req.user?.profile;
  const isSuperAdmin = Boolean(req.user?.isSuperAdmin);

  await DeleteTicketNoteService({
    noteId,
    ticketId,
    companyId,
    userId,
    userProfile,
    isSuperAdmin
  });

  return res.status(200).json({ message: "Note deleted" });
};
