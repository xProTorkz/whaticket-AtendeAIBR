import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import User from "../../models/User";

const ShowScheduleService = async (
  id: string | number,
  companyId: number
): Promise<Schedule> => {
  const schedule = await Schedule.findOne({
    where: { id, companyId },
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number"] },
      { model: User, as: "user", attributes: ["id", "name"] }
    ]
  });

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  return schedule;
};

export default ShowScheduleService;
