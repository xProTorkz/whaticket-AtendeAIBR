import express from "express";
import isAuth from "../middleware/isAuth";
import { isAgentOrAbove, isManagerOrAdmin } from "../middleware/isRole";
import * as QuickAnswerController from "../controllers/QuickAnswerController";

const quickAnswerRoutes = express.Router();

quickAnswerRoutes.get(
  "/quickAnswers",
  isAuth,
  isAgentOrAbove,
  QuickAnswerController.index
);

quickAnswerRoutes.get(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  isAgentOrAbove,
  QuickAnswerController.show
);

quickAnswerRoutes.post(
  "/quickAnswers",
  isAuth,
  isManagerOrAdmin,
  QuickAnswerController.store
);

quickAnswerRoutes.put(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  isManagerOrAdmin,
  QuickAnswerController.update
);

quickAnswerRoutes.delete(
  "/quickAnswers/:quickAnswerId",
  isAuth,
  isManagerOrAdmin,
  QuickAnswerController.remove
);

// Aliases para compatibilidade com frontend avançado
quickAnswerRoutes.get(
  "/quick-messages",
  isAuth,
  isAgentOrAbove,
  QuickAnswerController.index
);
quickAnswerRoutes.get(
  "/quick-messages/:id",
  isAuth,
  isAgentOrAbove,
  QuickAnswerController.show
);
quickAnswerRoutes.post(
  "/quick-messages",
  isAuth,
  isManagerOrAdmin,
  QuickAnswerController.store
);
quickAnswerRoutes.put(
  "/quick-messages/:id",
  isAuth,
  isManagerOrAdmin,
  QuickAnswerController.update
);
quickAnswerRoutes.delete(
  "/quick-messages/:id",
  isAuth,
  isManagerOrAdmin,
  QuickAnswerController.remove
);

export default quickAnswerRoutes;
