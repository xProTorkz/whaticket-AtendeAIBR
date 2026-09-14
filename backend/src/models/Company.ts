import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  HasMany
} from "sequelize-typescript";

import User from "./User";
import Contact from "./Contact";
import Ticket from "./Ticket";
import Queue from "./Queue";
import Whatsapp from "./Whatsapp";
import QuickAnswer from "./QuickAnswer";
import Setting from "./Setting";

@Table
class Company extends Model<Company> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Default(true)
  @Column
  status: boolean;

  @Default("default")
  @Column
  plan: string;

  @Column
  dueDate: string;

  @Column
  recurrence: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => User)
  users: User[];

  @HasMany(() => Contact)
  contacts: Contact[];

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => Queue)
  queues: Queue[];

  @HasMany(() => Whatsapp)
  whatsapps: Whatsapp[];

  @HasMany(() => QuickAnswer)
  quickAnswers: QuickAnswer[];

  @HasMany(() => Setting)
  settings: Setting[];
}

export default Company;
