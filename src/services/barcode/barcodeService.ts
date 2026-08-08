/**
 * Barcode scanning with a hard rule: the scanner is NEVER required.
 * Manual entry always works; the camera path only activates when the
 * browser supports BarcodeDetector and the user grants permission.
 */

export interface BarcodeService {
  isSupported(): boolean;
  /** Opens the camera and resolves with the first detected barcode string. */
  scan(video: HTMLVideoElement, signal: AbortSignal): Promise<string>;
}

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

function getDetectorConstructor(): BarcodeDetectorConstructor | undefined {
  return (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
}

export const barcodeService: BarcodeService = {
  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      getDetectorConstructor() !== undefined
    );
  },

  async scan(video: HTMLVideoElement, signal: AbortSignal): Promise<string> {
    const Detector = getDetectorConstructor();
    if (!Detector) throw new Error("BarcodeDetector nicht verfügbar");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();

    const detector = new Detector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
    });

    try {
      return await new Promise<string>((resolve, reject) => {
        const tick = async () => {
          if (signal.aborted) {
            reject(new DOMException("Scan abgebrochen", "AbortError"));
            return;
          }
          try {
            const codes = await detector.detect(video);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              resolve(value);
              return;
            }
          } catch {
            // Single failed frame — keep scanning.
          }
          setTimeout(tick, 200);
        };
        void tick();
      });
    } finally {
      for (const track of stream.getTracks()) track.stop();
      video.srcObject = null;
    }
  },
};
