import { Request, Response } from "express";
import { Op } from "sequelize";
import Tag from "../models/Tag";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import TicketTag from "../models/TicketTag";
import ContactTag from "../models/ContactTag";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const { searchParam = "", pageNumber = "1" } = req.query as any;

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const where: any = { companyId };
  if (searchParam) {
    where.name = { [Op.like]: `%${searchParam.toLowerCase()}%` };
  }

  const { count, rows: tags } = await Tag.findAndCountAll({
    where,
    limit,
    offset,
    order: [
      ["order", "ASC"],
      ["name", "ASC"]
    ]
  });

  const hasMore = count > offset + tags.length;

  return res.json({ tags, count, hasMore });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const { searchParam = "" } = req.query as any;

  const where: any = { companyId };
  if (searchParam) {
    where.name = { [Op.like]: `%${searchParam.toLowerCase()}%` };
  }

  const tags = await Tag.findAll({
    where,
    order: [
      ["order", "ASC"],
      ["name", "ASC"]
    ]
  });

  return res.json(tags);
};

export const kanban = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;

  const tags = await Tag.findAll({
    where: { companyId, kanban: 1 },
    order: [
      ["order", "ASC"],
      ["name", "ASC"]
    ]
  });

  return res.json({ lista: tags });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;
  const companyId = req.user?.companyId || 1;

  const tag = await Tag.findOne({
    where: { id: tagId, companyId }
  });

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  return res.json(tag);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const { name, color = "#5c67f2", kanban = 0, order = 0 } = req.body;

  const tag = await Tag.create({
    name,
    color,
    kanban: Number(kanban),
    order: Number(order),
    companyId
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}`).emit(`company-${companyId}-tag`, {
      action: "create",
      tag
    });
    // Compatibilidade com frontend Tags/index.js (socket.on("user", ...))
    io.to(`company-${companyId}`).emit("user", {
      action: "create",
      tags: tag
    });
  } catch (err) {}

  return res.status(200).json(tag);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;
  const companyId = req.user?.companyId || 1;
  const { name, color, kanban, order } = req.body;

  const tag = await Tag.findOne({
    where: { id: tagId, companyId }
  });

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  await tag.update({
    name: name !== undefined ? name : tag.name,
    color: color !== undefined ? color : tag.color,
    kanban: kanban !== undefined ? Number(kanban) : tag.kanban,
    order: order !== undefined ? Number(order) : tag.order
  });

  try {
    const io = getIO();
    io.to(`company-${companyId}`).emit(`company-${companyId}-tag`, {
      action: "update",
      tag
    });
    io.to(`company-${companyId}`).emit("user", {
      action: "update",
      tags: tag
    });
  } catch (err) {}

  return res.json(tag);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;
  const companyId = req.user?.companyId || 1;

  const tag = await Tag.findOne({
    where: { id: tagId, companyId }
  });

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  await tag.destroy();

  try {
    const io = getIO();
    io.to(`company-${companyId}`).emit(`company-${companyId}-tag`, {
      action: "delete",
      tagId: +tagId
    });
    io.to(`company-${companyId}`).emit("user", {
      action: "delete",
      tagId: +tagId
    });
  } catch (err) {}

  return res.status(200).json({ message: "Tag deleted" });
};

export const sync = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const { ticketId, contactId, tags } = req.body;

  if (ticketId) {
    const ticket = await Ticket.findOne({
      where: { id: ticketId, companyId }
    });
    if (!ticket) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }

    const tagIds = Array.isArray(tags) ? tags.map((t: any) => t.id || t) : [];
    await TicketTag.destroy({ where: { ticketId } });
    if (tagIds.length > 0) {
      const records = tagIds.map((tagId: number) => ({ ticketId, tagId }));
      await TicketTag.bulkCreate(records);
    }
  }

  if (contactId) {
    const contact = await Contact.findOne({
      where: { id: contactId, companyId }
    });
    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }

    const tagIds = Array.isArray(tags) ? tags.map((t: any) => t.id || t) : [];
    await ContactTag.destroy({ where: { contactId } });
    if (tagIds.length > 0) {
      const records = tagIds.map((tagId: number) => ({ contactId, tagId }));
      await ContactTag.bulkCreate(records);
    }
  }

  return res.status(200).json({ message: "Tags synced" });
};

export const kanbanTickets = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const { queueIds } = req.query as any;

  const where: any = { companyId };

  if (queueIds) {
    try {
      const parsedQueues = typeof queueIds === "string" ? JSON.parse(queueIds) : queueIds;
      if (Array.isArray(parsedQueues) && parsedQueues.length > 0) {
        where.queueId = { [Op.in]: parsedQueues };
      }
    } catch (e) {}
  }

  const tickets = await Ticket.findAll({
    where,
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "profilePicUrl"]
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color", "kanban", "order"]
      }
    ],
    order: [["updatedAt", "DESC"]]
  });

  return res.json({ tickets });
};

export const updateTicketTag = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId, tagId } = req.params;
  const companyId = req.user?.companyId || 1;

  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId }
  });
  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  if (tagId && tagId !== "lane0") {
    // Se a tag existir e for do tenant
    const tag = await Tag.findOne({
      where: { id: tagId, companyId }
    });
    if (tag) {
      await TicketTag.destroy({ where: { ticketId } });
      await TicketTag.create({ ticketId: +ticketId, tagId: +tagId });

      import("../services/WebhookServices/WebhookDispatcher").then(({ dispatchWebhookEvent }) => {
        dispatchWebhookEvent({
          companyId,
          event: "tag.added",
          data: {
            ticketId: +ticketId,
            tagId: +tagId,
            tagName: tag.name
          }
        });
      }).catch(() => {});
    }
  } else {
    // Mover para lane0 (remover tags)
    await TicketTag.destroy({ where: { ticketId } });

    import("../services/WebhookServices/WebhookDispatcher").then(({ dispatchWebhookEvent }) => {
      dispatchWebhookEvent({
        companyId,
        event: "tag.removed",
        data: {
          ticketId: +ticketId
        }
      });
    }).catch(() => {});
  }

  return res.json({ message: "Ticket tag updated" });
};

export const removeTicketTag = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const companyId = req.user?.companyId || 1;

  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId }
  });
  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  await TicketTag.destroy({ where: { ticketId } });

  import("../services/WebhookServices/WebhookDispatcher").then(({ dispatchWebhookEvent }) => {
    dispatchWebhookEvent({
      companyId,
      event: "tag.removed",
      data: {
        ticketId: +ticketId
      }
    });
  }).catch(() => {});

  return res.json({ message: "Ticket tag removed" });
};
