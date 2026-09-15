import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import { enqueueSchedule } from "../../queues";

interface ScheduleData {
  body?: string;
  sendAt?: string | Date;
  contactId?: number | string;
  userId?: number;
}

interface Request {
  scheduleData: ScheduleData;
  id: string | number;
  companyId: number;
}

const UpdateScheduleService = async ({
  scheduleData,
  id,
  companyId
}: Request): Promise<Schedule> => {
  const schedule = await Schedule.findOne({
    where: { id, companyId },
    include: [{ model: Contact, as: "contact" }]
  });

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  const { body, sendAt, contactId, userId } = scheduleData;

  await schedule.update({
    body: body || schedule.body,
    sendAt: sendAt ? new Date(sendAt) : schedule.sendAt,
    contactId: contactId ? Number(contactId) : schedule.contactId,
    userId: userId ? Number(userId) : schedule.userId
  });

  await schedule.reload({
    include: [{ model: Contact, as: "contact" }]
  });

  if (schedule.status === "PENDENTE") {
    await enqueueSchedule(schedule);
  }

  return schedule;
};

export default UpdateScheduleService;
