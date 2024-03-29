import { SecretsManager } from "@aws-sdk/client-secrets-manager";

/**
 * Gets a secret from AWS Secrets Manager
 * @param SecretId Secret id
 */
const getSecret = async (SecretId: string): Promise<string> => {
  console.info("Getting secret from Secrets Manager…");

  const secretsManager = new SecretsManager();
  const tokenResponse = await secretsManager.getSecretValue({
    SecretId,
  });

  const token = tokenResponse.SecretString;
  if (!token) {
    throw new Error("Unable to secret from Secrets Manager");
  }
  console.info("Secret fetched successfully.");

  return token;
};

export { getSecret };
