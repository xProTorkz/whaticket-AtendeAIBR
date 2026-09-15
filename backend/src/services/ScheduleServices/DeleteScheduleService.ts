import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import { cancelScheduleJob } from "../../queues";

const DeleteScheduleService = async (
  id: string | number,
  companyId: number
): Promise<void> => {
  const schedule = await Schedule.findOne({
    where: { id, companyId }
  });

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  await cancelScheduleJob(Number(id));
  await schedule.destroy();
};

export default DeleteScheduleService;
