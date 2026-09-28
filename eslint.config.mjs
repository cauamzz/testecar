import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next-test/**",
    ".next-readiness/**",
    ".next-sales/**",
    ".next-release-*/**",
    "veiculo - Copia/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
    ".agents/**",
  ]),
]);
