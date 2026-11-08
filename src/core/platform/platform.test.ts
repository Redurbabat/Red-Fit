import { describe, expect, it } from "vitest";
import {
  detectPlatform,
  shouldRegisterPwaServiceWorker,
  shouldUseHashRouter,
  unsupportedHealthProvider,
} from "./platform";

describe("platform detection", () => {
  it("defaults to web", () => {
    expect(detectPlatform({})).toBe("web");
  });
  it("detects native iOS", () => {
    expect(detectPlatform({ Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true } })).toBe("ios");
  });
  it("does not confuse the Capacitor browser shim with native", () => {
    expect(detectPlatform({ Capacitor: { getPlatform: () => "ios", isNativePlatform: () => false } })).toBe("web");
  });
  it("detects a desktop Tauri runtime", () => {
    expect(detectPlatform({ __TAURI_INTERNALS__: {} })).toBe("desktop");
  });
  it("uses web History API URLs and PWA SW in browser production only", () => {
    expect(shouldUseHashRouter("web")).toBe(false);
    expect(shouldRegisterPwaServiceWorker("web", false)).toBe(true);
    expect(shouldRegisterPwaServiceWorker("web", true)).toBe(false);
  });
  it("keeps routes reload-safe and disables PWA SW inside native shells", () => {
    for (const platform of ["ios", "android", "desktop"] as const) {
      expect(shouldUseHashRouter(platform)).toBe(true);
      expect(shouldRegisterPwaServiceWorker(platform, false)).toBe(false);
      expect(shouldRegisterPwaServiceWorker(platform, true)).toBe(false);
    }
  });
  it("applies native policy to detected iOS/Tauri hosts", () => {
    const ios = detectPlatform({
      Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true },
    });
    const windows = detectPlatform({ __TAURI_INTERNALS__: {} });
    expect(shouldUseHashRouter(ios)).toBe(true);
    expect(shouldRegisterPwaServiceWorker(windows, false)).toBe(false);
  });

  it("does not pretend unsupported health data equals zero steps", async () => {
    expect(await unsupportedHealthProvider.requestPermission()).toBe(false);
    expect(await unsupportedHealthProvider.getDailySteps("2026-11-08")).toBeUndefined();
  });
});
