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
import PipelineStage from "./PipelineStage";
import Deal from "./Deal";

@Table
class Pipeline extends Model<Pipeline> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Default(0)
  @Column
  order: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => PipelineStage)
  stages: PipelineStage[];

  @HasMany(() => Deal)
  deals: Deal[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Pipeline;
