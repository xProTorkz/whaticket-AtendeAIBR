import express from "express";
import isAuth from "../middleware/isAuth";
import * as InternalMessageController from "../controllers/InternalMessageController";

const internalChatRoutes = express.Router();

internalChatRoutes.get("/internal-chat/users", isAuth, InternalMessageController.users);
internalChatRoutes.get("/internal-chat/:targetUserId?", isAuth, InternalMessageController.index);
internalChatRoutes.post("/internal-chat", isAuth, InternalMessageController.store);
internalChatRoutes.post("/internal-chat/read/:targetUserId", isAuth, InternalMessageController.markAsRead);
internalChatRoutes.put("/internal-chat/read/:targetUserId", isAuth, InternalMessageController.markAsRead);

export default internalChatRoutes;
