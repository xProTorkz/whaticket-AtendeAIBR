import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import isRole from "../middleware/isRole";
import uploadConfig from "../config/upload";
import * as ContactListController from "../controllers/ContactListController";
import * as ContactListItemController from "../controllers/ContactListItemController";

const contactListRoutes = Router();
const upload = multer(uploadConfig);

// Contact Lists
contactListRoutes.get(
  "/contact-lists",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  ContactListController.index
);

contactListRoutes.get(
  "/contact-lists/list",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  ContactListController.list
);

contactListRoutes.post(
  "/contact-lists",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ContactListController.store
);

contactListRoutes.get(
  "/contact-lists/:id",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  ContactListController.show
);

contactListRoutes.put(
  "/contact-lists/:id",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ContactListController.update
);

contactListRoutes.delete(
  "/contact-lists/:id",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ContactListController.remove
);

contactListRoutes.post(
  "/contact-lists/:id/upload",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  upload.single("file"),
  ContactListController.upload
);

// Contact List Items
contactListRoutes.get(
  "/contact-list-items",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  ContactListItemController.index
);

contactListRoutes.get(
  "/contact-list-items/list",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  ContactListItemController.list
);

contactListRoutes.post(
  "/contact-list-items",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ContactListItemController.store
);

contactListRoutes.get(
  "/contact-list-items/:id",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  ContactListItemController.show
);

contactListRoutes.put(
  "/contact-list-items/:id",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ContactListItemController.update
);

contactListRoutes.delete(
  "/contact-list-items/:id",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ContactListItemController.remove
);

export default contactListRoutes;
