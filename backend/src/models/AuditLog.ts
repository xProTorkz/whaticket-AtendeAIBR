import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType,
  Default
} from "sequelize-typescript";

import Company from "./Company";
import User from "./User";

@Table
class AuditLog extends Model<AuditLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Default(1)
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

  @Column
  entity: string;

  @Column
  entityId: string;

  @Column(DataType.TEXT)
  details: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default AuditLog;
