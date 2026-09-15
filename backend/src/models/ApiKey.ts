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
  Index
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({
  tableName: "ApiKeys"
})
class ApiKey extends Model<ApiKey> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING(32))
  keyPrefix: string;

  @Index
  @Column(DataType.STRING(64))
  keyHash: string;

  @Column(DataType.JSON)
  scopes: string[];

  @Column(DataType.DATE)
  expiresAt: Date;

  @Column(DataType.DATE)
  revokedAt: Date;

  @Column(DataType.DATE)
  lastUsedAt: Date;

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

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ApiKey;
