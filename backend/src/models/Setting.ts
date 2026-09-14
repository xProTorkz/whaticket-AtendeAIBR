import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import Company from "./Company";

@Table
class Setting extends Model<Setting> {
  @PrimaryKey
  @Column
  key: string;

  @Column
  value: string;

  @Default(1)
  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Setting;
