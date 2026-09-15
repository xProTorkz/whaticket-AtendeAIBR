import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  DataType,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";

export interface PlanCapabilities {
  crm?: boolean;
  kanban?: boolean;
  campaigns?: boolean;
  schedules?: boolean;
  internalChat?: boolean;
  apiIntegrations?: boolean;
  customBranding?: boolean;
  ai?: boolean;
  [key: string]: boolean | undefined;
}

@Table
class Plan extends Model<Plan> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Default(3)
  @Column
  maxUsers: number;

  @Default(1)
  @Column
  maxConnections: number;

  @Default(1000)
  @Column
  maxContacts: number;

  @Default(2)
  @Column
  maxCampaigns: number;

  @Default(5)
  @Column
  maxContactLists: number;

  @Default(50)
  @Column
  maxSchedules: number;

  @Default(1)
  @Column
  maxApiKeys: number;

  @Default(2)
  @Column
  maxWebhooks: number;

  @Default(1024)
  @Column
  maxStorageMb: number;

  @Default(0)
  @Column
  maxAiTokens: number;

  @Default({
    crm: true,
    kanban: true,
    campaigns: true,
    schedules: true,
    internalChat: true,
    apiIntegrations: false,
    customBranding: false,
    ai: false
  })
  @Column(DataType.JSON)
  capabilities: PlanCapabilities;

  @Default(0)
  @Column
  price: number; // in cents

  @Default("monthly")
  @Column
  billingCycle: string;

  @Default(true)
  @Column
  isPublic: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Company)
  companies: Company[];
}

export default Plan;
