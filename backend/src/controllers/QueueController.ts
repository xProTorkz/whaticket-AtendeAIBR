import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import CreateQueueService from "../services/QueueService/CreateQueueService";
import DeleteQueueService from "../services/QueueService/DeleteQueueService";
import ListQueuesService from "../services/QueueService/ListQueuesService";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import UpdateQueueService from "../services/QueueService/UpdateQueueService";
import CreateAuditLogService from "../services/AuditServices/CreateAuditLogService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const queues = await ListQueuesService(companyId);

  return res.status(200).json(queues);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, color, greetingMessage } = req.body;
  const companyId = req.user?.companyId || 1;

  const queue = await CreateQueueService({
    name,
    color,
    greetingMessage,
    companyId
  });

  CreateAuditLogService({
    companyId,
    userId: Number(req.user.id),
    action: "QUEUE_CREATE",
    entity: "Queue",
    entityId: queue.id,
    details: { name, color }
  });

  const io = getIO();
  io.emit(`company-${companyId}-queue`, {
    action: "update",
    queue
  });
  io.emit("queue", {
    action: "update",
    queue
  });

  return res.status(200).json(queue);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { queueId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const queue = await ShowQueueService(queueId, companyId);

  return res.status(200).json(queue);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  const queue = await UpdateQueueService(queueId, req.body, companyId);

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "QUEUE_UPDATE",
    entity: "Queue",
    entityId: queueId,
    details: req.body
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-queue`, {
    action: "update",
    queue
  });
  io.emit("queue", {
    action: "update",
    queue
  });

  return res.status(201).json(queue);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;
  const companyId = req.user?.isSuperAdmin ? undefined : req.user?.companyId;

  await DeleteQueueService(queueId, companyId);

  CreateAuditLogService({
    companyId: req.user.companyId,
    userId: Number(req.user.id),
    action: "QUEUE_DELETE",
    entity: "Queue",
    entityId: queueId
  });

  const io = getIO();
  io.emit(`company-${req.user.companyId}-queue`, {
    action: "delete",
    queueId: +queueId
  });
  io.emit("queue", {
    action: "delete",
    queueId: +queueId
  });

  return res.status(200).send();
};
