/** Pure binary-to-base64 codec for optional local photo transfers.
 * Independent of Dexie/Zod so it can be tested even without a CI runner.
 */

export const MAX_SINGLE_PHOTO_BYTES = 10 * 1024 * 1024;

/** Encode in 12 KiB chunks (multiple of 3) to preserve base64 boundaries. */
export function encodePhotoBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += 12_288) {
    const view = bytes.subarray(start, start + 12_288);
    let binary = "";
    for (let i = 0; i < view.length; i++) {
      binary += String.fromCharCode(view[i]);
    }
    chunks.push(btoa(binary));
  }
  return chunks.join("");
}

export function decodePhotoBase64(encoded: string, expectedBytes: number): Uint8Array {
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error("Invalid photo base64 encoding");
  }
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const decodedLength = (encoded.length / 4) * 3 - padding;
  if (decodedLength !== expectedBytes || decodedLength <= 0 ||
      decodedLength > MAX_SINGLE_PHOTO_BYTES) {
    throw new Error("Photo size does not match its metadata");
  }
  const bytes = new Uint8Array(decodedLength);
  let position = 0;
  for (let i = 0; i < encoded.length; i += 16_384) {
    const chunk = atob(encoded.slice(i, i + 16_384));
    for (let j = 0; j < chunk.length; j++) bytes[position++] = chunk.charCodeAt(j);
  }
  return bytes;
}

/**
 * SHA-256 of the exact image bytes. The hash detects accidental corruption
 * during local transfer, but is NOT authentication or encryption.
 * Copying the bytes avoids a TypeScript ArrayBuffer/SharedArrayBuffer mismatch.
 */
export async function sha256PhotoBytes(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
