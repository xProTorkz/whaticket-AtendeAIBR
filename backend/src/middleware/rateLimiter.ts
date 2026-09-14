import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Limite de 20 tentativas por janela por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    return res.status(429).json({
      error: "Muitas tentativas. Por favor, tente novamente após 15 minutos."
    });
  }
});

export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 300, // 300 requisições por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    return res.status(429).json({
      error: "Limite de requisições excedido. Reduza a frequência."
    });
  }
});
