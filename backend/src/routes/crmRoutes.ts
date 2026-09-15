import express from "express";
import isAuth from "../middleware/isAuth";
import { isCollaboratorOrAbove, isAgentOrAbove, isManagerOrAdmin } from "../middleware/isRole";
import * as CrmController from "../controllers/CrmController";

const crmRoutes = express.Router();

// Pipelines & Stages
crmRoutes.get("/crm/pipelines", isAuth, isCollaboratorOrAbove, CrmController.listPipelines);
crmRoutes.post("/crm/pipelines", isAuth, isManagerOrAdmin, CrmController.createPipeline);
crmRoutes.put("/crm/pipelines/:pipelineId", isAuth, isManagerOrAdmin, CrmController.updatePipeline);
crmRoutes.delete("/crm/pipelines/:pipelineId", isAuth, isManagerOrAdmin, CrmController.deletePipeline);
crmRoutes.post("/crm/pipelines/:pipelineId/stages", isAuth, isManagerOrAdmin, CrmController.createStage);
crmRoutes.put("/crm/stages/:stageId", isAuth, isManagerOrAdmin, CrmController.updateStage);
crmRoutes.delete("/crm/stages/:stageId", isAuth, isManagerOrAdmin, CrmController.deleteStage);

// Deals (Oportunidades)
crmRoutes.get("/crm/deals", isAuth, isCollaboratorOrAbove, CrmController.listDeals);
crmRoutes.post("/crm/deals", isAuth, isAgentOrAbove, CrmController.createDeal);
crmRoutes.get("/crm/deals/:dealId", isAuth, isCollaboratorOrAbove, CrmController.showDeal);
crmRoutes.put("/crm/deals/:dealId", isAuth, isAgentOrAbove, CrmController.updateDeal);
crmRoutes.put("/crm/deals/:dealId/stage", isAuth, isAgentOrAbove, CrmController.moveDealStage);
crmRoutes.delete("/crm/deals/:dealId", isAuth, isManagerOrAdmin, CrmController.deleteDeal);
crmRoutes.get("/crm/deals/:dealId/timeline", isAuth, isCollaboratorOrAbove, CrmController.getDealTimeline);

// Retenção e Configurações
crmRoutes.get("/crm/config", isAuth, isCollaboratorOrAbove, CrmController.getConfig);
crmRoutes.put("/crm/config", isAuth, isManagerOrAdmin, CrmController.updateConfig);
crmRoutes.get("/crm/retention/missing", isAuth, isCollaboratorOrAbove, CrmController.getMissingClients);
crmRoutes.get("/crm/retention/birthdays", isAuth, isCollaboratorOrAbove, CrmController.getBirthdayClients);

export default crmRoutes;
