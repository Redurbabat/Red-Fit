import { describe, expect, it } from "vitest";
import { detectPlatform, unsupportedHealthProvider } from "./platform";

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
  it("does not pretend unsupported health data equals zero steps", async () => {
    expect(await unsupportedHealthProvider.requestPermission()).toBe(false);
    expect(await unsupportedHealthProvider.getDailySteps("2026-11-08")).toBeUndefined();
  });
});
