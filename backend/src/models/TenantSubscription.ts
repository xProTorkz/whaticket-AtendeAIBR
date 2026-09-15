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
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import Plan from "./Plan";

@Table
class TenantSubscription extends Model<TenantSubscription> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Plan)
  @Column
  planId: number;

  @BelongsTo(() => Plan)
  plan: Plan;

  @Default("manual")
  @Column
  provider: string; // "manual" | "mercadopago" | "asaas" | "stripe"

  @Column
  externalId: string;

  @Default("active")
  @Column
  status: string; // "trialing" | "active" | "past_due" | "unpaid" | "suspended" | "canceled"

  @Column
  currentPeriodStart: Date;

  @Column
  currentPeriodEnd: Date;

  @Column(DataType.JSON)
  metadata: any;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TenantSubscription;
