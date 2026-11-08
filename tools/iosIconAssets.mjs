import { decodePng, encodeRgbPng, resizeRgba } from './nativeIconCodec.mjs';

export const IOS_ICON_FILENAME = 'AppIcon-1024.png';
export const IOS_ICON_SIDE = 1024;
// RED Fit's dark native shell matches the existing dark PWA design.
export const IOS_ICON_BACKGROUND_RGB = [17, 24, 39];

/** Turn the existing square PWA image into an opaque RGB 1024px iOS icon. */
export function createIosIcon(png, background = IOS_ICON_BACKGROUND_RGB) {
  if (!Array.isArray(background) || background.length !== 3 ||
      background.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) {
    throw new Error('Expected RGB background values 0..255');
  }
  const image = decodePng(png);
  if (image.width !== image.height || image.width < 512) {
    throw new Error(`Source icon must be square and at least 512px, got ${image.width}x${image.height}`);
  }
  const rgba = resizeRgba(image, IOS_ICON_SIDE);
  const rgb = Buffer.alloc(IOS_ICON_SIDE * IOS_ICON_SIDE * 3);
  for (let i = 0; i < IOS_ICON_SIDE * IOS_ICON_SIDE; i++) {
    const a = rgba[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) {
      rgb[i * 3 + c] = Math.round(rgba[i * 4 + c] * a + background[c] * (1 - a));
    }
  }
  return encodeRgbPng(IOS_ICON_SIDE, IOS_ICON_SIDE, rgb);
}

/** Apple/Xcode supports a single universal 1024px source icon for iOS. */
export function iosIconContents() {
  return {
    images: [{ filename: IOS_ICON_FILENAME, idiom: 'universal', platform: 'ios', size: '1024x1024' }],
    info: { author: 'xcode', version: 1 },
  };
}

/** Prevent overwriting an existing custom Xcode asset unintentionally. */
export function mayReplaceAppIconManifest(contents, force = false) {
  if (force) return true;
  if (!contents || typeof contents !== 'object' || !Array.isArray(contents.images)) return false;
  const generatedNames = new Set([IOS_ICON_FILENAME, 'AppIcon-512@2x.png']);
  return contents.images.every((image) => !image.filename || generatedNames.has(image.filename));
}
