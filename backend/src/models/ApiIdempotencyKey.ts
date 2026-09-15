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

@Table({
  tableName: "ApiIdempotencyKeys"
})
class ApiIdempotencyKey extends Model<ApiIdempotencyKey> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Index
  @Column(DataType.STRING(128))
  idempotencyKey: string;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.STRING(10))
  method: string;

  @Column(DataType.STRING(255))
  path: string;

  @Column(DataType.INTEGER)
  statusCode: number;

  @Column(DataType.TEXT)
  responseBody: string;

  @Column(DataType.DATE)
  expiresAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ApiIdempotencyKey;
