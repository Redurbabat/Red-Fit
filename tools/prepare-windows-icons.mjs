/**
 * Generate Tauri v2 Windows icons from the existing RED Fit PWA icon.
 * No image library or network access required. Run from any working directory:
 *     node tools/prepare-windows-icons.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodeRgbaPng, encodeWindowsIco, resizeRgba } from './nativeIconCodec.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'public/icons/icon-512.png');
const outputDir = resolve(root, 'src-tauri/icons');

const source = decodePng(readFileSync(sourcePath));
if (source.width !== source.height || source.width < 512) {
  throw new Error(`Source icon must be square and at least 512px, got ${source.width}×${source.height}`);
}
mkdirSync(outputDir, { recursive: true });
const icons = new Map();
for (const size of [16, 24, 32, 48, 64, 128, 256, 512]) {
  icons.set(size, encodeRgbaPng(size, size, resizeRgba(source, size)));
}
for (const [name, size] of [
  ['32x32.png', 32], ['128x128.png', 128],
  ['128x128@2x.png', 256], ['icon.png', 512],
]) writeFileSync(resolve(outputDir, name), icons.get(size));
writeFileSync(resolve(outputDir, 'icon.ico'), encodeWindowsIco(
  [32, 16, 24, 48, 64, 256].map(size => ({ size, png: icons.get(size) })),
));
console.log('RED Fit Windows/Tauri icons generated from existing public/icons/icon-512.png');
