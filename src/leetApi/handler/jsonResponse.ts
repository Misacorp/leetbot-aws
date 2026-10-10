import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

/**
 * JSON response that must never be cached by clients or proxies.
 */
export const jsonResponse = (
  statusCode: number,
  body: unknown,
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store",
  },
  body: JSON.stringify(body),
});
