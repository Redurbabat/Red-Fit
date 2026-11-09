import { getMobileHost, getNativePlugins } from "./mobileBridges.ts";
import type { MobileBridgeHost } from "./mobileBridges.ts";

export interface FileShareResult {
  /** OS/browser accepted the request, not proof that the user saved the file. */
  status: "requested" | "unsupported";
  method: "native-share" | "web-share" | "web-download" | "none";
}

function safeFileName(name: string): boolean {
  return name.length > 0 && name.length <= 100 && name !== "." && name !== ".." &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name);
}

function utf8ToBase64(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/**
 * Export is explicitly user initiated. Prefer OS native share, then Web Share,
 * then browser-only download. Never write to public device storage silently.
 * Sensitive cache copies are deleted even when the native share is cancelled.
 */
export async function shareTextFile(
  filename: string,
  content: string,
  host: MobileBridgeHost = getMobileHost(),
): Promise<FileShareResult> {
  if (!safeFileName(filename)) throw new TypeError("Ungültiger Dateiname für Export.");
  const plugins = getNativePlugins(host);
  if (plugins?.Filesystem && plugins.Share) {
    const path = "redfit-share/" + Date.now() + "-" + filename;
    const saved = await plugins.Filesystem.writeFile({
      directory: "CACHE", path, data: utf8ToBase64(content), recursive: true,
    });
    try {
      await plugins.Share.share({ title: filename, url: saved.uri, dialogTitle: "RED Fit Export" });
      return { status: "requested", method: "native-share" };
    } finally {
      await plugins.Filesystem.deleteFile({ directory: "CACHE", path });
    }
  }

  const file = typeof File !== "undefined"
    ? new File([content], filename, { type: "application/json" }) : undefined;
  if (file && host.navigator?.share && host.navigator.canShare?.({ files: [file] })) {
    await host.navigator.share({ files: [file], title: filename });
    return { status: "requested", method: "web-share" };
  }

  // Download anchors are not reliably supported by Capacitor WebViews.
  // A native shell without the required plugins must not report success.
  if (host.Capacitor?.isNativePlatform?.()) return { status: "unsupported", method: "none" };
  const doc = host.document;
  const url = host.URL ?? (typeof URL !== "undefined" ? URL : undefined);
  if (!doc || !url?.createObjectURL || !url.revokeObjectURL) {
    return { status: "unsupported", method: "none" };
  }
  const href = url.createObjectURL(new Blob([content], { type: "application/json" }));
  try {
    const anchor = doc.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    return { status: "requested", method: "web-download" };
  } finally {
    setTimeout(() => url.revokeObjectURL(href), 1000);
  }
}
