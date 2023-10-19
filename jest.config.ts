module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  resolver: "ts-jest-resolver",
  roots: ["<rootDir>/test", "<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.(ts)x?$": "ts-jest",
  },
  transformIgnorePatterns: ["^.+\\.js$"],
  moduleNameMapper: {
    "^/opt/nodejs/date-fns": "<rootDir>/src/layers/date-fns/nodejs/date-fns",
  },
};
