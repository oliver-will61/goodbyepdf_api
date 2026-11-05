const { createDefaultPreset } = require("ts-jest");

// usa o tsconfig de tests/, que enxerga src/ e tests/ (o da raiz só cobre src/)
const tsJestTransformCfg = createDefaultPreset({ tsconfig: "tests/tsconfig.json" }).transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  // todos os testes ficam em tests/, pasta irmã de src/
  roots: ["<rootDir>/tests"],
  // só arquivos *.test.ts são testes (fixtures.ts é apoio)
  testMatch: ["**/*.test.ts"],
  transform: {
    ...tsJestTransformCfg,
  },
};
