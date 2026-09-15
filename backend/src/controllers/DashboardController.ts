import { Request, Response } from "express";
import { Op } from "sequelize";
import { subDays, startOfDay } from "date-fns";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import User from "../models/User";
import Queue from "../models/Queue";
import { getIO } from "../libs/socket";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const days = parseInt(req.query.days as string, 10) || 7;
  const startDate = subDays(startOfDay(new Date()), days);
  const now = new Date();

  // 1. Contadores e listagens reais no período filtrado
  const [
    supportPending,
    supportHappening,
    supportFinished,
    leads,
    closedTickets,
    startedTickets,
    pendingTickets,
    queuesList,
    usersList
  ] = await Promise.all([
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
        [Op.or]: [
          { closedAt: { [Op.gte]: startDate } },
          { updatedAt: { [Op.gte]: startDate } }
        ]
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
        [Op.or]: [
          { closedAt: { [Op.gte]: startDate } },
          { updatedAt: { [Op.gte]: startDate } }
        ]
      },
      attributes: [
        "id",
        "createdAt",
        "startedAt",
        "closedAt",
        "updatedAt",
        "queueId",
        "userId"
      ]
    }),
    Ticket.findAll({
      where: {
        companyId,
        startedAt: { [Op.ne]: null as any },
        [Op.or]: [
          { startedAt: { [Op.gte]: startDate } },
          { createdAt: { [Op.gte]: startDate } }
        ]
      },
      attributes: [
        "id",
        "createdAt",
        "queueEnteredAt",
        "startedAt",
        "queueId",
        "userId"
      ]
    }),
    Ticket.findAll({
      where: {
        companyId,
        status: "pending"
      },
      include: [
        { model: Contact, as: "contact", attributes: ["id", "name", "number"] },
        { model: Queue, as: "queue", attributes: ["id", "name", "color", "sla"] },
        { model: User, as: "user", attributes: ["id", "name"] }
      ],
      order: [["createdAt", "ASC"]]
    }),
    Queue.findAll({
      where: { companyId },
      attributes: ["id", "name", "color", "sla"],
      order: [["name", "ASC"]]
    }),
    User.findAll({
      where: { companyId },
      attributes: ["id", "name", "email", "profile"],
      order: [["name", "ASC"]]
    })
  ]);

  // 2. Cálculo real de avgSupportTime (tempo médio de atendimento em minutos)
  let avgSupportTime: number | null = null;
  if (closedTickets.length > 0) {
    const totalDurationMs = closedTickets.reduce((acc, t) => {
      const refStart = t.startedAt || t.createdAt;
      const refEnd = t.closedAt || t.updatedAt;
      const duration = new Date(refEnd).getTime() - new Date(refStart).getTime();
      return acc + (duration > 0 ? duration : 0);
    }, 0);
    avgSupportTime = Math.round(totalDurationMs / closedTickets.length / (1000 * 60));
  }

  // 3. Cálculo real de avgWaitTime (tempo médio de espera em fila até atendimento em minutos)
  let avgWaitTime: number | null = null;
  if (startedTickets.length > 0) {
    const totalWaitMs = startedTickets.reduce((acc, t) => {
      const refEntry = t.queueEnteredAt || t.createdAt;
      const duration = new Date(t.startedAt).getTime() - new Date(refEntry).getTime();
      return acc + (duration > 0 ? duration : 0);
    }, 0);
    avgWaitTime = Math.round(totalWaitMs / startedTickets.length / (1000 * 60));
  }

  // 4. Identificação de tickets aguardando acima do SLA configurado
  const waitingAlertTickets: any[] = [];
  pendingTickets.forEach((t) => {
    const refEntry = t.queueEnteredAt || t.createdAt;
    const waitMs = now.getTime() - new Date(refEntry).getTime();
    const waitMinutes = Math.max(0, Math.round(waitMs / (1000 * 60)));
    const slaLimit = t.queue?.sla || 15;

    if (waitMinutes > slaLimit) {
      waitingAlertTickets.push({
        id: t.id,
        contactName: t.contact?.name || t.contact?.number || `Ticket #${t.id}`,
        queueId: t.queueId,
        queueName: t.queue?.name || "Sem fila",
        queueColor: t.queue?.color || "#7C7C7C",
        waitMinutes,
        slaLimit,
        createdAt: t.createdAt,
        queueEnteredAt: t.queueEnteredAt
      });
    }
  });

  const waitingAboveSla = waitingAlertTickets.length;

  // 5. Verificação de status online via conexões ativas de Socket.IO
  let io: any = null;
  try {
    io = getIO();
  } catch (err) {
    // Socket.IO não inicializado em testes unitários
  }

  // 6. Métricas por Atendente
  const attendants = await Promise.all(
    usersList.map(async (u) => {
      const ticketsCount = await Ticket.count({
        where: {
          companyId,
          userId: u.id,
          createdAt: { [Op.gte]: startDate }
        }
      });

      const openTicketsCount = await Ticket.count({
        where: {
          companyId,
          userId: u.id,
          status: "open"
        }
      });

      const userClosed = closedTickets.filter((t) => t.userId === u.id);
      let userAvgSupportTime: number | null = null;
      if (userClosed.length > 0) {
        const totalUserSupportMs = userClosed.reduce((acc, t) => {
          const refStart = t.startedAt || t.createdAt;
          const refEnd = t.closedAt || t.updatedAt;
          const duration = new Date(refEnd).getTime() - new Date(refStart).getTime();
          return acc + (duration > 0 ? duration : 0);
        }, 0);
        userAvgSupportTime = Math.round(
          totalUserSupportMs / userClosed.length / (1000 * 60)
        );
      }

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
        openTickets: openTicketsCount,
        closedTickets: userClosed.length,
        avgSupportTime: userAvgSupportTime,
        rating: null
      };
    })
  );

  // 7. Métricas operacionais por Fila / Departamento
  const queues = queuesList.map((q) => {
    const queuePending = pendingTickets.filter((t) => t.queueId === q.id).length;
    const queueClosed = closedTickets.filter((t) => t.queueId === q.id);
    const queueStarted = startedTickets.filter((t) => t.queueId === q.id);
    const queueAboveSla = waitingAlertTickets.filter((t) => t.queueId === q.id).length;

    let queueAvgWaitTime: number | null = null;
    if (queueStarted.length > 0) {
      const totalQWait = queueStarted.reduce((acc, t) => {
        const refEntry = t.queueEnteredAt || t.createdAt;
        const duration = new Date(t.startedAt).getTime() - new Date(refEntry).getTime();
        return acc + (duration > 0 ? duration : 0);
      }, 0);
      queueAvgWaitTime = Math.round(totalQWait / queueStarted.length / (1000 * 60));
    }

    let queueAvgSupportTime: number | null = null;
    if (queueClosed.length > 0) {
      const totalQSupport = queueClosed.reduce((acc, t) => {
        const refStart = t.startedAt || t.createdAt;
        const refEnd = t.closedAt || t.updatedAt;
        const duration = new Date(refEnd).getTime() - new Date(refStart).getTime();
        return acc + (duration > 0 ? duration : 0);
      }, 0);
      queueAvgSupportTime = Math.round(totalQSupport / queueClosed.length / (1000 * 60));
    }

    return {
      id: q.id,
      name: q.name,
      color: q.color,
      sla: q.sla || 15,
      pending: queuePending,
      closed: queueClosed.length,
      aboveSla: queueAboveSla,
      avgWaitTime: queueAvgWaitTime,
      avgSupportTime: queueAvgSupportTime
    };
  });

  const counters = {
    supportPending,
    supportHappening,
    supportFinished,
    leads,
    avgSupportTime,
    avgWaitTime,
    waitingAboveSla,
    rating: null
  };

  return res.status(200).json({
    counters,
    attendants,
    queues,
    waitingAlertTickets
  });
};
