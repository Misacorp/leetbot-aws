import { Context } from "aws-lambda";

// Timeout interval to use when keeping the function alive
const INTERVAL_MS = 1000;
// How long to leave for the function to log out of Discord and exit
const EXIT_THRESHOLD = 2000;

/**
 * Keeps a Lambda function alive by maintaining entities in the Javascript call stack and event queue.
 * @param context Lambda execution context
 */
const keepAlive = async (context: Context) => {
  const timeRemaining = context.getRemainingTimeInMillis();

  if (timeRemaining > INTERVAL_MS + EXIT_THRESHOLD) {
    await new Promise((resolve) => {
      setTimeout(resolve, INTERVAL_MS);
    });
    await keepAlive(context);
  }
};

export default keepAlive;
