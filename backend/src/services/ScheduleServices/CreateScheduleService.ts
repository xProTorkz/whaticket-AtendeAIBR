import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import { enqueueSchedule } from "../../queues";

interface Request {
  body: string;
  sendAt: string | Date;
  contactId: number | string;
  companyId: number;
  userId?: number;
}

const CreateScheduleService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId
}: Request): Promise<Schedule> => {
  const schema = Yup.object().shape({
    body: Yup.string().required().min(5),
    sendAt: Yup.date().required(),
    contactId: Yup.number().required()
  });

  try {
    await schema.validate({ body, sendAt, contactId });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const schedule = await Schedule.create({
    body,
    sendAt: new Date(sendAt),
    contactId: Number(contactId),
    companyId,
    userId: userId ? Number(userId) : undefined,
    status: "PENDENTE"
  });

  await schedule.reload({
    include: [{ model: Contact, as: "contact" }]
  });

  await enqueueSchedule(schedule);

  return schedule;
};

export default CreateScheduleService;
