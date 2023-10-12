import { SQSClient } from "@aws-sdk/client-sqs";

interface Props {
  region: string | undefined;
}

let sqsClient: SQSClient;

const getSqsClient = ({ region }: Props) => {
  if (sqsClient) return sqsClient;

  // Create SQS client
  let awsRegion = region;
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

export { getSqsClient };
