import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import isAuth from "../middleware/isAuth";
import { authLimiter } from "../middleware/rateLimiter";

const authRoutes = Router();

authRoutes.post("/signup", authLimiter, UserController.store);
authRoutes.post("/login", authLimiter, SessionController.store);
authRoutes.post("/refresh_token", authLimiter, SessionController.update);
authRoutes.delete("/logout", isAuth, SessionController.remove);
authRoutes.get("/me", isAuth, SessionController.me);

export default authRoutes;
