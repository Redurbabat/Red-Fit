/** Dependency-free platform policy tests. Node 22.16+ recommended.
 * Run: node --experimental-strip-types --test tools/native-shell.selftest.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  detectPlatform,
  getPlatform,
  shouldRegisterPwaServiceWorker,
  shouldUseHashRouter,
} from "../src/core/platform/platform.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("browser production keeps History API navigation and PWA offline cache", () => {
  assert.equal(shouldUseHashRouter("web"), false);
  assert.equal(shouldRegisterPwaServiceWorker("web", false), true);
  assert.equal(shouldRegisterPwaServiceWorker("web", true), false);
});

test("Capacitor iOS navigation is reload-safe and has no PWA SW", () => {
  const platform = detectPlatform({
    Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true },
  });
  assert.equal(platform, "ios");
  assert.equal(shouldUseHashRouter(platform), true);
  assert.equal(shouldRegisterPwaServiceWorker(platform, false), false);
});

test("Tauri on Windows uses native update lifecycle, not web SW cache", () => {
  const platform = detectPlatform({ __TAURI_INTERNALS__: {} });
  assert.equal(platform, "desktop");
  assert.equal(shouldUseHashRouter(platform), true);
  assert.equal(shouldRegisterPwaServiceWorker(platform, false), false);
});

test("web Capacitor shim does not force native routing", () => {
  const platform = detectPlatform({
    Capacitor: { getPlatform: () => "ios", isNativePlatform: () => false },
  });
  assert.equal(platform, "web");
  assert.equal(shouldUseHashRouter(platform), false);
});

test("Android native shell follows the same reload-safe policy", () => {
  assert.equal(shouldUseHashRouter("android"), true);
  assert.equal(shouldRegisterPwaServiceWorker("android", false), false);
});

test("server-side entry without window reports web", () => {
  if (typeof window === "undefined") assert.equal(getPlatform(), "web");
});

test("Tauri devUrl is exactly the IPv4 address that beforeDevCommand binds", () => {
  const conf = JSON.parse(readFileSync(resolve(repoRoot, "src-tauri/tauri.conf.json"), "utf8"));
  assert.match(conf.build.beforeDevCommand, /--host 127\.0\.0\.1/);
  assert.equal(new URL(conf.build.devUrl).hostname, "127.0.0.1");
  assert.equal(new URL(conf.build.devUrl).port, "5173");
});
