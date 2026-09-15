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
  HasMany,
  Default,
  DataType
} from "sequelize-typescript";
import Company from "./Company";
import Contact from "./Contact";
import User from "./User";
import Queue from "./Queue";
import Ticket from "./Ticket";
import Pipeline from "./Pipeline";
import PipelineStage from "./PipelineStage";
import DealTimeline from "./DealTimeline";

@Table
class Deal extends Model<Deal> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Default(0.0)
  @Column(DataType.DECIMAL(12, 2))
  value: number;

  @Default("medium")
  @Column
  priority: string;

  @Column(DataType.DATEONLY)
  expectedCloseDate: string;

  @Default("open")
  @Column
  status: string;

  @Column(DataType.TEXT)
  lostReason: string;

  @Column(DataType.TEXT)
  notes: string;

  @Default(0)
  @Column
  order: number;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Pipeline)
  @Column
  pipelineId: number;

  @BelongsTo(() => Pipeline)
  pipeline: Pipeline;

  @ForeignKey(() => PipelineStage)
  @Column
  stageId: number;

  @BelongsTo(() => PipelineStage)
  stage: PipelineStage;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => DealTimeline)
  timelines: DealTimeline[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Deal;
