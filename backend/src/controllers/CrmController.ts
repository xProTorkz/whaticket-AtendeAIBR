import { Request, Response } from "express";
import { Op } from "sequelize";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import Deal from "../models/Deal";
import DealTimeline from "../models/DealTimeline";
import CrmConfig from "../models/CrmConfig";
import Contact from "../models/Contact";
import User from "../models/User";
import Queue from "../models/Queue";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

// 1. PIPELINES & STAGES
export const listPipelines = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user?.companyId || 1;

  let pipelines = await Pipeline.findAll({
    where: { companyId },
    include: [
      {
        model: PipelineStage,
        as: "stages"
      }
    ],
    order: [
      ["order", "ASC"],
      [{ model: PipelineStage, as: "stages" }, "order", "ASC"]
    ]
  });

  // Seed automático de um funil padrão com 5 etapas caso não exista nenhum
  if (pipelines.length === 0) {
    const defaultPipeline = await Pipeline.create({
      name: "Funil de Vendas",
      order: 0,
      companyId
    });

    const defaultStages = [
      { name: "Primeiro Contato", color: "#3498db", order: 0 },
      { name: "Qualificação", color: "#f39c12", order: 1 },
      { name: "Proposta Enviada", color: "#9b59b6", order: 2 },
      { name: "Negociação", color: "#e67e22", order: 3 },
      { name: "Fechamento", color: "#2ecc71", order: 4 }
    ];

    for (const s of defaultStages) {
      await PipelineStage.create({
        pipelineId: defaultPipeline.id,
        name: s.name,
        color: s.color,
        order: s.order,
        companyId
      });
    }

    pipelines = await Pipeline.findAll({
      where: { companyId },
      include: [
        {
          model: PipelineStage,
          as: "stages"
        }
      ],
      order: [
        ["order", "ASC"],
        [{ model: PipelineStage, as: "stages" }, "order", "ASC"]
      ]
    });
  }

  return res.json(pipelines);
};

export const createPipeline = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const { name, order = 0 } = req.body;

  const pipeline = await Pipeline.create({
    name,
    order: Number(order),
    companyId
  });

  return res.status(200).json(pipeline);
};

export const updatePipeline = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { pipelineId } = req.params;
  const companyId = req.user?.companyId || 1;
  const { name, order } = req.body;

  const pipeline = await Pipeline.findOne({
    where: { id: pipelineId, companyId }
  });

  if (!pipeline) {
    throw new AppError("ERR_NO_PIPELINE_FOUND", 404);
  }

  await pipeline.update({
    name: name !== undefined ? name : pipeline.name,
    order: order !== undefined ? Number(order) : pipeline.order
  });

  return res.json(pipeline);
};

export const deletePipeline = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { pipelineId } = req.params;
  const companyId = req.user?.companyId || 1;

  const pipeline = await Pipeline.findOne({
    where: { id: pipelineId, companyId }
  });

  if (!pipeline) {
    throw new AppError("ERR_NO_PIPELINE_FOUND", 404);
  }

  await pipeline.destroy();

  return res.json({ message: "Pipeline deleted" });
};

export const createStage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { pipelineId } = req.params;
  const companyId = req.user?.companyId || 1;
  const { name, color = "#0088fe", order = 0 } = req.body;

  const stage = await PipelineStage.create({
    pipelineId: +pipelineId,
    name,
    color,
    order: Number(order),
    companyId
  });

  return res.status(200).json(stage);
};

export const updateStage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { stageId } = req.params;
  const companyId = req.user?.companyId || 1;
  const { name, color, order } = req.body;

  const stage = await PipelineStage.findOne({
    where: { id: stageId, companyId }
  });

  if (!stage) {
    throw new AppError("ERR_NO_STAGE_FOUND", 404);
  }

  await stage.update({
    name: name !== undefined ? name : stage.name,
    color: color !== undefined ? color : stage.color,
    order: order !== undefined ? Number(order) : stage.order
  });

  return res.json(stage);
};

export const deleteStage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { stageId } = req.params;
  const companyId = req.user?.companyId || 1;

  const stage = await PipelineStage.findOne({
    where: { id: stageId, companyId }
  });

  if (!stage) {
    throw new AppError("ERR_NO_STAGE_FOUND", 404);
  }

  await stage.destroy();

  return res.json({ message: "Stage deleted" });
};

// 2. DEALS / OPORTUNIDADES
export const listDeals = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const { pipelineId, stageId, userId, status, search } = req.query as any;

  const where: any = { companyId };
  if (pipelineId) where.pipelineId = pipelineId;
  if (stageId) where.stageId = stageId;
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  const deals = await Deal.findAll({
    where,
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "profilePicUrl", "email"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      },
      {
        model: PipelineStage,
        as: "stage",
        attributes: ["id", "name", "color", "order"]
      }
    ],
    order: [
      ["order", "ASC"],
      ["createdAt", "DESC"]
    ]
  });

  return res.json(deals);
};

export const showDeal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { dealId } = req.params;
  const companyId = req.user?.companyId || 1;

  const deal = await Deal.findOne({
    where: { id: dealId, companyId },
    include: [
      {
        model: Contact,
        as: "contact"
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"]
      },
      {
        model: Queue,
        as: "queue"
      },
      {
        model: Pipeline,
        as: "pipeline"
      },
      {
        model: PipelineStage,
        as: "stage"
      },
      {
        model: DealTimeline,
        as: "timelines",
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name"]
          }
        ]
      }
    ],
    order: [[{ model: DealTimeline, as: "timelines" }, "createdAt", "DESC"]]
  });

  if (!deal) {
    throw new AppError("ERR_NO_DEAL_FOUND", 404);
  }

  return res.json(deal);
};

export const createDeal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const actorUserId = req.user?.id;

  const {
    name,
    value = 0,
    priority = "medium",
    expectedCloseDate,
    status = "open",
    notes,
    contactId,
    userId,
    queueId,
    ticketId,
    pipelineId,
    stageId
  } = req.body;

  // Obter pipeline e stage default caso não passados
  let finalPipelineId = pipelineId;
  let finalStageId = stageId;

  if (!finalPipelineId || !finalStageId) {
    const firstPipeline = await Pipeline.findOne({
      where: { companyId },
      include: [{ model: PipelineStage, as: "stages" }],
      order: [
        ["order", "ASC"],
        [{ model: PipelineStage, as: "stages" }, "order", "ASC"]
      ]
    });

    if (firstPipeline && firstPipeline.stages && firstPipeline.stages.length > 0) {
      finalPipelineId = firstPipeline.id;
      finalStageId = firstPipeline.stages[0].id;
    }
  }

  const deal = await Deal.create({
    name,
    value: Number(value) || 0,
    priority,
    expectedCloseDate: expectedCloseDate || null,
    status,
    notes,
    contactId: contactId ? Number(contactId) : null,
    userId: userId ? Number(userId) : actorUserId ? Number(actorUserId) : null,
    queueId: queueId ? Number(queueId) : null,
    ticketId: ticketId ? Number(ticketId) : null,
    pipelineId: Number(finalPipelineId),
    stageId: Number(finalStageId),
    companyId
  });

  // Timeline: Criação
  await DealTimeline.create({
    dealId: deal.id,
    companyId,
    userId: actorUserId ? Number(actorUserId) : null,
    action: "created",
    description: `Oportunidade criada com valor de R$ ${(Number(value) || 0).toFixed(2)}`,
    newValue: String(deal.value)
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}`).emit(`company-${companyId}-crm-deal`, {
      action: "create",
      deal
    });
  } catch (e) {}

  return res.status(200).json(deal);
};

export const updateDeal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { dealId } = req.params;
  const companyId = req.user?.companyId || 1;
  const actorUserId = req.user?.id;

  const deal = await Deal.findOne({
    where: { id: dealId, companyId },
    include: [{ model: PipelineStage, as: "stage" }]
  });

  if (!deal) {
    throw new AppError("ERR_NO_DEAL_FOUND", 404);
  }

  const {
    name,
    value,
    priority,
    expectedCloseDate,
    status,
    lostReason,
    notes,
    contactId,
    userId,
    queueId,
    pipelineId,
    stageId,
    order
  } = req.body;

  // Registrar histórico na timeline para alterações relevantes
  if (stageId && Number(stageId) !== deal.stageId) {
    const targetStage = await PipelineStage.findOne({
      where: { id: stageId, companyId }
    });
    await DealTimeline.create({
      dealId: deal.id,
      companyId,
      userId: actorUserId ? Number(actorUserId) : null,
      action: "stage_changed",
      description: `Etapa alterada de "${deal.stage?.name || 'Anterior'}" para "${targetStage?.name || 'Nova'}"`,
      oldValue: String(deal.stageId),
      newValue: String(stageId)
    });
  }

  if (value !== undefined && Number(value) !== Number(deal.value)) {
    await DealTimeline.create({
      dealId: deal.id,
      companyId,
      userId: actorUserId ? Number(actorUserId) : null,
      action: "value_changed",
      description: `Valor alterado de R$ ${Number(deal.value).toFixed(2)} para R$ ${Number(value).toFixed(2)}`,
      oldValue: String(deal.value),
      newValue: String(value)
    });
  }

  if (status && status !== deal.status) {
    const statusLabel = status === "won" ? "GANHO" : status === "lost" ? "PERDIDO" : "EM ABERTO";
    await DealTimeline.create({
      dealId: deal.id,
      companyId,
      userId: actorUserId ? Number(actorUserId) : null,
      action: "status_changed",
      description: `Negócio marcado como ${statusLabel}${lostReason ? `: ${lostReason}` : ''}`,
      oldValue: deal.status,
      newValue: status
    });
  }

  if (userId !== undefined && Number(userId) !== deal.userId) {
    await DealTimeline.create({
      dealId: deal.id,
      companyId,
      userId: actorUserId ? Number(actorUserId) : null,
      action: "assigned_changed",
      description: `Responsável pelo negócio atualizado`,
      oldValue: String(deal.userId),
      newValue: String(userId)
    });
  }

  await deal.update({
    name: name !== undefined ? name : deal.name,
    value: value !== undefined ? Number(value) : deal.value,
    priority: priority !== undefined ? priority : deal.priority,
    expectedCloseDate: expectedCloseDate !== undefined ? expectedCloseDate : deal.expectedCloseDate,
    status: status !== undefined ? status : deal.status,
    lostReason: lostReason !== undefined ? lostReason : deal.lostReason,
    notes: notes !== undefined ? notes : deal.notes,
    contactId: contactId !== undefined ? contactId : deal.contactId,
    userId: userId !== undefined ? userId : deal.userId,
    queueId: queueId !== undefined ? queueId : deal.queueId,
    pipelineId: pipelineId !== undefined ? pipelineId : deal.pipelineId,
    stageId: stageId !== undefined ? stageId : deal.stageId,
    order: order !== undefined ? Number(order) : deal.order
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}`).emit(`company-${companyId}-crm-deal`, {
      action: "update",
      deal
    });
  } catch (e) {}

  return res.json(deal);
};

export const moveDealStage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { dealId } = req.params;
  const companyId = req.user?.companyId || 1;
  const actorUserId = req.user?.id;
  const { stageId, order = 0 } = req.body;

  const deal = await Deal.findOne({
    where: { id: dealId, companyId },
    include: [{ model: PipelineStage, as: "stage" }]
  });

  if (!deal) {
    throw new AppError("ERR_NO_DEAL_FOUND", 404);
  }

  const targetStage = await PipelineStage.findOne({
    where: { id: stageId, companyId }
  });

  if (!targetStage) {
    throw new AppError("ERR_NO_STAGE_FOUND", 404);
  }

  const oldStageName = deal.stage?.name || "Etapa Anterior";
  await deal.update({
    stageId: Number(stageId),
    order: Number(order)
  });

  await DealTimeline.create({
    dealId: deal.id,
    companyId,
    userId: actorUserId ? Number(actorUserId) : null,
    action: "stage_changed",
    description: `Movimentado no Kanban de "${oldStageName}" para "${targetStage.name}"`,
    oldValue: String(deal.stageId),
    newValue: String(stageId)
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}`).emit(`company-${companyId}-crm-deal`, {
      action: "move",
      deal
    });
  } catch (e) {}

  return res.json(deal);
};

export const deleteDeal = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { dealId } = req.params;
  const companyId = req.user?.companyId || 1;

  const deal = await Deal.findOne({
    where: { id: dealId, companyId }
  });

  if (!deal) {
    throw new AppError("ERR_NO_DEAL_FOUND", 404);
  }

  await deal.destroy();

  try {
    const io = getIO();
    io.to(`company-${companyId}`).emit(`company-${companyId}-crm-deal`, {
      action: "delete",
      dealId: +dealId
    });
  } catch (e) {}

  return res.json({ message: "Deal deleted" });
};

export const getDealTimeline = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { dealId } = req.params;
  const companyId = req.user?.companyId || 1;

  const timelines = await DealTimeline.findAll({
    where: { dealId, companyId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  return res.json(timelines);
};

// 3. RETENÇÃO E CONFIGURAÇÃO
export const getConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user?.companyId || 1;

  let config = await CrmConfig.findOne({
    where: { companyId }
  });

  if (!config) {
    config = await CrmConfig.create({
      companyId,
      diasClienteSumido: 15,
      horarioEnvio: "09:00",
      mensagemAniversario: "Olá {nome}! Parabéns pelo seu aniversário! Desejamos um ótimo dia.",
      mensagemSumido: "Olá {nome}! Sentimos sua falta. Como podemos ajudar hoje?",
      autoEnvioAtivo: true
    });
  }

  return res.json(config);
};

export const updateConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const {
    diasClienteSumido,
    horarioEnvio,
    mensagemAniversario,
    mensagemSumido,
    autoEnvioAtivo
  } = req.body;

  let config = await CrmConfig.findOne({
    where: { companyId }
  });

  if (!config) {
    config = await CrmConfig.create({
      companyId,
      diasClienteSumido: diasClienteSumido || 15,
      horarioEnvio: horarioEnvio || "09:00",
      mensagemAniversario,
      mensagemSumido,
      autoEnvioAtivo: autoEnvioAtivo !== undefined ? autoEnvioAtivo : true
    });
  } else {
    await config.update({
      diasClienteSumido: diasClienteSumido !== undefined ? Number(diasClienteSumido) : config.diasClienteSumido,
      horarioEnvio: horarioEnvio || config.horarioEnvio,
      mensagemAniversario: mensagemAniversario !== undefined ? mensagemAniversario : config.mensagemAniversario,
      mensagemSumido: mensagemSumido !== undefined ? mensagemSumido : config.mensagemSumido,
      autoEnvioAtivo: autoEnvioAtivo !== undefined ? autoEnvioAtivo : config.autoEnvioAtivo
    });
  }

  return res.json(config);
};

export const getMissingClients = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user?.companyId || 1;

  const config = await CrmConfig.findOne({ where: { companyId } });
  const days = config ? config.diasClienteSumido : 15;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Contatos que não têm mensagens recentes ou cuja atualização é anterior ao corte
  const contacts = await Contact.findAll({
    where: {
      companyId,
      updatedAt: { [Op.lte]: cutoffDate }
    },
    order: [["updatedAt", "ASC"]],
    limit: 50
  });

  return res.json(contacts);
};

export const getBirthdayClients = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user?.companyId || 1;

  // Contatos cadastrados na empresa
  const contacts = await Contact.findAll({
    where: { companyId },
    limit: 50,
    order: [["name", "ASC"]]
  });

  return res.json(contacts);
};
