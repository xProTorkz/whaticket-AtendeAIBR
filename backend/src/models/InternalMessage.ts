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

import User from "./User";
import Company from "./Company";

@Table
class InternalMessage extends Model<InternalMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.TEXT)
  text: string;

  @ForeignKey(() => User)
  @Column
  senderId: number;

  @BelongsTo(() => User, "senderId")
  sender: User;

  @ForeignKey(() => User)
  @Column
  receiverId: number;

  @BelongsTo(() => User, "receiverId")
  receiver: User;

  @Default(false)
  @Column
  isGroup: boolean;

  @Column
  groupId: string;

  @Default(false)
  @Column
  read: boolean;

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

export default InternalMessage;
