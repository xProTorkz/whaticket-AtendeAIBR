import Company from "../models/Company";
import Plan from "../models/Plan";

export type SubscriptionState =
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "suspended"
  | "canceled"
  | "incomplete";

export interface CustomerResult {
  customerId: string;
  provider: string;
  metadata?: any;
}

export interface SubscriptionResult {
  subscriptionId: string;
  provider: string;
  status: SubscriptionState;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  metadata?: any;
}

export interface WebhookProcessingResult {
  handled: boolean;
  event: string;
  companyId?: number;
  status?: SubscriptionState;
  metadata?: any;
}

export interface IBillingProvider {
  readonly providerName: string;

  createCustomer(company: Company): Promise<CustomerResult>;

  createSubscription(
    company: Company,
    plan: Plan,
    options?: { trialDays?: number; paymentMethodId?: string; metadata?: any }
  ): Promise<SubscriptionResult>;

  cancelSubscription(subscriptionId: string): Promise<{ success: boolean; status: SubscriptionState }>;

  resumeSubscription(subscriptionId: string): Promise<{ success: boolean; status: SubscriptionState }>;

  processWebhook(payload: any, signature?: string): Promise<WebhookProcessingResult>;
}
