import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import Company from "../models/Company";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  companyId: number;
  company?: any;
  isSuperAdmin?: boolean;
  queues: Queue[];
  whatsapp: Whatsapp;
}

export const SerializeUser = (user: User): SerializedUser => {
  let companyData: any = null;
  if (user.company) {
    companyData = typeof (user.company as any).toJSON === "function" ? (user.company as any).toJSON() : { ...user.company };
  } else {
    companyData = {
      id: user.companyId || 1,
      name: "Empresa Padrão",
      status: true,
      plan: "default",
      dueDate: "2099-12-31T23:59:59.000Z",
      recurrence: "MENSAL"
    };
  }

  if (companyData && !companyData.dueDate) {
    companyData.dueDate = "2099-12-31T23:59:59.000Z";
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    companyId: user.companyId || 1,
    company: companyData,
    isSuperAdmin: Boolean(user.isSuperAdmin),
    queues: user.queues,
    whatsapp: user.whatsapp
  };
};
