#!/usr/bin/env node
/** No-dependency smoke tests for the local CI runner (no RED Fit deps needed). */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const realScript = join(dirname(fileURLToPath(import.meta.url)), "verify-local.mjs");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "redfit-verify-"));
  mkdirSync(join(root, "tools"));
  mkdirSync(join(root, "bin"));
  copyFileSync(realScript, join(root, "tools", "verify-local.mjs"));
  writeFileSync(join(root, "package.json"), '{"private":true,"type":"module"}\n');
  writeFileSync(join(root, "package-lock.json"), '{"lockfileVersion":3}\n');
  if (process.platform === "win32") {
    writeFileSync(join(root, "bin", "npm.cmd"),
      '@echo off\r\nif "%1 %2"=="run test" (if "%MOCK_FAIL_TEST%"=="1" exit /b 7)\r\nexit /b 0\r\n');
  } else {
    writeFileSync(join(root, "bin", "npm"),
      '#!/bin/sh\nif [ "$1 $2" = "run test" ] && [ "$MOCK_FAIL_TEST" = "1" ]; then exit 7; fi\nexit 0\n',
      { mode: 0o755 });
  }
  return root;
}

function run(root, flags = [], failTests = false) {
  return spawnSync(process.execPath, [join(root, "tools", "verify-local.mjs"), ...flags], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: join(root, "bin") + (process.platform === "win32" ? ";" : ":") + process.env.PATH,
      MOCK_FAIL_TEST: failTests ? "1" : "0",
    },
  });
}

test("all stages are recorded when the mock commands succeed", () => {
  const root = fixture();
  try {
    const result = run(root, ["--skip-install"]);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(readFileSync(join(root, "artifacts", "verify-local.json"), "utf8"));
    assert.equal(report.status, "passed");
    assert.deepEqual(report.stages.map((stage) => stage.name),
      ["install", "typecheck", "lint", "tests", "build"]);
    assert.equal(report.stages[0].status, "skipped");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a failing test stops the pipeline before the build", () => {
  const root = fixture();
  try {
    const result = run(root, [], true);
    assert.equal(result.status, 7, result.stderr);
    const report = JSON.parse(readFileSync(join(root, "artifacts", "verify-local.json"), "utf8"));
    assert.equal(report.status, "failed");
    assert.equal(report.stages.at(-1).name, "tests");
    assert.equal(report.stages.at(-1).exitCode, 7);
    assert.equal(report.stages.some((stage) => stage.name === "build"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unrecognized CLI arguments fail before running npm", () => {
  const root = fixture();
  try {
    const result = run(root, ["--unknown"]);
    assert.equal(result.status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
