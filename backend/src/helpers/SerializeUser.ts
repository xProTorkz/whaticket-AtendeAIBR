import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  companyId: number;
  isSuperAdmin?: boolean;
  queues: Queue[];
  whatsapp: Whatsapp;
}

export const SerializeUser = (user: User): SerializedUser => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    companyId: user.companyId || 1,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    queues: user.queues,
    whatsapp: user.whatsapp
  };
};
