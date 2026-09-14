import { Router } from "express";

import isAuth from "../middleware/isAuth";
import { isAdmin, isAgentOrAbove } from "../middleware/isRole";
import * as UserController from "../controllers/UserController";

const userRoutes = Router();

userRoutes.get("/users", isAuth, isAgentOrAbove, UserController.index);
userRoutes.post("/users", isAuth, isAdmin, UserController.store);
userRoutes.put("/users/:userId", isAuth, UserController.update);
userRoutes.get("/users/:userId", isAuth, UserController.show);
userRoutes.delete("/users/:userId", isAuth, isAdmin, UserController.remove);

export default userRoutes;
