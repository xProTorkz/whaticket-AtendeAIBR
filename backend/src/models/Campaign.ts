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
  Default
} from "sequelize-typescript";
import Company from "./Company";
import ContactList from "./ContactList";
import Whatsapp from "./Whatsapp";
import User from "./User";
import CampaignShipping from "./CampaignShipping";

@Table
class Campaign extends Model<Campaign> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Default("INATIVA")
  @Column
  status: string;

  @Default(false)
  @Column
  confirmation: boolean;

  @Column
  scheduledAt: Date;

  @Column
  completedAt: Date;

  @Column
  message1: string;

  @Column
  message2: string;

  @Column
  message3: string;

  @Column
  message4: string;

  @Column
  message5: string;

  @Column
  confirmationMessage1: string;

  @Column
  confirmationMessage2: string;

  @Column
  confirmationMessage3: string;

  @Column
  confirmationMessage4: string;

  @Column
  confirmationMessage5: string;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => ContactList)
  @Column
  contactListId: number;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @Column
  tagListId: string;

  @Default(1)
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

  @Column
  mediaPath: string;

  @Column
  mediaName: string;

  @HasMany(() => CampaignShipping)
  shipping: CampaignShipping[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Campaign;
