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

/**
 * Native shells serve the compiled SPA from a fixed WebView document.
 * Hash routes (#/training/...) survive hard reloads without server-side
 * rewrite rules. The normal web/PWA build keeps clean History API URLs.
 */
export function shouldUseHashRouter(platform: RedFitPlatform): boolean {
  return platform !== "web";
}

/**
 * A native app's update lifecycle belongs to its packaging/runtime.
 * Registering a web PWA service worker there may cache outdated app assets
 * after an OS-level app update. Only the browser PWA uses the SW.
 */
export function shouldRegisterPwaServiceWorker(
  platform: RedFitPlatform,
  isDevelopment: boolean,
): boolean {
  return platform === "web" && !isDevelopment;
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
