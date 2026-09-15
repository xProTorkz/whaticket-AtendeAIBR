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
  HasMany,
  DataType,
  Index
} from "sequelize-typescript";
import Company from "./Company";
import WebhookDelivery from "./WebhookDelivery";

@Table({
  tableName: "Webhooks"
})
class Webhook extends Model<Webhook> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING(500))
  url: string;

  @Column(DataType.STRING(128))
  secret: string;

  @Column(DataType.JSON)
  events: string[];

  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => WebhookDelivery)
  deliveries: WebhookDelivery[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Webhook;
