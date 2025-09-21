import {
  SSMClient,
  GetParameterCommand,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";

let ssmClient: SSMClient | undefined;

function getSSMClient(): SSMClient {
  if (!ssmClient) {
    ssmClient = new SSMClient({});
  }
  return ssmClient;
}

// Cache for parameters to avoid repeated SSM calls
const parameterCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getParameter(
  parameterName: string,
  withDecryption: boolean = false,
): Promise<string> {
  const cacheKey = `${parameterName}:${withDecryption}`;
  const cached = parameterCache.get(cacheKey);

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const response = await getSSMClient().send(
      new GetParameterCommand({
        Name: parameterName,
        WithDecryption: withDecryption,
      }),
    );

    const value = response.Parameter?.Value || "";

    // Cache the result
    parameterCache.set(cacheKey, {
      value,
      timestamp: Date.now(),
    });

    return value;
  } catch (error) {
    console.error(`Failed to get SSM parameter ${parameterName}:`, error);
    throw error;
  }
}

export async function putParameter(
  parameterName: string,
  value: string,
  type: "String" | "SecureString" = "String",
): Promise<void> {
  try {
    await getSSMClient().send(
      new PutParameterCommand({
        Name: parameterName,
        Value: value,
        Type: type,
        Overwrite: true,
      }),
    );

    // Invalidate cache for this parameter
    parameterCache.delete(`${parameterName}:false`);
    parameterCache.delete(`${parameterName}:true`);

    console.log(`Successfully updated SSM parameter ${parameterName}`);
  } catch (error) {
    console.error(`Failed to put SSM parameter ${parameterName}:`, error);
    throw error;
  }
}

export function clearParameterCache(): void {
  parameterCache.clear();
}
