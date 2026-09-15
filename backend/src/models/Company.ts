import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
  HasOne,
  DataType
} from "sequelize-typescript";

import User from "./User";
import Contact from "./Contact";
import Ticket from "./Ticket";
import Queue from "./Queue";
import Whatsapp from "./Whatsapp";
import QuickAnswer from "./QuickAnswer";
import Setting from "./Setting";
import Plan, { PlanCapabilities } from "./Plan";
import TenantOnboarding from "./TenantOnboarding";
import TenantSubscription from "./TenantSubscription";

export interface CustomLimits {
  maxUsers?: number;
  maxConnections?: number;
  maxContacts?: number;
  maxCampaigns?: number;
  maxContactLists?: number;
  maxSchedules?: number;
  maxApiKeys?: number;
  maxWebhooks?: number;
  maxStorageMb?: number;
  maxAiTokens?: number;
  [key: string]: number | undefined;
}

@Table
class Company extends Model<Company> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Default(true)
  @Column
  status: boolean;

  @Default("default")
  @Column
  plan: string;

  @ForeignKey(() => Plan)
  @Column
  planId: number;

  @BelongsTo(() => Plan)
  planObj: Plan;

  @Default("active")
  @Column
  subscriptionStatus: string; // "trial" | "active" | "past_due" | "unpaid" | "suspended" | "canceled" | "trial_expired"

  @Default(false)
  @Column
  isTrial: boolean;

  @Column
  trialEndsAt: Date;

  @Column
  gracePeriodUntil: Date;

  @Column(DataType.JSON)
  customLimits: CustomLimits;

  @Column(DataType.JSON)
  customCapabilities: PlanCapabilities;

  @Column
  brandName: string;

  @Column
  brandLogo: string;

  @Default("#006b52")
  @Column
  primaryColor: string;

  @Default("#004d40")
  @Column
  secondaryColor: string;

  @Column
  brandFavicon: string;

  @Column(DataType.TEXT)
  loginMessage: string;

  @Column
  dueDate: string;

  @Column
  recurrence: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => User)
  users: User[];

  @HasMany(() => Contact)
  contacts: Contact[];

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => Queue)
  queues: Queue[];

  @HasMany(() => Whatsapp)
  whatsapps: Whatsapp[];

  @HasMany(() => QuickAnswer)
  quickAnswers: QuickAnswer[];

  @HasMany(() => Setting)
  settings: Setting[];

  @HasOne(() => TenantOnboarding)
  onboarding: TenantOnboarding;

  @HasMany(() => TenantSubscription)
  subscriptions: TenantSubscription[];
}

export default Company;
