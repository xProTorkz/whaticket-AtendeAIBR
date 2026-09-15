import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Deal from "../../models/Deal";
import Pipeline from "../../models/Pipeline";
import PipelineStage from "../../models/PipelineStage";
import Contact from "../../models/Contact";
import User from "../../models/User";
import { dispatchWebhookEvent } from "../../services/WebhookServices/WebhookDispatcher";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { pipelineId, stageId, status, contactId } = req.query as any;

  const whereCondition: any = { companyId };
  if (pipelineId) whereCondition.pipelineId = pipelineId;
  if (stageId) whereCondition.stageId = stageId;
  if (status) whereCondition.status = status;
  if (contactId) whereCondition.contactId = contactId;

  const deals = await Deal.findAll({
    where: whereCondition,
    order: [["order", "ASC"], ["createdAt", "DESC"]],
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number"] },
      { model: Pipeline, as: "pipeline", attributes: ["id", "name"] },
      { model: PipelineStage, as: "stage", attributes: ["id", "name", "color"] },
      { model: User, as: "user", attributes: ["id", "name"] }
    ]
  });

  return res.json({ deals });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;

  const schema = Yup.object().shape({
    name: Yup.string().required("ERR_NAME_REQUIRED"),
    value: Yup.number().nullable(),
    pipelineId: Yup.number().required("ERR_PIPELINE_REQUIRED"),
    stageId: Yup.number().required("ERR_STAGE_REQUIRED"),
    contactId: Yup.number().nullable(),
    userId: Yup.number().nullable(),
    description: Yup.string().nullable()
  });

  try {
    await schema.validate(req.body);
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const { name, value = 0, pipelineId, stageId, contactId, userId, description } = req.body;

  // Validate pipeline and stage belong to company
  const pipeline = await Pipeline.findOne({ where: { id: pipelineId, companyId } });
  if (!pipeline) throw new AppError("ERR_NO_PIPELINE_FOUND", 404);

  const stage = await PipelineStage.findOne({ where: { id: stageId, pipelineId } });
  if (!stage) throw new AppError("ERR_NO_STAGE_FOUND", 404);

  const deal = await Deal.create({
    name,
    value,
    pipelineId,
    stageId,
    contactId,
    userId,
    notes: description || req.body.notes,
    status: "open",
    companyId
  });

  dispatchWebhookEvent({
    companyId,
    event: "deal.created",
    data: {
      id: deal.id,
      name: deal.name,
      value: deal.value,
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
      contactId: deal.contactId,
      status: deal.status,
      createdAt: deal.createdAt
    }
  });

  return res.status(201).json(deal);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  const { id } = req.params;

  const deal = await Deal.findOne({
    where: { id, companyId }
  });

  if (!deal) {
    throw new AppError("ERR_NO_DEAL_FOUND", 404);
  }

  const prevStageId = deal.stageId;
  const { name, value, stageId, status, description } = req.body;

  if (stageId && stageId !== prevStageId) {
    const stage = await PipelineStage.findOne({
      where: { id: stageId, pipelineId: deal.pipelineId }
    });
    if (!stage) throw new AppError("ERR_NO_STAGE_FOUND", 404);
    deal.stageId = stageId;
  }

  if (name !== undefined) deal.name = name;
  if (value !== undefined) deal.value = value;
  if (status !== undefined) deal.status = status;
  if (description !== undefined || req.body.notes !== undefined) {
    deal.notes = description || req.body.notes;
  }

  await deal.save();

  const isMoved = stageId && stageId !== prevStageId;
  const event = isMoved ? "deal.moved" : "deal.updated";

  dispatchWebhookEvent({
    companyId,
    event,
    data: {
      id: deal.id,
      name: deal.name,
      value: deal.value,
      stageId: deal.stageId,
      previousStageId: isMoved ? prevStageId : undefined,
      status: deal.status,
      updatedAt: deal.updatedAt
    }
  });

  return res.json(deal);
};
