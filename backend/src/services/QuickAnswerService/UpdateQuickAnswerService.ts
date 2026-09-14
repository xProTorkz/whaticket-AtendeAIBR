import QuickAnswer from "../../models/QuickAnswer";
import ShowQuickAnswerService from "./ShowQuickAnswerService";

interface QuickAnswerData {
  shortcut?: string;
  message?: string;
}

interface Request {
  quickAnswerData: QuickAnswerData;
  quickAnswerId: string;
  companyId?: number;
}

const UpdateQuickAnswerService = async ({
  quickAnswerData,
  quickAnswerId,
  companyId
}: Request): Promise<QuickAnswer> => {
  const { shortcut, message } = quickAnswerData;

  const quickAnswer = await ShowQuickAnswerService(quickAnswerId, companyId);

  await quickAnswer.update({
    shortcut,
    message
  });

  await quickAnswer.reload({
    attributes: ["id", "shortcut", "message", "companyId"]
  });

  return quickAnswer;
};

export default UpdateQuickAnswerService;
