/* eslint-disable @typescript-eslint/no-require-imports -- Node operator script. */
const { spawn } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const directory = readFileSync(path.join(root, ".production-build"), "utf8").trim();
if (!/^\.next-release-\d+$/.test(directory)) throw new Error("Build inválido. Execute npm run build:production.");
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "0.0.0.0"], {
  cwd: root, env: { ...process.env, NEXT_BUILD_DIR: directory }, stdio: "inherit",
});
child.on("exit", code => { process.exitCode = code || 0; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
