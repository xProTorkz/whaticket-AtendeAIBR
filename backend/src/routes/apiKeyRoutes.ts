import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isRole from "../middleware/isRole";
import * as ApiKeyController from "../controllers/ApiKeyController";

const apiKeyRoutes = Router();

apiKeyRoutes.get(
  "/api-keys",
  isAuth,
  isRole(["manager", "admin"]),
  ApiKeyController.index
);

apiKeyRoutes.post(
  "/api-keys",
  isAuth,
  isRole(["manager", "admin"]),
  ApiKeyController.store
);

apiKeyRoutes.post(
  "/api-keys/:id/revoke",
  isAuth,
  isRole(["manager", "admin"]),
  ApiKeyController.revoke
);

apiKeyRoutes.post(
  "/api-keys/:id/rotate",
  isAuth,
  isRole(["manager", "admin"]),
  ApiKeyController.rotate
);

apiKeyRoutes.delete(
  "/api-keys/:id",
  isAuth,
  isRole(["manager", "admin"]),
  ApiKeyController.remove
);

export default apiKeyRoutes;
