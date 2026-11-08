#!/usr/bin/env node
/**
 * RED Fit's local CI fallback for Windows/macOS/Linux.
 *
 * Run: node tools/verify-local.mjs
 *      node tools/verify-local.mjs --skip-install
 *
 * It mirrors .github/workflows/ci.yml and generates a machine-readable
 * status-only report; it never uploads or includes user workout data.
 *
 * The script deliberately stops at the first failing stage.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const allowedArgs = new Set(["--skip-install"]);
if (args.some((arg) => !allowedArgs.has(arg))) {
  console.error("Usage: node tools/verify-local.mjs [--skip-install]");
  process.exit(2);
}

if (!existsSync(join(root, "package.json")) || !existsSync(join(root, "package-lock.json"))) {
  console.error("Expected RED Fit package.json and package-lock.json in the repository root.");
  process.exit(2);
}

const stages = [
  { name: "install", args: ["ci"] },
  { name: "typecheck", args: ["run", "typecheck"] },
  { name: "lint", args: ["run", "lint"] },
  { name: "tests", args: ["run", "test"] },
  { name: "build", args: ["run", "build"] },
];

const report = {
  formatVersion: 1,
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  status: "failed",
  stages: [],
};
const reportPath = join(root, "artifacts", "verify-local.json");

function saveReport() {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log("\nRED Fit verification report: artifacts/verify-local.json");
}

for (const stage of stages) {
  if (stage.name === "install" && args.includes("--skip-install")) {
    report.stages.push({ name: stage.name, status: "skipped" });
    continue;
  }

  const started = Date.now();
  console.log(`\n--- RED Fit: ${stage.name} ---`);
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    stage.args,
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  const exitCode = result.status ?? 1;
  report.stages.push({
    name: stage.name,
    status: exitCode === 0 ? "passed" : "failed",
    exitCode,
    elapsedMs: Date.now() - started,
    ...(result.error ? { errorCode: result.error.code ?? "UNKNOWN" } : {}),
  });
  if (exitCode !== 0) {
    console.error(`RED Fit verification stopped: ${stage.name} failed (exit ${exitCode}).`);
    saveReport();
    process.exit(exitCode);
  }
}

report.status = "passed";
saveReport();
console.log("\nAll RED Fit verification stages passed.");
