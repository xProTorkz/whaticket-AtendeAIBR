import { Router } from "express";

import healthRoutes from "./healthRoutes";
import userRoutes from "./userRoutes";
import authRoutes from "./authRoutes";
import settingRoutes from "./settingRoutes";
import contactRoutes from "./contactRoutes";
import ticketRoutes from "./ticketRoutes";
import whatsappRoutes from "./whatsappRoutes";
import messageRoutes from "./messageRoutes";
import whatsappSessionRoutes from "./whatsappSessionRoutes";
import queueRoutes from "./queueRoutes";
import quickAnswerRoutes from "./quickAnswerRoutes";
import apiRoutes from "./apiRoutes";
import companyRoutes from "./companyRoutes";
import ticketNoteRoutes from "./ticketNoteRoutes";
import internalChatRoutes from "./internalChatRoutes";
import dashboardRoutes from "./dashboardRoutes";
import tagRoutes from "./tagRoutes";
import crmRoutes from "./crmRoutes";
import scheduleRoutes from "./scheduleRoutes";
import contactListRoutes from "./contactListRoutes";
import campaignRoutes from "./campaignRoutes";
import campaignSettingRoutes from "./campaignSettingRoutes";
import publicApiRoutes from "./publicApiRoutes";
import apiKeyRoutes from "./apiKeyRoutes";
import webhookRoutes from "./webhookRoutes";
import onboardingRoutes from "./onboardingRoutes";
import brandingRoutes from "./brandingRoutes";
import planRoutes from "./planRoutes";
import superAdminRoutes from "./superAdminRoutes";
import subscriptionRoutes from "./subscriptionRoutes";

const routes = Router();

// Public health and readiness probes
routes.use(healthRoutes);

routes.use(userRoutes);
routes.use("/auth", authRoutes);
routes.use(settingRoutes);
routes.use(contactRoutes);
routes.use(ticketRoutes);
routes.use(ticketNoteRoutes);
routes.use(internalChatRoutes);
routes.use(dashboardRoutes);
routes.use(tagRoutes);
routes.use(crmRoutes);
routes.use(scheduleRoutes);
routes.use(contactListRoutes);
routes.use(campaignRoutes);
routes.use(campaignSettingRoutes);
routes.use(whatsappRoutes);
routes.use(messageRoutes);
routes.use(whatsappSessionRoutes);
routes.use(queueRoutes);
routes.use(quickAnswerRoutes);
routes.use(companyRoutes);
routes.use("/api/messages", apiRoutes);
routes.use("/api/v1", publicApiRoutes);
routes.use(apiKeyRoutes);
routes.use(webhookRoutes);
routes.use(onboardingRoutes);
routes.use(brandingRoutes);
routes.use(planRoutes);
routes.use(superAdminRoutes);
routes.use(subscriptionRoutes);

export default routes;
