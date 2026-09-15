import express from "express";
import isAuth from "../middleware/isAuth";
import * as TicketNoteController from "../controllers/TicketNoteController";

const ticketNoteRoutes = express.Router();

ticketNoteRoutes.get("/tickets/:ticketId/notes", isAuth, TicketNoteController.index);
ticketNoteRoutes.post("/tickets/:ticketId/notes", isAuth, TicketNoteController.store);
ticketNoteRoutes.delete("/tickets/:ticketId/notes/:noteId", isAuth, TicketNoteController.remove);
ticketNoteRoutes.delete("/ticket-notes/:noteId", isAuth, TicketNoteController.removeNoteById);

export default ticketNoteRoutes;
