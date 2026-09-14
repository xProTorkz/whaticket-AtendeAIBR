import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";

const ShowQueueService = async (
  queueId: number | string,
  companyId?: number
): Promise<Queue> => {
  const where: any = { id: queueId };
  if (companyId) {
    where.companyId = companyId;
  }

  const queue = await Queue.findOne({ where });

  if (!queue) {
    throw new AppError("ERR_QUEUE_NOT_FOUND");
  }

  return queue;
};

export default ShowQueueService;
