import { IBillingProvider, SubscriptionResult, SubscriptionState } from "./IBillingProvider";
import ManualBillingProvider from "./providers/ManualBillingProvider";
import Company from "../models/Company";
import Plan from "../models/Plan";
import TenantSubscription from "../models/TenantSubscription";
import AppError from "../errors/AppError";

class BillingService {
  private provider: IBillingProvider;

  constructor(provider?: IBillingProvider) {
    this.provider = provider || new ManualBillingProvider();
  }

  public setProvider(provider: IBillingProvider): void {
    this.provider = provider;
  }

  public getProviderName(): string {
    return this.provider.providerName;
  }

  public async subscribeTenant(
    companyId: number,
    planId: number,
    options?: { trialDays?: number; metadata?: any }
  ): Promise<TenantSubscription> {
    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
    }

    const plan = await Plan.findByPk(planId);
    if (!plan) {
      throw new AppError("ERR_PLAN_NOT_FOUND", 404);
    }

    const subResult: SubscriptionResult = await this.provider.createSubscription(company, plan, options);

    const subscription = await TenantSubscription.create({
      companyId: company.id,
      planId: plan.id,
      provider: subResult.provider,
      externalId: subResult.subscriptionId,
      status: subResult.status,
      currentPeriodStart: subResult.currentPeriodStart,
      currentPeriodEnd: subResult.currentPeriodEnd,
      metadata: subResult.metadata
    });

    const isTrial = subResult.status === "trialing";
    await company.update({
      planId: plan.id,
      plan: plan.name,
      subscriptionStatus: isTrial ? "trial" : "active",
      isTrial,
      trialEndsAt: isTrial ? subResult.currentPeriodEnd : null
    });

    return subscription;
  }

  public async cancelTenantSubscription(companyId: number): Promise<void> {
    const activeSub = await TenantSubscription.findOne({
      where: { companyId, status: "active" },
      order: [["createdAt", "DESC"]]
    });

    if (activeSub && activeSub.externalId) {
      await this.provider.cancelSubscription(activeSub.externalId);
      await activeSub.update({ status: "canceled" });
    }

    const company = await Company.findByPk(companyId);
    if (company) {
      await company.update({ subscriptionStatus: "canceled" });
    }
  }

  public async handleWebhook(payload: any, signature?: string) {
    return this.provider.processWebhook(payload, signature);
  }
}

export default new BillingService();
