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

  let canonicalProfile = user.profile;
  let isSuper = Boolean(user.isSuperAdmin);

  if (canonicalProfile === "superadmin") {
    canonicalProfile = "admin";
    isSuper = true;
  } else if (canonicalProfile === "supervisor") {
    canonicalProfile = "manager";
  } else if (canonicalProfile === "user") {
    canonicalProfile = "agent";
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: canonicalProfile,
    companyId: user.companyId || 1,
    company: companyData,
    isSuperAdmin: isSuper,
    queues: user.queues,
    whatsapp: user.whatsapp
  };
};
