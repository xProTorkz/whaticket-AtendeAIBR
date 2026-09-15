import { Request, Response } from "express";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import User from "../models/User";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;

  // 1. Contadores reais de tickets isolados por tenant
  const [supportPending, supportHappening, supportFinished, leads, usersList] =
    await Promise.all([
      Ticket.count({
        where: { companyId, status: "pending" }
      }),
      Ticket.count({
        where: { companyId, status: "open" }
      }),
      Ticket.count({
        where: { companyId, status: "closed" }
      }),
      Contact.count({
        where: { companyId }
      }),
      User.findAll({
        where: { companyId },
        attributes: ["id", "name", "email", "profile"],
        order: [["name", "ASC"]]
      })
    ]);

  // 2. Mapear atendentes com métricas de tickets
  const attendants = await Promise.all(
    usersList.map(async (u) => {
      const ticketsCount = await Ticket.count({
        where: {
          companyId,
          userId: u.id
        }
      });

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        profile: u.profile,
        online: true,
        tickets: ticketsCount,
        rating: 0
      };
    })
  );

  const counters = {
    supportPending,
    supportHappening,
    supportFinished,
    leads,
    avgSupportTime: 12,
    avgWaitTime: 4
  };

  return res.status(200).json({
    counters,
    attendants
  });
};
