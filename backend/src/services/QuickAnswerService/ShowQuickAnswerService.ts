import QuickAnswer from "../../models/QuickAnswer";
import AppError from "../../errors/AppError";

const ShowQuickAnswerService = async (
  id: string,
  companyId?: number
): Promise<QuickAnswer> => {
  const where: any = { id };
  if (companyId) where.companyId = companyId;

  const quickAnswer = await QuickAnswer.findOne({ where });

  if (!quickAnswer) {
    throw new AppError("ERR_NO_QUICK_ANSWERS_FOUND", 404);
  }

  return quickAnswer;
};

export default ShowQuickAnswerService;
