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
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import Deal from "./Deal";
import User from "./User";

@Table
class DealTimeline extends Model<DealTimeline> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Deal)
  @Column
  dealId: number;

  @BelongsTo(() => Deal)
  deal: Deal;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column
  action: string;

  @Column(DataType.TEXT)
  description: string;

  @Column
  oldValue: string;

  @Column
  newValue: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default DealTimeline;
