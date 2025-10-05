import pino from "/opt/nodejs/pino";

const logLevel = process.env.LOG_LEVEL || "info";

const logger = pino({
  level: logLevel,
  // CloudWatch Logs handles timestamps, so we can disable them to save space
  timestamp: false,
  // Format for better readability in CloudWatch
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export default logger;
