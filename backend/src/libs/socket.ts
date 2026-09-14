import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import { verify } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import authConfig from "../config/auth";

let io: SocketIO;

export const initIO = (httpServer: Server): SocketIO => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL
    }
  });

  io.on("connection", socket => {
    const { token } = socket.handshake.query;
    let tokenData = null;
    try {
      tokenData = verify(token, authConfig.secret);
      logger.debug(JSON.stringify(tokenData), "io-onConnection: tokenData");
    } catch (error) {
      logger.error(JSON.stringify(error), "Error decoding token");
      socket.disconnect();
      return io;
    }

    logger.info("Client Connected");

    const companyId = (tokenData as any)?.companyId || 1;
    const userId = (tokenData as any)?.id;

    // Salas automáticas do tenant
    socket.join(`company-${companyId}`);
    if (userId) {
      socket.join(`company-${companyId}-user-${userId}`);
    }
    socket.join(`company-${companyId}-internal-chat`);

    socket.on("joinChatBox", (ticketId: string) => {
      logger.info(`A client joined ticket channel: ${ticketId}`);
      socket.join(ticketId);
      socket.join(`company-${companyId}-ticket-${ticketId}`);
      socket.join(`company-${companyId}-ticket-${ticketId}-notes`);
    });

    socket.on("joinNotification", () => {
      logger.info("A client joined notification channel");
      socket.join("notification");
      socket.join(`company-${companyId}-notification`);
    });

    socket.on("joinTickets", (status: string) => {
      logger.info(`A client joined to ${status} tickets channel.`);
      socket.join(status);
      socket.join(`company-${companyId}-${status}`);
    });

    socket.on("joinInternalChat", () => {
      logger.info("A client joined internal chat channel");
      socket.join(`company-${companyId}-internal-chat`);
    });

    socket.on("disconnect", () => {
      logger.info("Client disconnected");
    });

    return socket;
  });
  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};
