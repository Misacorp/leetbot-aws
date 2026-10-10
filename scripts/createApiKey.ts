/**
 * Creates a consumer key for the Leet API.
 *
 * Generates a random key, adds its SHA-256 hash to the SSM parameter that the
 * API checks, and prints the key once. The key is never written to disk and
 * only its hash is stored. Run it through scripts/createApiKey.sh.
 */
import { randomBytes } from "node:crypto";
import {
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { PLACEHOLDER_PARAM_VALUE } from "@/src/util/constants";
import { hashApiKey, parseKeyHashes } from "@/src/leetApi/service/verifyApiKey";

const MAX_KEY_HASHES = 2;

const usage =
  "Usage: ts-node scripts/createApiKey.ts <dev|prd> [--replace-oldest]";

const [environment, ...flags] = process.argv.slice(2);
const replaceOldest = flags.includes("--replace-oldest");

if (
  (environment !== "dev" && environment !== "prd") ||
  flags.some((flag) => flag !== "--replace-oldest")
) {
  console.error(usage);
  process.exit(1);
}

const parameterName = `/leetbot/${environment}/api/consumer-key-hashes`;

async function main() {
  const ssm = new SSMClient({});

  let currentValue: string;
  try {
    const response = await ssm.send(
      new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
    );
    currentValue = response.Parameter?.Value ?? "";
  } catch (error) {
    if (error instanceof ParameterNotFound) {
      throw new Error(
        `Parameter ${parameterName} does not exist. Deploy the ${environment} stack first.`,
      );
    }
    throw error;
  }

  const isUnset = !currentValue || currentValue === PLACEHOLDER_PARAM_VALUE;
  const existingHashes = isUnset ? [] : parseKeyHashes(currentValue);

  if (!isUnset && existingHashes.length === 0) {
    throw new Error(
      `Parameter ${parameterName} holds a value that is not a list of key hashes. Refusing to overwrite it.`,
    );
  }

  if (existingHashes.length >= MAX_KEY_HASHES && !replaceOldest) {
    throw new Error(
      `${existingHashes.length} keys already exist. Re-run with --replace-oldest to drop the oldest one.`,
    );
  }

  const key = randomBytes(32).toString("base64url");
  // Oldest first, newest last
  const hashes = [...existingHashes, hashApiKey(key)].slice(-MAX_KEY_HASHES);

  await ssm.send(
    new PutParameterCommand({
      Name: parameterName,
      Value: hashes.join(","),
      Type: "SecureString",
      Overwrite: true,
    }),
  );

  console.log(
    `Stored a new key hash in ${parameterName} (${hashes.length} of ${MAX_KEY_HASHES} slots used).`,
  );
  console.log("");
  console.log(
    "Your new API key. It is shown only once and is not saved anywhere:",
  );
  console.log("");
  console.log(`  ${key}`);
  console.log("");
  console.log(
    "Store it now as the GitHub environment secret LEET_API_KEY in Misacorp/creatures",
  );
  console.log(
    "(Settings > Environments > the matching environment). Do not paste it into chat.",
  );
  console.log(
    "The API accepts the new key within about 5 minutes (SSM cache).",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unexpected error");
  process.exit(1);
});
