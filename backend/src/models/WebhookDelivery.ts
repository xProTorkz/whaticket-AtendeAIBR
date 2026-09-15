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
import Webhook from "./Webhook";
import Company from "./Company";

@Table({
  tableName: "WebhookDeliveries"
})
class WebhookDelivery extends Model<WebhookDelivery> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Webhook)
  @Column
  webhookId: number;

  @BelongsTo(() => Webhook)
  webhook: Webhook;

  @Column(DataType.STRING(100))
  event: string;

  @Column(DataType.TEXT)
  payload: string;

  @Index
  @Column(DataType.STRING(20))
  status: "PENDING" | "SUCCESS" | "FAILED";

  @Column(DataType.INTEGER)
  attempts: number;

  @Column(DataType.INTEGER)
  lastResponseStatus: number | null;

  @Column(DataType.TEXT)
  lastResponseBody: string | null;

  @Column(DataType.TEXT)
  lastError: string | null;

  @Column(DataType.DATE)
  nextRetryAt: Date | null;

  @Column(DataType.DATE)
  deliveredAt: Date | null;

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

export default WebhookDelivery;
