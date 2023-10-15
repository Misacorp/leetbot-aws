module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test", "<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^/opt/nodejs/date-fns": "<rootDir>/src/layers/date-fns/nodejs/date-fns",
  },
};
