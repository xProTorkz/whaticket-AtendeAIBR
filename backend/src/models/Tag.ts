import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  BelongsToMany,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import Ticket from "./Ticket";
import TicketTag from "./TicketTag";
import Contact from "./Contact";
import ContactTag from "./ContactTag";

@Table
class Tag extends Model<Tag> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Default("#5c67f2")
  @Column
  color: string;

  @Default(0)
  @Column
  kanban: number;

  @Default(0)
  @Column
  order: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsToMany(() => Ticket, () => TicketTag)
  tickets: Ticket[];

  @BelongsToMany(() => Contact, () => ContactTag)
  contacts: Contact[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Tag;
