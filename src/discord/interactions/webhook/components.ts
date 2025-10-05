import { editMessage } from "@/src/discord/interactions/webhook/editMessage";

export const clearMessageComponents = async ({
  applicationId,
  token,
  messageId,
}: {
  applicationId: string;
  token: string;
  messageId: string;
}): Promise<void> =>
  editMessage({
    applicationId,
    token,
    messageId,
    payload: { components: [] },
  });
