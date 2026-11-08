#!/usr/bin/env node
/**
 * Native dependency bootstrap for RED Fit. Runs on macOS, Linux and Windows.
 *
 * node tools/bootstrap-native.mjs --plan
 * node tools/bootstrap-native.mjs --install
 * node tools/bootstrap-native.mjs --check
 *
 * --install modifies package.json + package-lock.json ONLY after explicit
 * invocation. GitHub must receive both files together in a reviewed commit.
 * Native projects, signing credentials and user data are never touched.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NATIVE_PACKAGES, bootstrapCommands,
  inspectNativeLock, existingNativeVersionConflicts,
} from "./nativeDependencies.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const choice = process.argv.slice(2);
const allowed = new Set(["--plan", "--install", "--check"]);
if (choice.length !== 1 || !allowed.has(choice[0])) {
  console.error("Usage: node tools/bootstrap-native.mjs --plan | --install | --check");
  process.exit(2);
}

if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error("Capacitor 8 requires Node.js 22 or newer.");
  process.exit(2);
}

const manifestPath = join(root, "package.json");
const lockPath = join(root, "package-lock.json");
const required = ["package.json", "package-lock.json",
  "capacitor.config.json", "src-tauri/Cargo.toml", "src-tauri/tauri.conf.json"];
for (const path of required) {
  if (!existsSync(join(root, path))) {
    console.error(`Native bootstrap requires repository file: ${path}`);
    process.exit(2);
  }
}

const originalManifest = readFileSync(manifestPath);
const originalLock = readFileSync(lockPath);
let manifest, lock;
try {
  manifest = JSON.parse(originalManifest.toString("utf8"));
  lock = JSON.parse(originalLock.toString("utf8"));
} catch {
  console.error("Invalid package.json or package-lock.json");
  process.exit(2);
}
const mode = choice[0];
if (mode === "--check") {
  const problems = inspectNativeLock(manifest, lock);
  if (problems.length) {
    console.error("Native npm lockfile is NOT ready for npm ci:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`Native package declarations and lockfile agree (${NATIVE_PACKAGES.length} packages).`);
  console.log("This checks metadata only; it does not claim a native build succeeded.");
  process.exit(0);
}

const conflicts = existingNativeVersionConflicts(manifest);
if (conflicts.length) {
  for (const conflict of conflicts) console.error(conflict);
  console.error("Refusing to silently overwrite existing native package versions.");
  process.exit(2);
}

const commands = bootstrapCommands();
for (const cmd of commands) console.log(`npm ${cmd.join(" ")}`);
if (mode === "--plan") {
  console.log("Plan only: no downloads, package mutations or native builds.");
  process.exit(0);
}

let succeeded = false;
try {
  for (const args of commands) {
    const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm",
      args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
    if (result.error || result.status !== 0) {
      throw new Error(`npm install failed (${result.error?.code ?? result.status ?? "unknown"})`);
    }
  }
  const installedManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const installedLock = JSON.parse(readFileSync(lockPath, "utf8"));
  const errors = inspectNativeLock(installedManifest, installedLock);
  if (errors.length) throw new Error(errors.join("; "));
  succeeded = true;
} catch (error) {
  // Protect a repository with partly updated npm manifests from a broken
  // install; node_modules may still need an explicit npm ci afterwards.
  writeFileSync(manifestPath, originalManifest);
  writeFileSync(lockPath, originalLock);
  console.error(`Native bootstrap failed; package manifests restored: ${String(error)}`);
  process.exitCode = 1;
}

if (succeeded) {
  console.log("Native dependencies pinned and package-lock.json updated.");
  console.log("Next: npm ci && npm run typecheck && npm run test && npm run build");
  console.log("Then on macOS: npx cap add ios && npx cap sync ios");
  console.log("Then with Android Studio / SDK: npx cap add android && npx cap sync android");
  console.log("Then on Windows (Rust/MSVC installed): npx tauri build");
  console.log("Commit package.json AND package-lock.json together to the feature branch.");
}
