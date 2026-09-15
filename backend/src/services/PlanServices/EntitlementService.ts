import Company, { CustomLimits } from "../../models/Company";
import Plan, { PlanCapabilities } from "../../models/Plan";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import Contact from "../../models/Contact";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import Schedule from "../../models/Schedule";
import ApiKey from "../../models/ApiKey";
import Webhook from "../../models/Webhook";
import AppError from "../../errors/AppError";

export interface EffectiveLimits {
  maxUsers: number;
  maxConnections: number;
  maxContacts: number;
  maxCampaigns: number;
  maxContactLists: number;
  maxSchedules: number;
  maxApiKeys: number;
  maxWebhooks: number;
  maxStorageMb: number;
  maxAiTokens: number;
}

export interface ResourceUsage {
  users: number;
  connections: number;
  contacts: number;
  campaigns: number;
  contactLists: number;
  schedules: number;
  apiKeys: number;
  webhooks: number;
}

export interface UsagePercentages {
  users: number;
  connections: number;
  contacts: number;
  campaigns: number;
  contactLists: number;
  schedules: number;
  apiKeys: number;
  webhooks: number;
}

export interface TenantEntitlements {
  companyId: number;
  companyName: string;
  plan: {
    id: number | null;
    name: string;
    description?: string;
    price?: number;
    billingCycle?: string;
  };
  subscription: {
    status: string;
    isTrial: boolean;
    trialEndsAt: Date | null;
    daysRemainingTrial: number | null;
    gracePeriodUntil: Date | null;
    inGracePeriod: boolean;
    isSuspended: boolean;
    isLocked: boolean;
  };
  limits: EffectiveLimits;
  capabilities: PlanCapabilities;
  usage: ResourceUsage;
  percentages: UsagePercentages;
  nearLimit: boolean;
  overLimit: boolean;
  branding: {
    brandName: string | null;
    brandLogo: string | null;
    primaryColor: string;
    secondaryColor: string;
    brandFavicon: string | null;
    loginMessage: string | null;
  };
}

const DEFAULT_LIMITS: EffectiveLimits = {
  maxUsers: 3,
  maxConnections: 1,
  maxContacts: 1000,
  maxCampaigns: 2,
  maxContactLists: 5,
  maxSchedules: 50,
  maxApiKeys: 1,
  maxWebhooks: 2,
  maxStorageMb: 1024,
  maxAiTokens: 0
};

const DEFAULT_CAPABILITIES: PlanCapabilities = {
  crm: true,
  kanban: true,
  campaigns: true,
  schedules: true,
  internalChat: true,
  apiIntegrations: false,
  customBranding: false,
  ai: false
};

export const getTenantEntitlements = async (companyId: number): Promise<TenantEntitlements> => {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "planObj" }]
  });

  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  const plan = company.planObj;

  // 1. Base limits from plan or default
  const baseLimits: EffectiveLimits = {
    maxUsers: plan?.maxUsers ?? DEFAULT_LIMITS.maxUsers,
    maxConnections: plan?.maxConnections ?? DEFAULT_LIMITS.maxConnections,
    maxContacts: plan?.maxContacts ?? DEFAULT_LIMITS.maxContacts,
    maxCampaigns: plan?.maxCampaigns ?? DEFAULT_LIMITS.maxCampaigns,
    maxContactLists: plan?.maxContactLists ?? DEFAULT_LIMITS.maxContactLists,
    maxSchedules: plan?.maxSchedules ?? DEFAULT_LIMITS.maxSchedules,
    maxApiKeys: plan?.maxApiKeys ?? DEFAULT_LIMITS.maxApiKeys,
    maxWebhooks: plan?.maxWebhooks ?? DEFAULT_LIMITS.maxWebhooks,
    maxStorageMb: plan?.maxStorageMb ?? DEFAULT_LIMITS.maxStorageMb,
    maxAiTokens: plan?.maxAiTokens ?? DEFAULT_LIMITS.maxAiTokens
  };

  // 2. Merge tenant custom limits overrides
  let customLimits: CustomLimits = {};
  if (typeof company.customLimits === "string") {
    try {
      customLimits = JSON.parse(company.customLimits);
    } catch (e) {
      customLimits = {};
    }
  } else if (company.customLimits) {
    customLimits = company.customLimits;
  }

  const limits: EffectiveLimits = {
    maxUsers: customLimits.maxUsers !== undefined ? Number(customLimits.maxUsers) : baseLimits.maxUsers,
    maxConnections: customLimits.maxConnections !== undefined ? Number(customLimits.maxConnections) : baseLimits.maxConnections,
    maxContacts: customLimits.maxContacts !== undefined ? Number(customLimits.maxContacts) : baseLimits.maxContacts,
    maxCampaigns: customLimits.maxCampaigns !== undefined ? Number(customLimits.maxCampaigns) : baseLimits.maxCampaigns,
    maxContactLists: customLimits.maxContactLists !== undefined ? Number(customLimits.maxContactLists) : baseLimits.maxContactLists,
    maxSchedules: customLimits.maxSchedules !== undefined ? Number(customLimits.maxSchedules) : baseLimits.maxSchedules,
    maxApiKeys: customLimits.maxApiKeys !== undefined ? Number(customLimits.maxApiKeys) : baseLimits.maxApiKeys,
    maxWebhooks: customLimits.maxWebhooks !== undefined ? Number(customLimits.maxWebhooks) : baseLimits.maxWebhooks,
    maxStorageMb: customLimits.maxStorageMb !== undefined ? Number(customLimits.maxStorageMb) : baseLimits.maxStorageMb,
    maxAiTokens: customLimits.maxAiTokens !== undefined ? Number(customLimits.maxAiTokens) : baseLimits.maxAiTokens
  };

  // 3. Base capabilities
  let planCaps: PlanCapabilities = DEFAULT_CAPABILITIES;
  if (plan?.capabilities) {
    planCaps = typeof plan.capabilities === "string" ? JSON.parse(plan.capabilities) : plan.capabilities;
  }
  const customCaps = (typeof company.customCapabilities === "string"
    ? JSON.parse(company.customCapabilities)
    : company.customCapabilities || {}) as PlanCapabilities;

  const capabilities: PlanCapabilities = {
    ...DEFAULT_CAPABILITIES,
    ...planCaps,
    ...customCaps
  };

  // 4. Subscription & Trial evaluation
  const now = new Date();
  let status = company.subscriptionStatus || "active";
  const isTrial = Boolean(company.isTrial);
  const trialEndsAt = company.trialEndsAt ? new Date(company.trialEndsAt) : null;
  let daysRemainingTrial: number | null = null;

  if (isTrial && trialEndsAt) {
    const diffTime = trialEndsAt.getTime() - now.getTime();
    daysRemainingTrial = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffTime < 0) {
      status = "trial_expired";
    }
  }

  const gracePeriodUntil = company.gracePeriodUntil ? new Date(company.gracePeriodUntil) : null;
  const inGracePeriod = Boolean(gracePeriodUntil && gracePeriodUntil > now);
  const isSuspended = company.status === false || status === "suspended";
  const isLocked = isSuspended || (status === "trial_expired" && !inGracePeriod);

  // 5. Calculate real usage counts
  const [
    users,
    connections,
    contacts,
    campaigns,
    contactLists,
    schedules,
    apiKeys,
    webhooks
  ] = await Promise.all([
    User.count({ where: { companyId } }),
    Whatsapp.count({ where: { companyId } }),
    Contact.count({ where: { companyId } }),
    Campaign.count({ where: { companyId } }),
    ContactList.count({ where: { companyId } }),
    Schedule.count({ where: { companyId, status: "PENDENTE" } }),
    ApiKey.count({ where: { companyId, revokedAt: null } }),
    Webhook.count({ where: { companyId } })
  ]);

  const usage: ResourceUsage = {
    users,
    connections,
    contacts,
    campaigns,
    contactLists,
    schedules,
    apiKeys,
    webhooks
  };

  // 6. Percentages & Near/Over Limit flags
  const calcPercent = (curr: number, max: number) => {
    if (!max || max <= 0) return 0;
    return Math.round((curr / max) * 100);
  };

  const percentages: UsagePercentages = {
    users: calcPercent(users, limits.maxUsers),
    connections: calcPercent(connections, limits.maxConnections),
    contacts: calcPercent(contacts, limits.maxContacts),
    campaigns: calcPercent(campaigns, limits.maxCampaigns),
    contactLists: calcPercent(contactLists, limits.maxContactLists),
    schedules: calcPercent(schedules, limits.maxSchedules),
    apiKeys: calcPercent(apiKeys, limits.maxApiKeys),
    webhooks: calcPercent(webhooks, limits.maxWebhooks)
  };

  const pValues = Object.values(percentages);
  const nearLimit = pValues.some(p => p >= 80);
  const overLimit = pValues.some(p => p > 100);

  return {
    companyId: company.id,
    companyName: company.name,
    plan: {
      id: plan ? plan.id : null,
      name: plan ? plan.name : (company.plan || "Start"),
      description: plan?.description,
      price: plan?.price,
      billingCycle: plan?.billingCycle
    },
    subscription: {
      status,
      isTrial,
      trialEndsAt,
      daysRemainingTrial,
      gracePeriodUntil,
      inGracePeriod,
      isSuspended,
      isLocked
    },
    limits,
    capabilities,
    usage,
    percentages,
    nearLimit,
    overLimit,
    branding: {
      brandName: company.brandName || company.name,
      brandLogo: company.brandLogo,
      primaryColor: company.primaryColor || "#006b52",
      secondaryColor: company.secondaryColor || "#004d40",
      brandFavicon: company.brandFavicon,
      loginMessage: company.loginMessage
    }
  };
};

export const canCreateResource = async (
  companyId: number,
  resource: "users" | "connections" | "contacts" | "campaigns" | "contactLists" | "schedules" | "apiKeys" | "webhooks"
): Promise<{ allowed: boolean; reason?: string; current: number; max: number }> => {
  const entitlements = await getTenantEntitlements(companyId);

  if (entitlements.subscription.isLocked) {
    const reason = entitlements.subscription.isSuspended ? "ERR_TENANT_SUSPENDED" : "ERR_TRIAL_EXPIRED";
    return {
      allowed: false,
      reason,
      current: entitlements.usage[resource] || 0,
      max: entitlements.limits[resourceLimitKey(resource)] || 0
    };
  }

  const current = entitlements.usage[resource] || 0;
  const max = entitlements.limits[resourceLimitKey(resource)] || 0;

  if (current >= max) {
    return {
      allowed: false,
      reason: "ERR_PLAN_LIMIT_REACHED",
      current,
      max
    };
  }

  return { allowed: true, current, max };
};

export const hasCapability = async (
  companyId: number,
  capability: keyof PlanCapabilities
): Promise<boolean> => {
  const entitlements = await getTenantEntitlements(companyId);

  if (entitlements.subscription.isLocked) {
    return false;
  }

  return Boolean(entitlements.capabilities[capability]);
};

export const assertCanCreateResource = async (
  companyId: number,
  resource: "users" | "connections" | "contacts" | "campaigns" | "contactLists" | "schedules" | "apiKeys" | "webhooks"
): Promise<void> => {
  const result = await canCreateResource(companyId, resource);
  if (!result.allowed) {
    throw new AppError(
      result.reason === "ERR_TENANT_SUSPENDED"
        ? "ERR_TENANT_SUSPENDED"
        : result.reason === "ERR_TRIAL_EXPIRED"
        ? "ERR_TRIAL_EXPIRED"
        : `Limite do plano atingido para ${resource} (${result.current}/${result.max}). Faça upgrade do plano.`,
      403
    );
  }
};

export const assertHasCapability = async (
  companyId: number,
  capability: keyof PlanCapabilities
): Promise<void> => {
  const allowed = await hasCapability(companyId, capability);
  if (!allowed) {
    throw new AppError(`Recurso não disponível no plano atual (${String(capability)}). Faça upgrade do plano.`, 403);
  }
};

export const assertTenantActive = async (companyId: number): Promise<void> => {
  const entitlements = await getTenantEntitlements(companyId);
  if (entitlements.subscription.isLocked) {
    throw new AppError(
      entitlements.subscription.isSuspended
        ? "Sua empresa está suspensa. Entre em contato com o suporte."
        : "Seu período de teste expirou. Faça upgrade para continuar utilizando o sistema.",
      403
    );
  }
};

function resourceLimitKey(resource: string): keyof EffectiveLimits {
  switch (resource) {
    case "users":
      return "maxUsers";
    case "connections":
      return "maxConnections";
    case "contacts":
      return "maxContacts";
    case "campaigns":
      return "maxCampaigns";
    case "contactLists":
      return "maxContactLists";
    case "schedules":
      return "maxSchedules";
    case "apiKeys":
      return "maxApiKeys";
    case "webhooks":
      return "maxWebhooks";
    default:
      return "maxUsers";
  }
}
