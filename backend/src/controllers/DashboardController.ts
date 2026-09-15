import { Request, Response } from "express";
import { Op } from "sequelize";
import { subDays, startOfDay } from "date-fns";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import User from "../models/User";
import { getIO } from "../libs/socket";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const days = parseInt(req.query.days as string, 10) || 7;
  const startDate = subDays(startOfDay(new Date()), days);

  // 1. Contadores reais no período filtrado
  const [supportPending, supportHappening, supportFinished, leads, closedTickets, usersList] =
    await Promise.all([
      Ticket.count({
        where: {
          companyId,
          status: "pending",
          createdAt: { [Op.gte]: startDate }
        }
      }),
      Ticket.count({
        where: {
          companyId,
          status: "open",
          createdAt: { [Op.gte]: startDate }
        }
      }),
      Ticket.count({
        where: {
          companyId,
          status: "closed",
          updatedAt: { [Op.gte]: startDate }
        }
      }),
      Contact.count({
        where: {
          companyId,
          createdAt: { [Op.gte]: startDate }
        }
      }),
      Ticket.findAll({
        where: {
          companyId,
          status: "closed",
          updatedAt: { [Op.gte]: startDate }
        },
        attributes: ["createdAt", "updatedAt"]
      }),
      User.findAll({
        where: { companyId },
        attributes: ["id", "name", "email", "profile"],
        order: [["name", "ASC"]]
      })
    ]);

  // 2. Cálculo real de avgSupportTime (tempo médio de suporte em minutos)
  let avgSupportTime: number | null = null;
  if (closedTickets.length > 0) {
    const totalDurationMs = closedTickets.reduce((acc, t) => {
      const duration =
        new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
      return acc + (duration > 0 ? duration : 0);
    }, 0);
    avgSupportTime = Math.round(totalDurationMs / closedTickets.length / (1000 * 60));
  }

  // 3. avgWaitTime: sem registro de espera em fila nesta fase -> explicitamente null
  const avgWaitTime: number | null = null;

  // 4. Verificação de status online via conexões ativas de Socket.IO
  let io: any = null;
  try {
    io = getIO();
  } catch (err) {
    // Socket.IO não inicializado em testes unitários
  }

  const attendants = await Promise.all(
    usersList.map(async (u) => {
      const ticketsCount = await Ticket.count({
        where: {
          companyId,
          userId: u.id,
          createdAt: { [Op.gte]: startDate }
        }
      });

      let isOnline = false;
      if (io && io.sockets && io.sockets.adapter && io.sockets.adapter.rooms) {
        const userRoom = io.sockets.adapter.rooms.get(
          `company-${companyId}-user-${u.id}`
        );
        isOnline = Boolean(userRoom && userRoom.size > 0);
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        profile: u.profile,
        online: isOnline,
        tickets: ticketsCount,
        rating: null // Avaliação ainda não implementada -> explicitamente null
      };
    })
  );

  const counters = {
    supportPending,
    supportHappening,
    supportFinished,
    leads,
    avgSupportTime,
    avgWaitTime,
    rating: null
  };

  return res.status(200).json({
    counters,
    attendants
  });
};
