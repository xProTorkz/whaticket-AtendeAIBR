import { Request, Response } from "express";
import ImportContactsService from "../services/WbotServices/ImportContactsService";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const userId: number = parseInt(req.user.id);
  const companyId = req.user?.companyId || 1;

  await ImportContactsService(userId, companyId);

  return res.status(200).json({ message: "contacts imported" });
};
