module.exports = {
  testEnvironment: "jsdom",
  // dist/package.json duplicates the package name
  modulePathIgnorePatterns: ["<rootDir>/dist"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": [
      "ts-jest",
      {
        tsconfig: {
          noImplicitAny: false,
        },
      },
    ],
  },
};
