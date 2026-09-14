import InternalMessage from "../../models/InternalMessage";

interface Request {
  currentUserId: number;
  targetUserId: number;
  companyId: number;
}

const MarkInternalMessagesAsReadService = async ({
  currentUserId,
  targetUserId,
  companyId
}: Request): Promise<void> => {
  await InternalMessage.update(
    { read: true },
    {
      where: {
        companyId,
        senderId: targetUserId,
        receiverId: currentUserId,
        read: false
      }
    }
  );
};

export default MarkInternalMessagesAsReadService;
