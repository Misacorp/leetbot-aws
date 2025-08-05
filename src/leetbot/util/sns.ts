import {
  PublishCommand,
  type PublishCommandInput,
  SNSClient,
} from "@aws-sdk/client-sns";

let snsClient: SNSClient;

export const getSnsClient = () => {
  if (!snsClient) {
    snsClient = new SNSClient({});
  }

  return snsClient;
};

export const publishMessage = async (command: PublishCommandInput) => {
  const client = getSnsClient();

  return client.send(new PublishCommand(command));
};
