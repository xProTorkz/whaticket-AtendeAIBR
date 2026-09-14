import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import ShowUserService from "./ShowUserService";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  profile?: string;
  queueIds?: number[];
  whatsappId?: number;
  companyId?: number;
  isSuperAdmin?: boolean;
}

interface Request {
  userData: UserData;
  userId: string | number;
  companyId?: number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
  companyId: number;
  isSuperAdmin?: boolean;
}

const UpdateUserService = async ({
  userData,
  userId,
  companyId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId, companyId);

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string()
  });

  const {
    email,
    password,
    profile,
    name,
    queueIds = [],
    whatsappId,
    companyId: newCompanyId,
    isSuperAdmin
  } = userData;

  try {
    await schema.validate({ email, password, profile, name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const updateData: any = {
    email,
    password,
    profile,
    name,
    whatsappId: whatsappId ? whatsappId : null
  };

  if (newCompanyId !== undefined) {
    updateData.companyId = newCompanyId;
  }

  if (isSuperAdmin !== undefined) {
    updateData.isSuperAdmin = isSuperAdmin;
  }

  await user.update(updateData);

  await user.$set("queues", queueIds);

  await user.reload();

  return SerializeUser(user);
};

export default UpdateUserService;
