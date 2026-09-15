import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import uploadConfig from "../config/upload";
import AppError from "../errors/AppError";
import Schedule from "../models/Schedule";
import CreateScheduleService from "../services/ScheduleServices/CreateScheduleService";
import ListSchedulesService from "../services/ScheduleServices/ListSchedulesService";
import ShowScheduleService from "../services/ScheduleServices/ShowScheduleService";
import UpdateScheduleService from "../services/ScheduleServices/UpdateScheduleService";
import DeleteScheduleService from "../services/ScheduleServices/DeleteScheduleService";
import { getIO } from "../libs/socket";

type IndexQuery = {
  searchParam?: string;
  contactId?: string | number;
  userId?: string | number;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, userId, pageNumber, searchParam } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { schedules, count, hasMore } = await ListSchedulesService({
    searchParam,
    contactId,
    userId,
    pageNumber,
    companyId
  });

  return res.json({ schedules, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { body, sendAt, contactId } = req.body;
  const { companyId, id: userId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const schedule = await CreateScheduleService({
    body,
    sendAt,
    contactId,
    companyId,
    userId: Number(userId)
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company${companyId}-schedule`, {
      action: "create",
      schedule
    });
  } catch (_) {}

  return res.status(200).json(schedule);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  const schedule = await ShowScheduleService(scheduleId, companyId);

  return res.status(200).json(schedule);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const schedule = await UpdateScheduleService({
    scheduleData: req.body,
    id: scheduleId,
    companyId
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company${companyId}-schedule`, {
      action: "update",
      schedule
    });
  } catch (_) {}

  return res.status(200).json(schedule);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId, profile } = req.user;

  if (profile === "visitor" || profile === "collaborator") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await DeleteScheduleService(scheduleId, companyId);

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company${companyId}-schedule`, {
      action: "delete",
      scheduleId
    });
  } catch (_) {}

  return res.status(200).json({ message: "Schedule deleted" });
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;
  const file = req.file as Express.Multer.File;

  const schedule = await Schedule.findOne({
    where: { id: scheduleId, companyId }
  });

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  await schedule.update({
    mediaPath: file.filename,
    mediaName: file.originalname
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company${companyId}-schedule`, {
      action: "update",
      schedule
    });
  } catch (_) {}

  return res.send({ mensagem: "Arquivo anexado com sucesso" });
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  const schedule = await Schedule.findOne({
    where: { id: scheduleId, companyId }
  });

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  if (schedule.mediaPath) {
    const filePath = path.resolve(uploadConfig.directory, schedule.mediaPath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
    }
  }

  await schedule.update({
    mediaPath: null as any,
    mediaName: null as any
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company${companyId}-schedule`, {
      action: "update",
      schedule
    });
  } catch (_) {}

  return res.send({ mensagem: "Arquivo excluído com sucesso" });
};
