import fs from "node:fs";
import path from "node:path";

/**
 * Reads the CDK outputs file (dev or prd) and returns the DynamoDB table name.
 * @param env - Environment identifier, e.g. 'dev' or 'prd'
 * @returns The table name string
 * @throws If the file or table name cannot be found
 */
export function getTableNameFromCdkOutputs(env: string): string {
  // Resolve outputs file name relative to repo root or current working dir
  const outputsFile = path.resolve(process.cwd(), `cdk-outputs-${env}.json`);

  if (!fs.existsSync(outputsFile)) {
    throw new Error(`CDK outputs file not found: ${outputsFile}`);
  }

  const content = JSON.parse(fs.readFileSync(outputsFile, "utf8"));

  // Find the first key that looks like the stack name, e.g. "dev-LeetbotCloud"
  const stackKey = Object.keys(content).find((key) =>
    key.endsWith("LeetbotCloud"),
  );

  if (!stackKey) {
    throw new Error(`No LeetbotCloud stack entry found in ${outputsFile}`);
  }

  // Find the output key that contains the table name (matches 'LeetbotTable')
  const stackOutputs = content[stackKey];
  const tableNameKey = Object.keys(stackOutputs).find((key) =>
    key.includes("LeetbotTable"),
  );

  if (!tableNameKey) {
    throw new Error(`No LeetbotTable key found in ${outputsFile}`);
  }

  return stackOutputs[tableNameKey];
}
