import { Sequelize } from "sequelize-typescript";
import Company from "../models/Company";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import ContactCustomField from "../models/ContactCustomField";
import Message from "../models/Message";
import Queue from "../models/Queue";
import WhatsappQueue from "../models/WhatsappQueue";
import UserQueue from "../models/UserQueue";
import QuickAnswer from "../models/QuickAnswer";
import WppKey from "../models/WppKey";
import AuditLog from "../models/AuditLog";
import TicketNote from "../models/TicketNote";
import InternalMessage from "../models/InternalMessage";
import Tag from "../models/Tag";
import TicketTag from "../models/TicketTag";
import ContactTag from "../models/ContactTag";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import Deal from "../models/Deal";
import DealTimeline from "../models/DealTimeline";
import CrmConfig from "../models/CrmConfig";
import TicketLifecycleEvent from "../models/TicketLifecycleEvent";
import Schedule from "../models/Schedule";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";
import Campaign from "../models/Campaign";
import CampaignShipping from "../models/CampaignShipping";
import CampaignSetting from "../models/CampaignSetting";
import ApiKey from "../models/ApiKey";
import ApiIdempotencyKey from "../models/ApiIdempotencyKey";
import Webhook from "../models/Webhook";
import WebhookDelivery from "../models/WebhookDelivery";

// eslint-disable-next-line
const dbConfig = require("../config/database");

const sequelize = new Sequelize(dbConfig);

const models = [
  Company,
  User,
  Contact,
  Ticket,
  Message,
  Whatsapp,
  ContactCustomField,
  Setting,
  Queue,
  WhatsappQueue,
  UserQueue,
  QuickAnswer,
  WppKey,
  AuditLog,
  TicketNote,
  InternalMessage,
  Tag,
  TicketTag,
  ContactTag,
  Pipeline,
  PipelineStage,
  Deal,
  DealTimeline,
  CrmConfig,
  TicketLifecycleEvent,
  Schedule,
  ContactList,
  ContactListItem,
  Campaign,
  CampaignShipping,
  CampaignSetting,
  ApiKey,
  ApiIdempotencyKey,
  Webhook,
  WebhookDelivery
];

sequelize.addModels(models);

export default sequelize;
