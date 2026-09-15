import express from "express";
import isAuth from "../middleware/isAuth";
import {
  isCollaboratorOrAbove,
  isAgentOrAbove,
  isManagerOrAdmin
} from "../middleware/isRole";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();

ticketRoutes.get(
  "/tickets",
  isAuth,
  isCollaboratorOrAbove,
  TicketController.index
);

ticketRoutes.get(
  "/tickets/:ticketId",
  isAuth,
  isCollaboratorOrAbove,
  TicketController.show
);

ticketRoutes.get(
  "/tickets/:ticketId/lifecycle",
  isAuth,
  isCollaboratorOrAbove,
  TicketController.showLifecycle
);

ticketRoutes.post(
  "/tickets",
  isAuth,
  isAgentOrAbove,
  TicketController.store
);

ticketRoutes.put(
  "/tickets/:ticketId",
  isAuth,
  isAgentOrAbove,
  TicketController.update
);

ticketRoutes.delete(
  "/tickets/:ticketId",
  isAuth,
  isManagerOrAdmin,
  TicketController.remove
);

export default ticketRoutes;
