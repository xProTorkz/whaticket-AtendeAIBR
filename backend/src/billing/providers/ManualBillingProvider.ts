import {
  IBillingProvider,
  CustomerResult,
  SubscriptionResult,
  SubscriptionState,
  WebhookProcessingResult
} from "../IBillingProvider";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import crypto from "crypto";

export class ManualBillingProvider implements IBillingProvider {
  public readonly providerName = "manual";

  async createCustomer(company: Company): Promise<CustomerResult> {
    return {
      customerId: `cust_manual_${company.id}_${crypto.randomBytes(4).toString("hex")}`,
      provider: this.providerName,
      metadata: { companyId: company.id, name: company.name }
    };
  }

  async createSubscription(
    company: Company,
    plan: Plan,
    options?: { trialDays?: number; paymentMethodId?: string; metadata?: any }
  ): Promise<SubscriptionResult> {
    const now = new Date();
    const isTrial = options?.trialDays && options.trialDays > 0;
    const days = isTrial ? options!.trialDays! : 30;
    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return {
      subscriptionId: `sub_manual_${company.id}_${crypto.randomBytes(6).toString("hex")}`,
      provider: this.providerName,
      status: isTrial ? "trialing" : "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      metadata: {
        companyId: company.id,
        planId: plan.id,
        isTrial,
        ...options?.metadata
      }
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; status: SubscriptionState }> {
    return {
      success: true,
      status: "canceled"
    };
  }

  async resumeSubscription(subscriptionId: string): Promise<{ success: boolean; status: SubscriptionState }> {
    return {
      success: true,
      status: "active"
    };
  }

  async processWebhook(payload: any, signature?: string): Promise<WebhookProcessingResult> {
    // Extensible hook for simulated or manual webhook callbacks
    return {
      handled: true,
      event: payload.event || "manual.event",
      companyId: payload.companyId,
      status: payload.status || "active",
      metadata: payload
    };
  }
}

export default ManualBillingProvider;
