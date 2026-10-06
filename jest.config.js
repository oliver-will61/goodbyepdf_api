const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  // variáveis de ambiente aplicadas antes de cada arquivo de teste
  setupFiles: ["<rootDir>/jest.setup.js"],
  transform: {
    ...tsJestTransformCfg,
  },
};