/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test", "<rootDir>/src", "<rootDir>/lib"],
  setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  moduleFileExtensions: ["ts", "js", "mjs", "cjs", "json", "node"],
  transform: {
    "^.+\\.(ts)x?$": "ts-jest",
  },
  transformIgnorePatterns: ["^.+\\.js$"],
  modulePathIgnorePatterns: ["<rootDir>/src/layers/.*/nodejs/package.json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@logger$": "<rootDir>/src/util/logger",
    "^/opt/nodejs/discord": "<rootDir>/src/layers/discord/nodejs/discord",
    "^/opt/nodejs/date-fns": "<rootDir>/src/layers/date-fns/nodejs/date-fns",
    "^/opt/nodejs/pino": "<rootDir>/src/layers/pino/nodejs/pino",
    "^/opt/nodejs/tweetnacl": "<rootDir>/src/layers/tweetnacl/nodejs/tweetnacl",
  },
};
