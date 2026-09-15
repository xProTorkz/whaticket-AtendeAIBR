import { Request, Response } from "express";
import CreateTicketNoteService from "../services/TicketNoteServices/CreateTicketNoteService";
import ListTicketNotesService from "../services/TicketNoteServices/ListTicketNotesService";
import DeleteTicketNoteService from "../services/TicketNoteServices/DeleteTicketNoteService";
import AppError from "../errors/AppError";

import TicketNote from "../models/TicketNote";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const body = req.body.body || req.body.note;
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

  return res.status(201).json({
    ...note.toJSON(),
    note: note.body
  });
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const companyId = req.user?.companyId || 1;

  const notes = await ListTicketNotesService({
    ticketId,
    companyId
  });

  return res.status(200).json(
    notes.map(n => ({
      ...n.toJSON(),
      note: n.body
    }))
  );
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

export const removeNoteById = async (req: Request, res: Response): Promise<Response> => {
  const { noteId } = req.params;
  const companyId = req.user?.companyId || 1;
  const userId = req.user?.id ? Number(req.user.id) : undefined;
  const userProfile = req.user?.profile;
  const isSuperAdmin = Boolean(req.user?.isSuperAdmin);

  const note = await TicketNote.findOne({
    where: { id: noteId, companyId }
  });

  if (!note) {
    throw new AppError("ERR_NO_TICKET_NOTE_FOUND", 404);
  }

  await DeleteTicketNoteService({
    noteId,
    ticketId: note.ticketId,
    companyId,
    userId,
    userProfile,
    isSuperAdmin
  });

  return res.status(200).json({ message: "Note deleted" });
};
