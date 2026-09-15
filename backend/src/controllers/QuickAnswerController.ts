import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListQuickAnswerService from "../services/QuickAnswerService/ListQuickAnswerService";
import CreateQuickAnswerService from "../services/QuickAnswerService/CreateQuickAnswerService";
import ShowQuickAnswerService from "../services/QuickAnswerService/ShowQuickAnswerService";
import UpdateQuickAnswerService from "../services/QuickAnswerService/UpdateQuickAnswerService";
import DeleteQuickAnswerService from "../services/QuickAnswerService/DeleteQuickAnswerService";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";

import AppError from "../errors/AppError";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

interface QuickAnswerData {
  shortcut: string;
  message: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const companyId = req.user?.companyId || 1;

  const { quickAnswers, count, hasMore } = await ListQuickAnswerService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ quickAnswers, records: quickAnswers, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newQuickAnswer: QuickAnswerData = req.body;
  const companyId = req.user?.companyId || 1;

  const QuickAnswerSchema = Yup.object().shape({
    shortcut: Yup.string().required(),
    message: Yup.string().required()
  });

  try {
    await QuickAnswerSchema.validate(newQuickAnswer);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const quickAnswer = await CreateQuickAnswerService({
    ...newQuickAnswer,
    companyId
  });

  CreateAuditLogService({
    companyId,
    userId: Number(req.user.id),
    action: "QUICK_ANSWER_CREATE",
    entity: "QuickAnswer",
    entityId: quickAnswer.id,
    details: { shortcut: quickAnswer.shortcut }
  });

  const io = getIO();
  io.emit(`company-${companyId}-quickAnswer`, {
    action: "create",
    quickAnswer
  });
  io.emit(`company${companyId}-quickemessage`, {
    action: "create",
    record: quickAnswer
  });
  io.emit("quickAnswer", {
    action: "create",
    quickAnswer
  });

  return res.status(200).json(quickAnswer);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const quickAnswerId = req.params.quickAnswerId || req.params.id;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const quickAnswer = await ShowQuickAnswerService(quickAnswerId, companyId);

  return res.status(200).json(quickAnswer);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const quickAnswerData: QuickAnswerData = req.body;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const schema = Yup.object().shape({
    shortcut: Yup.string(),
    message: Yup.string()
  });

  try {
    await schema.validate(quickAnswerData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const quickAnswerId = req.params.quickAnswerId || req.params.id;

  const quickAnswer = await UpdateQuickAnswerService({
    quickAnswerData,
    quickAnswerId,
    companyId
  });

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "QUICK_ANSWER_UPDATE",
    entity: "QuickAnswer",
    entityId: quickAnswerId,
    details: quickAnswerData
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-quickAnswer`, {
    action: "update",
    quickAnswer
  });
  io.emit(`company${req.user.companyId}-quickemessage`, {
    action: "update",
    record: quickAnswer
  });
  io.emit("quickAnswer", {
    action: "update",
    quickAnswer
  });

  return res.status(200).json(quickAnswer);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const quickAnswerId = req.params.quickAnswerId || req.params.id;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  await DeleteQuickAnswerService(quickAnswerId, companyId);

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "QUICK_ANSWER_DELETE",
    entity: "QuickAnswer",
    entityId: quickAnswerId
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-quickAnswer`, {
    action: "delete",
    quickAnswerId
  });
  io.emit(`company${req.user.companyId}-quickemessage`, {
    action: "delete",
    id: quickAnswerId
  });
  io.emit("quickAnswer", {
    action: "delete",
    quickAnswerId
  });

  return res.status(200).json({ message: "Quick Answer deleted" });
};
