import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import User from "../../models/User";

interface Request {
  email: string;
  password: string;
  name: string;
  queueIds?: number[];
  profile?: string;
  whatsappId?: number;
  companyId?: number;
  isSuperAdmin?: boolean;
}

interface Response {
  email: string;
  name: string;
  id: number;
  profile: string;
  companyId: number;
}

const CreateUserService = async ({
  email,
  password,
  name,
  queueIds = [],
  profile = "admin",
  whatsappId,
  companyId = 1,
  isSuperAdmin = false
}: Request): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    email: Yup.string()
      .email()
      .required()
      .test(
        "Check-email",
        "An user with this email already exists.",
        async value => {
          if (!value) return false;
          const emailExists = await User.findOne({
            where: { email: value }
          });
          return !emailExists;
        }
      ),
    password: Yup.string().required().min(5)
  });

  try {
    await schema.validate({ email, password, name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  let canonicalProfile = profile;
  let superAdminFlag = Boolean(isSuperAdmin);

  if (canonicalProfile === "superadmin") {
    canonicalProfile = "admin";
    superAdminFlag = true;
  } else if (canonicalProfile === "supervisor") {
    canonicalProfile = "manager";
  } else if (canonicalProfile === "user") {
    canonicalProfile = "agent";
  }

  const validProfiles = ["visitor", "collaborator", "agent", "manager", "admin"];
  if (!validProfiles.includes(canonicalProfile)) {
    canonicalProfile = "agent";
  }

  const user = await User.create(
    {
      email,
      password,
      name,
      profile: canonicalProfile,
      companyId: companyId || 1,
      isSuperAdmin: superAdminFlag,
      whatsappId: whatsappId ? whatsappId : null
    },
    { include: ["queues", "whatsapp"] }
  );

  await user.$set("queues", queueIds);

  await user.reload();

  return SerializeUser(user);
};

export default CreateUserService;
