import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import isRole from "../middleware/isRole";
import uploadConfig from "../config/upload";
import * as ScheduleController from "../controllers/ScheduleController";

const scheduleRoutes = Router();
const upload = multer(uploadConfig);

scheduleRoutes.get(
  "/schedules",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  ScheduleController.index
);

scheduleRoutes.post(
  "/schedules",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ScheduleController.store
);

scheduleRoutes.get(
  "/schedules/:scheduleId",
  isAuth,
  isRole(["visitor", "collaborator", "agent", "manager", "admin"]),
  ScheduleController.show
);

scheduleRoutes.put(
  "/schedules/:scheduleId",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ScheduleController.update
);

scheduleRoutes.delete(
  "/schedules/:scheduleId",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ScheduleController.remove
);

scheduleRoutes.post(
  "/schedules/:scheduleId/media-upload",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  upload.single("file"),
  ScheduleController.mediaUpload
);

scheduleRoutes.delete(
  "/schedules/:scheduleId/media-upload",
  isAuth,
  isRole(["agent", "manager", "admin"]),
  ScheduleController.deleteMedia
);

export default scheduleRoutes;
