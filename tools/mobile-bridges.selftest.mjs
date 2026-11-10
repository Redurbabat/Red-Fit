import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureNativePhoto, getMobileHost, getNativePlugins, onAndroidBack, onAppVisibilityChange,
  registerMobilePlugins, signalHaptic,
} from "../src/core/platform/mobileBridges.ts";
import { shareTextFile } from "../src/core/platform/mobileFileExport.ts";

const mobile = (platform, plugins = {}) => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => platform, Plugins: plugins },
});

test("WebView shim is not mistaken for a native plugin host", () => {
  assert.equal(getNativePlugins({ Capacitor: { isNativePlatform: () => false, Plugins: { Haptics: {} } } }), undefined);
});

test("Explicit official JS plugin registration works only for native host", async () => {
  const original = globalThis.Capacitor;
  try {
    globalThis.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios" };
    let called = 0;
    const dispose = registerMobilePlugins({ Haptics: {
      async impact() { called++; },
      async notification() { called++; },
    } });
    assert.equal(await signalHaptic("heavy", getMobileHost()), true);
    assert.equal(called, 1);
    dispose();
    assert.equal(getNativePlugins(getMobileHost()), undefined);
    globalThis.Capacitor = { isNativePlatform: () => false };
    const disposeWeb = registerMobilePlugins({ Haptics: {
      async impact() { throw Error("should not run"); },
      async notification() { throw Error("should not run"); },
    } });
    assert.equal(getNativePlugins(getMobileHost()), undefined);
    disposeWeb();
  } finally {
    if (original === undefined) delete globalThis.Capacitor;
    else globalThis.Capacitor = original;
  }
});

test("haptics: no hardware API reports false", async () => {
  assert.equal(await signalHaptic("success", {}), false);
});

test("haptics: correctly dispatches impact and notification to native", async () => {
  const seen = [];
  const host = mobile("ios", { Haptics: {
    async impact(value) { seen.push(value); },
    async notification(value) { seen.push(value); },
  } });
  assert.equal(await signalHaptic("medium", host), true);
  assert.equal(await signalHaptic("success", host), true);
  assert.deepEqual(seen, [{ style: "MEDIUM" }, { type: "SUCCESS" }]);
});

test("haptics: failing native plugin falls back to browser vibration", async () => {
  const seen = [];
  const host = mobile("android", { Haptics: {
    async impact() { throw Error("No permission"); },
    async notification() { throw Error("No permission"); },
  } });
  host.navigator = { vibrate(value) { seen.push(value); return true; } };
  assert.equal(await signalHaptic("light", host), true);
  assert.deepEqual(seen, [15]);
});

test("camera: missing plugin does not request permissions", async () => {
  assert.equal(await captureNativePhoto(mobile("ios")), undefined);
});

test("camera: opt-in plugin call preserves returned image data and format", async () => {
  const host = mobile("ios", { Camera: {
    async takePhoto(options) {
      assert.deepEqual(options, { quality: 80, editable: "no", includeMetadata: true, saveToGallery: false });
      return { uri: "file:///photo.png", webPath: "capacitor://photo.png", metadata: { format: "png" } };
    },
  } });
  assert.deepEqual(await captureNativePhoto(host), {
    uri: "file:///photo.png", webPath: "capacitor://photo.png", mimeType: "image/png",
  });
});

test("camera: permission errors propagate to the caller", async () => {
  const host = mobile("ios", { Camera: { async takePhoto() { throw Error("User denied"); } } });
  await assert.rejects(captureNativePhoto(host), /User denied/);
});

test("lifecycle: duplicate app-state events are suppressed and disposal works", () => {
  const docEvents = new EventTarget();
  const windowEvents = new EventTarget();
  const document = {
    visibilityState: "visible",
    addEventListener: docEvents.addEventListener.bind(docEvents),
    removeEventListener: docEvents.removeEventListener.bind(docEvents),
  };
  const host = { document,
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
  };
  const log = [];
  const dispose = onAppVisibilityChange(state => log.push(state), host);
  document.visibilityState = "hidden";
  docEvents.dispatchEvent(new Event("visibilitychange"));
  windowEvents.dispatchEvent(new Event("pagehide"));
  document.visibilityState = "visible";
  docEvents.dispatchEvent(new Event("visibilitychange"));
  assert.deepEqual(log, ["inactive", "active"]);
  dispose();
  windowEvents.dispatchEvent(new Event("pagehide"));
  assert.deepEqual(log, ["inactive", "active"]);
});

test("lifecycle: a late native subscription is cleaned up when disposed", async () => {
  let callback;
  let removed = 0;
  const host = mobile("ios", { App: {
    async addListener(event, cb) {
      assert.equal(event, "appStateChange");
      callback = cb;
      return { async remove() { removed++; } };
    },
  } });
  const log = [];
  const dispose = onAppVisibilityChange(state => log.push(state), host);
  dispose();
  await new Promise(resolve => setImmediate(resolve));
  callback({ isActive: false });
  assert.equal(removed, 1);
  assert.deepEqual(log, []);
});

test("Android hardware back: iOS does not register; Android can opt in", async () => {
  const installed = [];
  let press;
  const plugins = { App: {
    async addListener(event, callback) { installed.push(event); press = callback; return { async remove() {} }; },
  } };
  onAndroidBack(() => { throw Error("must not run"); }, mobile("ios", plugins));
  assert.deepEqual(installed, []);
  const log = [];
  const dispose = onAndroidBack(flag => log.push(flag), mobile("android", plugins));
  await Promise.resolve();
  press({ canGoBack: true });
  dispose();
  press({ canGoBack: false });
  assert.deepEqual(log, [true]);
  assert.deepEqual(installed, ["backButton"]);
});

test("file export: path traversal is refused before any access", async () => {
  await assert.rejects(shareTextFile("../secret.json", "data", {}), TypeError);
  await assert.rejects(shareTextFile("", "data", {}), TypeError);
});

test("file export: iOS without native/Web Share correctly reports unsupported", async () => {
  assert.deepEqual(await shareTextFile("backup.json", "{}", mobile("ios")),
    { status: "unsupported", method: "none" });
});

test("file export: native share uses a temporary file and deletes it", async () => {
  const records = [];
  const host = mobile("android", {
    Filesystem: {
      async writeFile(options) { records.push(["write", options]); return { uri: "file:///cache/backup.json" }; },
      async deleteFile(options) { records.push(["delete", options]); },
    },
    Share: { async share(options) { records.push(["share", options]); } },
  });
  assert.deepEqual(await shareTextFile("backup.json", "ä 😃", host),
    { status: "requested", method: "native-share" });
  assert.deepEqual(records.map(([op]) => op), ["write", "share", "delete"]);
  assert.equal(Buffer.from(records[0][1].data, "base64").toString("utf8"), "ä 😃");
  assert.equal(records[0][1].directory, "CACHE");
  assert.equal(records[2][1].path, records[0][1].path);
});

test("file export: cancelled native share still deletes private cache copy", async () => {
  let deleted = false;
  const host = mobile("ios", {
    Filesystem: {
      async writeFile() { return { uri: "file:///cache/test.json" }; },
      async deleteFile() { deleted = true; },
    },
    Share: { async share() { throw Error("cancelled"); } },
  });
  await assert.rejects(shareTextFile("test.json", "{}", host), /cancelled/);
  assert.equal(deleted, true);
});

test("file export: Web Share is used when available", async () => {
  const shared = [];
  const host = { navigator: {
    canShare({ files }) { assert.equal(files[0].name, "backup.json"); return true; },
    async share(data) { shared.push(data); },
  } };
  assert.deepEqual(await shareTextFile("backup.json", "{}", host),
    { status: "requested", method: "web-share" });
  assert.equal(shared.length, 1);
});

test("file export: browser download creates a revocable Blob URL", async () => {
  const records = [];
  const host = {
    document: { createElement() { return { click() { records.push("click"); } }; } },
    URL: {
      createObjectURL() { records.push("create"); return "blob:test"; },
      revokeObjectURL(value) { records.push(value); },
    },
  };
  assert.deepEqual(await shareTextFile("backup.json", "{}", host),
    { status: "requested", method: "web-download" });
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.deepEqual(records, ["create", "click", "blob:test"]);
});
