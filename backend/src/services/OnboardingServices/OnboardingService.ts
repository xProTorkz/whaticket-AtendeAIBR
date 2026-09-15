import TenantOnboarding from "../../models/TenantOnboarding";
import Company from "../../models/Company";
import AppError from "../../errors/AppError";

export const ONBOARDING_STEPS = [
  { id: "company_info", title: "Dados da Empresa", order: 1 },
  { id: "branding", title: "Identidade Visual", order: 2 },
  { id: "admin_profile", title: "Perfil do Administrador", order: 3 },
  { id: "team", title: "Equipe & Atendentes", order: 4 },
  { id: "whatsapp", title: "Conexão WhatsApp", order: 5 },
  { id: "queues", title: "Filas de Atendimento", order: 6 },
  { id: "crm_pipeline", title: "Funil de Vendas CRM", order: 7 },
  { id: "testing", title: "Teste de Atendimento", order: 8 },
  { id: "completed", title: "Conclusão & Ativação", order: 9 }
];

export const getOrCreateOnboarding = async (companyId: number): Promise<TenantOnboarding> => {
  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  let onboarding = await TenantOnboarding.findOne({
    where: { companyId }
  });

  if (!onboarding) {
    onboarding = await TenantOnboarding.create({
      companyId,
      currentStep: "company_info",
      completedSteps: [],
      status: "in_progress",
      metadata: {}
    });
  }

  return onboarding;
};

export const updateOnboardingStep = async ({
  companyId,
  step,
  data,
  nextStep
}: {
  companyId: number;
  step: string;
  data?: any;
  nextStep?: string;
}): Promise<TenantOnboarding> => {
  const onboarding = await getOrCreateOnboarding(companyId);

  let completedSteps: string[] = [];
  if (typeof onboarding.completedSteps === "string") {
    try {
      completedSteps = JSON.parse(onboarding.completedSteps);
    } catch (e) {
      completedSteps = [];
    }
  } else if (Array.isArray(onboarding.completedSteps)) {
    completedSteps = [...onboarding.completedSteps];
  }

  if (!completedSteps.includes(step)) {
    completedSteps.push(step);
  }

  let currentMetadata: any = {};
  if (typeof onboarding.metadata === "string") {
    try {
      currentMetadata = JSON.parse(onboarding.metadata);
    } catch (e) {
      currentMetadata = {};
    }
  } else if (onboarding.metadata) {
    currentMetadata = { ...onboarding.metadata };
  }

  const updatedMetadata = {
    ...currentMetadata,
    [step]: data || {}
  };

  const newStep = nextStep || step;

  await onboarding.update({
    currentStep: newStep,
    completedSteps,
    metadata: updatedMetadata
  });

  return onboarding;
};

export const completeOnboarding = async (companyId: number): Promise<TenantOnboarding> => {
  const onboarding = await getOrCreateOnboarding(companyId);

  await onboarding.update({
    currentStep: "completed",
    status: "completed",
    completedAt: new Date()
  });

  return onboarding;
};
