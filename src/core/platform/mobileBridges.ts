/** Optional Capacitor bridges. Never assume a plugin was installed or synced. */
export type HapticKind = "light" | "medium" | "heavy" | "success" | "warning" | "error";
export type AppVisibility = "active" | "inactive";

interface NativeListener { remove(): Promise<void> }

export interface MobilePlugins {
  Haptics?: {
    impact(options: { style: "LIGHT" | "MEDIUM" | "HEAVY" }): Promise<void>;
    notification(options: { type: "SUCCESS" | "WARNING" | "ERROR" }): Promise<void>;
  };
  Camera?: {
    /** Capacitor Camera >=8.1, not the deprecated getPhoto/base64 API. */
    takePhoto(options: { quality: number; editable: "no"; includeMetadata: true; saveToGallery: false }):
      Promise<{ uri?: string; webPath: string; metadata?: { format?: string } }>;
  };
  App?: {
    addListener(event: "appStateChange", callback: (event: { isActive: boolean }) => void): Promise<NativeListener>;
    addListener(event: "backButton", callback: (event: { canGoBack: boolean }) => void): Promise<NativeListener>;
  };
  Filesystem?: {
    writeFile(options: { directory: "CACHE"; path: string; data: string; recursive: true }): Promise<{ uri: string }>;
    deleteFile(options: { directory: "CACHE"; path: string }): Promise<void>;
  };
  Share?: { share(options: { title: string; url: string; dialogTitle: string }): Promise<unknown> };
}

/** Minimal WebView host is injectable for dependency-free tests. */
export interface MobileBridgeHost {
  Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: MobilePlugins };
  navigator?: {
    vibrate?: (pattern: number | number[]) => boolean;
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title: string }) => Promise<void>;
  };
  document?: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener" | "createElement">;
  addEventListener?: Window["addEventListener"];
  removeEventListener?: Window["removeEventListener"];
  URL?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
}

export function getMobileHost(): MobileBridgeHost {
  return globalThis as unknown as MobileBridgeHost;
}

let explicitlyRegisteredPlugins: MobilePlugins | undefined;

/**
 * Later, import the official @capacitor/* JS exports and register them here.
 * This adapter does NOT install native packages or request permissions.
 */
export function registerMobilePlugins(plugins: MobilePlugins): () => void {
  explicitlyRegisteredPlugins = plugins;
  return () => { if (explicitlyRegisteredPlugins === plugins) explicitlyRegisteredPlugins = undefined; };
}

export function getNativePlugins(host: MobileBridgeHost): MobilePlugins | undefined {
  try {
    if (!host.Capacitor?.isNativePlatform?.()) return undefined;
    const injected = host.Capacitor.Plugins;
    // A real @capacitor/* JS export may need explicit registration: Capacitor
    // does not guarantee every plugin is accessible through window.Capacitor.
    const registered = host === getMobileHost() ? explicitlyRegisteredPlugins : undefined;
    return registered ? { ...injected, ...registered } : injected;
  } catch {
    return undefined;
  }
}

/** Returns true only when an actual native or browser haptic API succeeded. */
export async function signalHaptic(kind: HapticKind, host: MobileBridgeHost = getMobileHost()): Promise<boolean> {
  const plugin = getNativePlugins(host)?.Haptics;
  if (plugin) {
    try {
      if (kind === "light" || kind === "medium" || kind === "heavy") {
        await plugin.impact({ style: kind.toUpperCase() as "LIGHT" | "MEDIUM" | "HEAVY" });
      } else {
        await plugin.notification({ type: kind.toUpperCase() as "SUCCESS" | "WARNING" | "ERROR" });
      }
      return true;
    } catch { /* feedback never blocks a workout */ }
  }
  const patterns: Record<HapticKind, number | number[]> = {
    light: 15, medium: 30, heavy: 50,
    success: [25, 40, 35], warning: [50, 70, 50], error: [70, 60, 70],
  };
  try { return host.navigator?.vibrate?.(patterns[kind]) ?? false; }
  catch { return false; }
}

export interface NativePhoto {
  /** Temporary source URI; copy into the app's own media store before retaining. */
  uri?: string;
  webPath: string;
  mimeType: "image/jpeg" | "image/png";
}

/** Caller must initiate capture visibly; absence of plugin means no camera request. */
export async function captureNativePhoto(host: MobileBridgeHost = getMobileHost()): Promise<NativePhoto | undefined> {
  const camera = getNativePlugins(host)?.Camera;
  if (!camera) return undefined;
  const photo = await camera.takePhoto({ quality: 80, editable: "no", includeMetadata: true, saveToGallery: false });
  if (!photo.webPath) throw new Error("Kamera hat kein Foto zurückgegeben.");
  return {
    uri: photo.uri,
    webPath: photo.webPath,
    mimeType: photo.metadata?.format?.toLowerCase() === "png" ? "image/png" : "image/jpeg",
  };
}

/** Native events supplement, but never replace, document visibility/pagehide events. */
export function onAppVisibilityChange(
  callback: (visibility: AppVisibility) => void,
  host: MobileBridgeHost = getMobileHost(),
): () => void {
  let disposed = false;
  let previous: AppVisibility | undefined;
  let handle: NativeListener | undefined;
  const emit = (state: AppVisibility) => {
    if (!disposed && previous !== state) { previous = state; callback(state); }
  };
  const onVisibility = () => emit(host.document?.visibilityState === "hidden" ? "inactive" : "active");
  const onPageHide = () => emit("inactive");
  const onPageShow = () => emit("active");
  host.document?.addEventListener("visibilitychange", onVisibility);
  host.addEventListener?.("pagehide", onPageHide);
  host.addEventListener?.("pageshow", onPageShow);
  const plugin = getNativePlugins(host)?.App;
  if (plugin) void plugin.addListener("appStateChange", e => emit(e.isActive ? "active" : "inactive"))
    .then(h => { if (disposed) void h.remove(); else handle = h; })
    .catch(() => { /* web event fallback stays active */ });
  return () => {
    disposed = true;
    host.document?.removeEventListener("visibilitychange", onVisibility);
    host.removeEventListener?.("pagehide", onPageHide);
    host.removeEventListener?.("pageshow", onPageShow);
    if (handle) void handle.remove();
  };
}

/** Never replace React Router back behavior implicitly. Only Android hardware back is supported. */
export function onAndroidBack(
  callback: (canGoBack: boolean) => void,
  host: MobileBridgeHost = getMobileHost(),
): () => void {
  if (host.Capacitor?.getPlatform?.() !== "android" || !host.Capacitor.isNativePlatform?.()) return () => {};
  const plugin = getNativePlugins(host)?.App;
  if (!plugin) return () => {};
  let disposed = false;
  let handle: NativeListener | undefined;
  void plugin.addListener("backButton", e => { if (!disposed) callback(e.canGoBack); })
    .then(h => { if (disposed) void h.remove(); else handle = h; })
    .catch(() => { /* native default remains */ });
  return () => { disposed = true; if (handle) void handle.remove(); };
}
