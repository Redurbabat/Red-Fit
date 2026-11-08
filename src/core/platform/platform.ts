/** Platform detection stays outside React and storage code. */
export type RedFitPlatform = "web" | "ios" | "android" | "desktop";

export interface NativeHost {
  Capacitor?: {
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
  };
  __TAURI_INTERNALS__?: unknown;
}

export function detectPlatform(host: NativeHost): RedFitPlatform {
  if (host.__TAURI_INTERNALS__ !== undefined) return "desktop";
  if (host.Capacitor?.isNativePlatform?.()) {
    const nativeName = host.Capacitor.getPlatform?.();
    if (nativeName === "ios") return "ios";
    if (nativeName === "android") return "android";
  }
  return "web";
}

export function getPlatform(): RedFitPlatform {
  if (typeof window === "undefined") return "web";
  return detectPlatform(window as unknown as NativeHost);
}

export interface HealthDataProvider {
  /** Explicit permission request; never called on initial app render. */
  requestPermission(): Promise<boolean>;
  /** Undefined means unavailable, NOT zero measured steps. */
  getDailySteps(localDate: string): Promise<number | undefined>;
}

export const unsupportedHealthProvider: HealthDataProvider = {
  async requestPermission() {
    return false;
  },
  async getDailySteps(_localDate) {
    return undefined;
  },
};

/**
 * No health provider is claimed available until a vetted native plugin
 * implements the contract and real-device permissions are tested.
 */
export function getHealthDataProvider(): HealthDataProvider {
  return unsupportedHealthProvider;
}
