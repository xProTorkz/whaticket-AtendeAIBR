import express from "express";
import isAuth from "../middleware/isAuth";
import { isCollaboratorOrAbove, isAgentOrAbove, isManagerOrAdmin } from "../middleware/isRole";
import * as TagController from "../controllers/TagController";

const tagRoutes = express.Router();

tagRoutes.get("/tags", isAuth, isCollaboratorOrAbove, TagController.index);
tagRoutes.get("/tags/list", isAuth, isCollaboratorOrAbove, TagController.list);
tagRoutes.get("/tags/kanban", isAuth, isCollaboratorOrAbove, TagController.kanban);
tagRoutes.get("/tags/:tagId", isAuth, isCollaboratorOrAbove, TagController.show);
tagRoutes.post("/tags", isAuth, isAgentOrAbove, TagController.store);
tagRoutes.put("/tags/:tagId", isAuth, isAgentOrAbove, TagController.update);
tagRoutes.delete("/tags/:tagId", isAuth, isManagerOrAdmin, TagController.remove);
tagRoutes.post("/tags/sync", isAuth, isAgentOrAbove, TagController.sync);

// Rotas de Kanban de Tickets
tagRoutes.get("/ticket/kanban", isAuth, isCollaboratorOrAbove, TagController.kanbanTickets);
tagRoutes.get("/tickets/kanban", isAuth, isCollaboratorOrAbove, TagController.kanbanTickets);
tagRoutes.put("/ticket-tags/:ticketId/:tagId", isAuth, isAgentOrAbove, TagController.updateTicketTag);
tagRoutes.delete("/ticket-tags/:ticketId", isAuth, isAgentOrAbove, TagController.removeTicketTag);

export default tagRoutes;
