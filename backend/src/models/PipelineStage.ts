import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  HasMany,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import Pipeline from "./Pipeline";
import Deal from "./Deal";

@Table
class PipelineStage extends Model<PipelineStage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Pipeline)
  @Column
  pipelineId: number;

  @BelongsTo(() => Pipeline)
  pipeline: Pipeline;

  @Column
  name: string;

  @Default("#0088fe")
  @Column
  color: string;

  @Default(0)
  @Column
  order: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => Deal)
  deals: Deal[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default PipelineStage;
