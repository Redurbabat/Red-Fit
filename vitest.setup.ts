// Dexie needs an IndexedDB implementation in the test environment.
import "fake-indexeddb/auto";

// happy-dom's Blob lacks arrayBuffer() on the CI runner, though real iOS
// WKWebView and browsers support it. Keep production photo backup code unchanged
// and fill only missing Blob methods in this test environment.
function readBlobWithFileReader<T extends ArrayBuffer | string>(
  blob: Blob,
  kind: "arrayBuffer" | "text",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as T);
    reader.onerror = () => reject(reader.error ?? new Error("Cannot read test blob"));
    if (kind === "arrayBuffer") {
      reader.readAsArrayBuffer(blob);
    } else {
      reader.readAsText(blob);
    }
  });
}

if (typeof Blob.prototype.arrayBuffer !== "function") {
  Object.defineProperty(Blob.prototype, "arrayBuffer", {
    configurable: true,
    value: function (this: Blob): Promise<ArrayBuffer> {
      return readBlobWithFileReader<ArrayBuffer>(this, "arrayBuffer");
    },
  });
}
if (typeof Blob.prototype.text !== "function") {
  Object.defineProperty(Blob.prototype, "text", {
    configurable: true,
    value: function (this: Blob): Promise<string> {
      return readBlobWithFileReader<string>(this, "text");
    },
  });
}
