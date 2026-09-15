import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasMany,
  AutoIncrement,
  Default,
  BelongsToMany
} from "sequelize-typescript";

import Contact from "./Contact";
import Message from "./Message";
import Queue from "./Queue";
import User from "./User";
import Whatsapp from "./Whatsapp";
import Company from "./Company";
import TicketNote from "./TicketNote";
import Tag from "./Tag";
import TicketTag from "./TicketTag";
import TicketLifecycleEvent from "./TicketLifecycleEvent";

@Table
class Ticket extends Model<Ticket> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ defaultValue: "pending" })
  status: string;

  @Column
  unreadMessages: number;

  @Column
  lastMessage: string;

  @Default(false)
  @Column
  isGroup: boolean;

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

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @Default("whatsapp")
  @Column
  channel: string;

  @Column
  queueEnteredAt: Date;

  @Column
  startedAt: Date;

  @Column
  firstResponseAt: Date;

  @Column
  closedAt: Date;

  @HasMany(() => Message)
  messages: Message[];

  @HasMany(() => TicketNote)
  notes: TicketNote[];

  @BelongsToMany(() => Tag, () => TicketTag)
  tags: Tag[];

  @HasMany(() => TicketLifecycleEvent)
  lifecycleEvents: TicketLifecycleEvent[];
}

export default Ticket;
