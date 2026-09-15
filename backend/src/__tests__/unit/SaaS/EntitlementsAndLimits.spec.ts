import { truncate, disconnect } from "../../utils/database";
import Company from "../../../models/Company";
import Plan from "../../../models/Plan";
import User from "../../../models/User";
import Whatsapp from "../../../models/Whatsapp";
import TenantOnboarding from "../../../models/TenantOnboarding";
import {
  getTenantEntitlements,
  canCreateResource,
  hasCapability,
  assertCanCreateResource,
  assertHasCapability
} from "../../../services/PlanServices/EntitlementService";
import CreateUserService from "../../../services/UserServices/CreateUserService";
import CreateWhatsAppService from "../../../services/WhatsappService/CreateWhatsAppService";
import CreateCampaignService from "../../../services/CampaignServices/CreateCampaignService";
import * as CompanyController from "../../../controllers/CompanyController";
import * as SuperAdminController from "../../../controllers/SuperAdminController";
import * as SubscriptionController from "../../../controllers/SubscriptionController";
import * as BrandingController from "../../../controllers/BrandingController";
import * as OnboardingService from "../../../services/OnboardingServices/OnboardingService";
import AuthUserService from "../../../services/UserServices/AuthUserService";

jest.mock("../../../providers/WhatsApp/whatsappProvider", () => ({
  whatsappProvider: {
    sendMessage: jest.fn().mockResolvedValue({ id: "msg-mock", body: "mock" }),
    sendMedia: jest.fn().mockResolvedValue({ id: "msg-media-mock", body: "mock" }),
    checkNumber: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock("../../../queues", () => ({
  webhookQueue: { add: jest.fn().mockResolvedValue({ id: "job-w1" }) },
  scheduleQueue: { add: jest.fn().mockResolvedValue({ id: "job-1" }) },
  campaignQueue: { add: jest.fn().mockResolvedValue({ id: "job-c1" }) }
}));

jest.mock("../../../libs/socket", () => ({
  getIO: () => ({
    emit: jest.fn(),
    to: jest.fn().mockReturnThis()
  })
}));

describe("SaaS Entitlements, Limits, SuperAdmin, Onboarding & Branding (Issue #18)", () => {
  const TENANT_A = 1;
  const TENANT_B = 2;

  let planStart: Plan;
  let planPro: Plan;

  beforeEach(async () => {
    await truncate();
    jest.clearAllMocks();

    // Setup Plans
    planStart = (await Plan.findByPk(1))!;
    await planStart.update({
      maxUsers: 2,
      maxConnections: 1,
      maxContacts: 50,
      maxCampaigns: 1,
      capabilities: {
        crm: true,
        kanban: true,
        campaigns: false,
        schedules: true,
        internalChat: true,
        apiIntegrations: false,
        customBranding: false,
        ai: false
      }
    });

    planPro = (await Plan.findByPk(2))!;

    // Setup Company 1 (Tenant A) on Start plan
    const company1 = await Company.findByPk(TENANT_A);
    if (company1) {
      await company1.update({
        planId: planStart.id,
        plan: planStart.name,
        subscriptionStatus: "active",
        isTrial: false,
        customLimits: null,
        customCapabilities: null
      });
    }

    // Setup Company 2 (Tenant B) on Pro plan
    await Company.findOrCreate({
      where: { id: TENANT_B },
      defaults: {
        id: TENANT_B,
        name: "Empresa Beta",
        plan: planPro.name,
        planId: planPro.id,
        status: true,
        subscriptionStatus: "active",
        isTrial: false
      }
    });
  });

  afterAll(async () => {
    await disconnect();
  });

  describe("1. Segurança de Planos e Limites", () => {
    it("deve impedir que admin comum de tenant altere o próprio plano ou limites", async () => {
      const req = {
        params: { id: String(TENANT_A) },
        body: { planId: planPro.id, name: "Empresa Tentando Mudar Plano" },
        user: { id: "1", profile: "admin", companyId: TENANT_A, isSuperAdmin: false }
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await expect(CompanyController.update(req, res)).rejects.toMatchObject({
        statusCode: 403,
        message: "ERR_CANNOT_CHANGE_OWN_PLAN"
      });

      // Also verify SubscriptionController endpoint
      await expect(SubscriptionController.updateMyPlan(req, res)).rejects.toMatchObject({
        statusCode: 403,
        message: "ERR_CANNOT_CHANGE_OWN_PLAN"
      });
    });

    it("deve permitir que SuperAdmin altere plano e limites da empresa", async () => {
      const req = {
        params: { id: String(TENANT_A) },
        body: { planId: planPro.id },
        user: { id: "99", profile: "admin", companyId: 1, isSuperAdmin: true }
      } as any;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await SuperAdminController.updateCompanyPlan(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const company = await Company.findByPk(TENANT_A);
      expect(company?.planId).toBe(planPro.id);
      expect(company?.plan).toBe("Pro");

      // SuperAdmin sets custom limits override
      const reqLimits = {
        params: { id: String(TENANT_A) },
        body: { customLimits: { maxUsers: 25, maxConnections: 7 } },
        user: { id: "99", profile: "admin", companyId: 1, isSuperAdmin: true }
      } as any;

      await SuperAdminController.updateCompanyLimits(reqLimits, res);
      const entitlements = await getTenantEntitlements(TENANT_A);
      expect(entitlements.limits.maxUsers).toBe(25);
      expect(entitlements.limits.maxConnections).toBe(7);
    });
  });

  describe("2. Enforçamento de Limites e Capabilities", () => {
    it("deve bloquear criação de usuários quando atingir o limite maxUsers", async () => {
      // Plan Start has maxUsers: 2
      // Create user 1 and user 2
      await CreateUserService({
        name: "User 1",
        email: "user1@tenant-a.com",
        password: "password123",
        companyId: TENANT_A,
        profile: "agent"
      });

      await CreateUserService({
        name: "User 2",
        email: "user2@tenant-a.com",
        password: "password123",
        companyId: TENANT_A,
        profile: "agent"
      });

      // 3rd user exceeds maxUsers (2)
      await expect(
        CreateUserService({
          name: "User 3",
          email: "user3@tenant-a.com",
          password: "password123",
          companyId: TENANT_A,
          profile: "agent"
        })
      ).rejects.toMatchObject({
        statusCode: 403
      });
    });

    it("deve bloquear criação de conexões WhatsApp quando atingir o limite maxConnections", async () => {
      // Plan Start has maxConnections: 1
      await CreateWhatsAppService({
        name: "Wpp 1",
        isDefault: true,
        companyId: TENANT_A
      });

      // 2nd connection exceeds limit
      await expect(
        CreateWhatsAppService({
          name: "Wpp 2",
          isDefault: false,
          companyId: TENANT_A
        })
      ).rejects.toMatchObject({
        statusCode: 403
      });
    });

    it("deve bloquear recurso quando capability não estiver disponível no plano", async () => {
      // Plan Start has campaigns: false
      await expect(
        CreateCampaignService({
          campaignData: { name: "Campanha Promocional" },
          companyId: TENANT_A
        })
      ).rejects.toMatchObject({
        statusCode: 403
      });

      // On Tenant B (Pro plan), capability is true
      const campaign = await CreateCampaignService({
        campaignData: { name: "Campanha Pro" },
        companyId: TENANT_B
      });
      expect(campaign.id).toBeDefined();
    });
  });

  describe("3. Downgrade Seguro", () => {
    it("não deve excluir usuários ao sofrer downgrade e deve bloquear novas criações com status de overLimit", async () => {
      // Setup company with 2 users
      await CreateUserService({
        name: "User 1",
        email: "user1@tenant-a.com",
        password: "password123",
        companyId: TENANT_A,
        profile: "agent"
      });

      await CreateUserService({
        name: "User Extra",
        email: "extra@tenant-a.com",
        password: "password123",
        companyId: TENANT_A,
        profile: "agent"
      });

      const totalBefore = await User.count({ where: { companyId: TENANT_A } });
      expect(totalBefore).toBe(2);

      // SuperAdmin applies downgrade to maxUsers: 1
      const company = await Company.findByPk(TENANT_A);
      await company?.update({ customLimits: { maxUsers: 1 } });

      // Check that existing users were NOT deleted
      const totalAfter = await User.count({ where: { companyId: TENANT_A } });
      expect(totalAfter).toBe(2);

      // Check entitlements reflect overLimit
      const entitlements = await getTenantEntitlements(TENANT_A);
      expect(entitlements.limits.maxUsers).toBe(1);
      expect(entitlements.usage.users).toBe(2);
      expect(entitlements.overLimit).toBe(true);
      expect(entitlements.percentages.users).toBe(200);

      // Attempting to create user 3 must be blocked
      await expect(
        CreateUserService({
          name: "User Blocked",
          email: "blocked@tenant-a.com",
          password: "password123",
          companyId: TENANT_A,
          profile: "agent"
        })
      ).rejects.toMatchObject({
        statusCode: 403
      });
    });
  });

  describe("4. Trial e Suspensão", () => {
    it("deve bloquear criação de recursos quando o trial expirar", async () => {
      const company = await Company.findByPk(TENANT_A);
      await company?.update({
        isTrial: true,
        trialEndsAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // Expired 1 day ago
        gracePeriodUntil: null
      });

      const entitlements = await getTenantEntitlements(TENANT_A);
      expect(entitlements.subscription.status).toBe("trial_expired");
      expect(entitlements.subscription.isLocked).toBe(true);

      await expect(assertCanCreateResource(TENANT_A, "users")).rejects.toMatchObject({
        statusCode: 403,
        message: "ERR_TRIAL_EXPIRED"
      });
    });

    it("deve bloquear autenticação de usuário quando a empresa estiver suspensa", async () => {
      const user = await CreateUserService({
        name: "User Login Test",
        email: "userlogintest@tenant-a.com",
        password: "password123",
        companyId: TENANT_A,
        profile: "agent"
      });

      // Suspend company
      const company = await Company.findByPk(TENANT_A);
      await company?.update({ subscriptionStatus: "suspended" });

      await expect(
        AuthUserService({
          email: "userlogintest@tenant-a.com",
          password: "password123"
        })
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "ERR_TENANT_SUSPENDED"
      });
    });
  });

  describe("5. Onboarding Guiado", () => {
    it("deve inicializar, persistir progresso de etapas e permitir conclusão", async () => {
      const initial = await OnboardingService.getOrCreateOnboarding(TENANT_A);
      expect(initial.currentStep).toBe("company_info");
      expect(initial.status).toBe("in_progress");

      // Save step 1 (company_info) and advance to branding
      const step1 = await OnboardingService.updateOnboardingStep({
        companyId: TENANT_A,
        step: "company_info",
        data: { document: "12.345.678/0001-90", phone: "11999998888" },
        nextStep: "branding"
      });

      expect(step1.completedSteps).toContain("company_info");
      expect(step1.currentStep).toBe("branding");
      expect(step1.metadata.company_info.document).toBe("12.345.678/0001-90");

      // Save step 2 (branding) and advance to admin_profile
      const step2 = await OnboardingService.updateOnboardingStep({
        companyId: TENANT_A,
        step: "branding",
        data: { primaryColor: "#00aa66" },
        nextStep: "admin_profile"
      });

      expect(step2.completedSteps).toEqual(["company_info", "branding"]);
      expect(step2.currentStep).toBe("admin_profile");

      // Complete onboarding
      const completed = await OnboardingService.completeOnboarding(TENANT_A);
      expect(completed.status).toBe("completed");
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe("6. Branding Multi-Tenant", () => {
    it("não deve vazar configurações de marca entre empresas diferentes", async () => {
      // Tenant A branding
      const reqA = {
        body: {
          brandName: "Alpha Telecom",
          primaryColor: "#ff5500",
          secondaryColor: "#992200",
          loginMessage: "Portal Alpha Telecom"
        },
        user: { id: "1", profile: "admin", companyId: TENANT_A, isSuperAdmin: false }
      } as any;

      const resA = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await BrandingController.update(reqA, resA);

      // Tenant B branding
      const reqB = {
        body: {
          brandName: "Beta Solutions",
          primaryColor: "#0066ff",
          secondaryColor: "#002299",
          loginMessage: "Portal Beta Solutions"
        },
        user: { id: "2", profile: "admin", companyId: TENANT_B, isSuperAdmin: false }
      } as any;

      const resB = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any;

      await BrandingController.update(reqB, resB);

      // Verify Tenant A branding
      const entitlementsA = await getTenantEntitlements(TENANT_A);
      expect(entitlementsA.branding.brandName).toBe("Alpha Telecom");
      expect(entitlementsA.branding.primaryColor).toBe("#ff5500");
      expect(entitlementsA.branding.loginMessage).toBe("Portal Alpha Telecom");

      // Verify Tenant B branding
      const entitlementsB = await getTenantEntitlements(TENANT_B);
      expect(entitlementsB.branding.brandName).toBe("Beta Solutions");
      expect(entitlementsB.branding.primaryColor).toBe("#0066ff");
      expect(entitlementsB.branding.loginMessage).toBe("Portal Beta Solutions");

      // Verify Public Endpoint segregation
      const reqPublicA = { params: { companyId: String(TENANT_A) } } as any;
      const resPublicA = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await BrandingController.showPublic(reqPublicA, resPublicA);
      expect(resPublicA.json).toHaveBeenCalledWith(expect.objectContaining({
        brandName: "Alpha Telecom",
        primaryColor: "#ff5500"
      }));

      const reqPublicB = { params: { companyId: String(TENANT_B) } } as any;
      const resPublicB = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      await BrandingController.showPublic(reqPublicB, resPublicB);
      expect(resPublicB.json).toHaveBeenCalledWith(expect.objectContaining({
        brandName: "Beta Solutions",
        primaryColor: "#0066ff"
      }));
    });
  });
});
