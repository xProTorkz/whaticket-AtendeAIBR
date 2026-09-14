import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import User from "./User";
import UserQueue from "./UserQueue";
import Whatsapp from "./Whatsapp";
import WhatsappQueue from "./WhatsappQueue";
import Company from "./Company";

@Table
class Queue extends Model<Queue> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  color: string;

  @Column
  greetingMessage: string;

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

  @BelongsToMany(() => Whatsapp, () => WhatsappQueue)
  whatsapps: Array<Whatsapp & { WhatsappQueue: WhatsappQueue }>;

  @BelongsToMany(() => User, () => UserQueue)
  users: Array<User & { UserQueue: UserQueue }>;
}

export default Queue;
