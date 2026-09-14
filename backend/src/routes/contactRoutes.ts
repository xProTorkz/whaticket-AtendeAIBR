import express from "express";
import isAuth from "../middleware/isAuth";
import {
  isCollaboratorOrAbove,
  isAgentOrAbove,
  isManagerOrAdmin
} from "../middleware/isRole";

import * as ContactController from "../controllers/ContactController";
import * as ImportPhoneContactsController from "../controllers/ImportPhoneContactsController";

const contactRoutes = express.Router();

contactRoutes.post(
  "/contacts/import",
  isAuth,
  isManagerOrAdmin,
  ImportPhoneContactsController.store
);

contactRoutes.get(
  "/contacts",
  isAuth,
  isCollaboratorOrAbove,
  ContactController.index
);

contactRoutes.get(
  "/contacts/:contactId",
  isAuth,
  isCollaboratorOrAbove,
  ContactController.show
);

contactRoutes.post(
  "/contacts",
  isAuth,
  isCollaboratorOrAbove,
  ContactController.store
);

contactRoutes.post(
  "/contact",
  isAuth,
  isCollaboratorOrAbove,
  ContactController.getContact
);

contactRoutes.put(
  "/contacts/:contactId",
  isAuth,
  isAgentOrAbove,
  ContactController.update
);

contactRoutes.delete(
  "/contacts/:contactId",
  isAuth,
  isManagerOrAdmin,
  ContactController.remove
);

export default contactRoutes;
