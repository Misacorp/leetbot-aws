import {
  SQSClient,
  SendMessageCommand,
  type SendMessageCommandInput,
} from "@aws-sdk/client-sqs";

interface Props {
  region?: string;
}

let sqsClient: SQSClient;

/**
 * Creates an SQS client or returns one that exists
 */
export const getSqsClient = (props?: Props) => {
  if (sqsClient) {
    console.info("Using existing SQS client");
    return sqsClient;
  }

  console.info("No SQS client. Creating a new one...");

  // Create SQS client
  let awsRegion = props?.region ?? process.env.AWS_REGION;
  const defaultRegion = "eu-north-1";
  if (!awsRegion) {
    console.warn(
      "AWS_REGION environment variable is undefined. Using default region",
      defaultRegion,
    );
    awsRegion = defaultRegion;
  }

  sqsClient = new SQSClient({ region: awsRegion });
  return sqsClient;
};

/**
 * Sends a message to an SQS queue.
 * Recovers from errors.
 * @param payload SendMessage command input
 */
export const sendMessage = async (payload: SendMessageCommandInput) => {
  try {
    // Send the message forward
    await getSqsClient().send(new SendMessageCommand(payload));

    return true;
  } catch (err) {
    console.error("Unable to send SQS message due to an error", err);
    return false;
  }
};
