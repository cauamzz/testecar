/* eslint-disable @typescript-eslint/no-require-imports -- Node operator script. */
// Build away from the directory served by a running production process.
const { spawnSync } = require("node:child_process");
const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const directory = `.next-release-${Date.now()}`;
const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build"],
  {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, NEXT_BUILD_DIR: directory },
    stdio: "inherit",
  },
);
// Next adds the selected distDir to tsconfig. Keep local release names out of source control.
const configPath = path.resolve(__dirname, "../tsconfig.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
config.include = config.include.filter(
  (entry) => !entry.startsWith(".next-release-"),
);
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
if (result.status !== 0) process.exit(result.status || 1);
writeFileSync(path.resolve(__dirname, "../.production-build"), directory);
console.log("Build isolado pronto. Reinicie com npm run start:production.");
