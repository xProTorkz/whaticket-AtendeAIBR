import { Request, Response } from "express";
import CreateInternalMessageService from "../services/InternalChatServices/CreateInternalMessageService";
import ListInternalMessagesService from "../services/InternalChatServices/ListInternalMessagesService";
import ListInternalChatUsersService from "../services/InternalChatServices/ListInternalChatUsersService";
import MarkInternalMessagesAsReadService from "../services/InternalChatServices/MarkInternalMessagesAsReadService";
import AppError from "../errors/AppError";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { text, receiverId } = req.body;
  const companyId = req.user?.companyId || 1;
  const senderId = Number(req.user.id);

  // Visitantes não possuem acesso ao chat interno
  if (req.user?.profile === "visitor") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const message = await CreateInternalMessageService({
    text,
    senderId,
    receiverId: receiverId ? Number(receiverId) : undefined,
    companyId
  });

  return res.status(201).json(message);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { targetUserId } = req.params;
  const { pageNumber } = req.query as { pageNumber: string };
  const companyId = req.user?.companyId || 1;
  const userId = Number(req.user.id);

  if (req.user?.profile === "visitor") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { messages, count, hasMore } = await ListInternalMessagesService({
    userId,
    targetUserId: targetUserId ? Number(targetUserId) : undefined,
    companyId,
    pageNumber
  });

  return res.status(200).json({ messages, count, hasMore });
};

export const users = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId || 1;
  const currentUserId = Number(req.user.id);

  if (req.user?.profile === "visitor") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const chatUsers = await ListInternalChatUsersService({
    currentUserId,
    companyId
  });

  return res.status(200).json(chatUsers);
};

export const markAsRead = async (req: Request, res: Response): Promise<Response> => {
  const { targetUserId } = req.params;
  const companyId = req.user?.companyId || 1;
  const currentUserId = Number(req.user.id);

  await MarkInternalMessagesAsReadService({
    currentUserId,
    targetUserId: Number(targetUserId),
    companyId
  });

  return res.status(200).json({ success: true });
};
