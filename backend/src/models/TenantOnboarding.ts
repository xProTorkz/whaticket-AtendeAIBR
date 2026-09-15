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

@Table
class TenantOnboarding extends Model<TenantOnboarding> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Default("company_info")
  @Column
  currentStep: string;

  @Default([])
  @Column(DataType.JSON)
  completedSteps: string[];

  @Default("in_progress")
  @Column
  status: string; // "in_progress" | "completed" | "skipped"

  @Column(DataType.JSON)
  metadata: any;

  @Column
  completedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default TenantOnboarding;
