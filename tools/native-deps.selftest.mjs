import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapCommands, existingNativeVersionConflicts,
  inspectNativeLock, NATIVE_PACKAGES } from "./nativeDependencies.mjs";

const toolsDir = dirname(fileURLToPath(import.meta.url));

function valid() {
  const manifest = {
    name: "red-fit", version: "0.1.0",
    dependencies: {}, devDependencies: {},
  };
  const lock = { name: "red-fit", version: "0.1.0", lockfileVersion: 3, packages: {
    "": { name: "red-fit", version: "0.1.0", dependencies: {}, devDependencies: {} },
  } };
  for (const { name, version, section } of NATIVE_PACKAGES) {
    manifest[section][name] = version;
    lock.packages[""][section][name] = version;
    lock.packages[`node_modules/${name}`] = { version };
  }
  return { manifest, lock };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "redfit-native-"));
  mkdirSync(join(root, "tools"));
  mkdirSync(join(root, "src-tauri"));
  for (const path of ["bootstrap-native.mjs", "nativeDependencies.mjs"]) {
    copyFileSync(join(toolsDir, path), join(root, "tools", path));
  }
  const { manifest, lock } = valid();
  for (const [path, data] of [
    ["package.json", manifest], ["package-lock.json", lock],
    ["capacitor.config.json", {}], ["src-tauri/Cargo.toml", {}],
    ["src-tauri/tauri.conf.json", {}],
  ]) writeFileSync(join(root, path), JSON.stringify(data));
  return root;
}

function cli(root, mode) {
  return spawnSync(process.execPath, [join(root, "tools", "bootstrap-native.mjs"), mode],
    { cwd: root, encoding: "utf8" });
}

test("versions are pinned and Capacitor JS/native/CLI versions match", () => {
  assert.equal(NATIVE_PACKAGES.length, 4);
  const versions = NATIVE_PACKAGES.filter(p => p.name.startsWith("@capacitor/"))
    .map(p => p.version);
  assert.equal(new Set(versions).size, 1);
  assert.ok(versions.every(v => /^8\./.test(v)));
});

test("bootstrap uses exact versions without audit or funding prompts", () => {
  const commands = bootstrapCommands();
  assert.equal(commands.length, 2);
  for (const command of commands) {
    assert.deepEqual(command.slice(0, 2), ["install", command[1]]);
    assert.ok(command.includes("--save-exact"));
    assert.ok(command.includes("--no-audit"));
    assert.ok(command.includes("--no-fund"));
  }
  assert.ok(commands[1].includes("--save-dev"));
});

test("valid manifest and v3 lockfile pass without network access", () => {
  const { manifest, lock } = valid();
  assert.deepEqual(inspectNativeLock(manifest, lock), []);
});

test("reject missing native packages", () => {
  const { manifest, lock } = valid();
  delete manifest.dependencies["@capacitor/ios"];
  assert.ok(inspectNativeLock(manifest, lock).some(s => s.includes("@capacitor/ios")));
});

test("reject incorrect resolved version even when declarations match", () => {
  const { manifest, lock } = valid();
  lock.packages["node_modules/@tauri-apps/cli"].version = "2.0.0";
  assert.ok(inspectNativeLock(manifest, lock).some(s => s.includes("node_modules/@tauri-apps/cli")));
});

test("reject wrong dependency section", () => {
  const { manifest, lock } = valid();
  manifest.dependencies["@tauri-apps/cli"] = "2.12.4";
  assert.ok(inspectNativeLock(manifest, lock).some(s => s.includes("belongs in devDependencies")));
});

test("reject invalid or old lockfile format", () => {
  const { manifest, lock } = valid();
  lock.lockfileVersion = 2;
  assert.ok(inspectNativeLock(manifest, lock).length);
});

test("reject mismatched project identity", () => {
  const { manifest, lock } = valid();
  manifest.name = "not-red-fit";
  assert.ok(inspectNativeLock(manifest, lock).some(s => s.includes("names differ")));
});

test("refuse accidental upgrades to existing native packages", () => {
  const { manifest } = valid();
  manifest.dependencies["@capacitor/core"] = "^7";
  assert.ok(existingNativeVersionConflicts(manifest).some(s => s.includes("@capacitor/core")));
});

test("refuse moving a native package between dependency groups silently", () => {
  const { manifest } = valid();
  manifest.devDependencies["@capacitor/ios"] = "8.6.0";
  assert.ok(existingNativeVersionConflicts(manifest).some(s => s.includes("@capacitor/ios")));
});

test("CLI --plan exits successfully without modifying either file", () => {
  const root = fixture();
  try {
    const before = readFileSync(join(root, "package.json"), "utf8");
    const result = cli(root, "--plan");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /@tauri-apps\/cli@2\.12\.4/);
    assert.equal(readFileSync(join(root, "package.json"), "utf8"), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI --check verifies the committed package-lock entries", () => {
  const root = fixture();
  try {
    assert.equal(cli(root, "--check").status, 0);
    const lockPath = join(root, "package-lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    delete lock.packages["node_modules/@capacitor/cli"];
    writeFileSync(lockPath, JSON.stringify(lock));
    const broken = cli(root, "--check");
    assert.equal(broken.status, 1);
    assert.match(broken.stderr, /NOT ready for npm ci/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI rejects malformed invocations", () => {
  const root = fixture();
  try {
    assert.equal(cli(root, "--unknown").status, 2);
    assert.equal(cli(root, "--install --plan").status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
