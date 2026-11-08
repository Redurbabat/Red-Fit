#!/usr/bin/env node
/** Prepare the Capacitor-generated iOS AppIcon asset using existing RED Fit branding. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIosIcon, iosIconContents, IOS_ICON_FILENAME, mayReplaceAppIconManifest } from './iosIconAssets.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some((a) => a !== '--force') || args.length > 1) {
  console.error('Usage: node tools/prepare-ios-icons.mjs [--force]');
  process.exit(2);
}
const force = args.includes('--force');
const sourceFile = resolve(projectRoot, 'public/icons/icon-512.png');
const catalog = resolve(projectRoot, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const manifestFile = resolve(catalog, 'Contents.json');
if (!existsSync(catalog) || !existsSync(manifestFile)) {
  console.error('Missing Capacitor iOS AppIcon catalog. On macOS run: npx cap add ios, then npm run ios:icons');
  process.exit(1);
}
if (!existsSync(sourceFile)) {
  console.error('Missing public/icons/icon-512.png');
  process.exit(1);
}
let oldManifest;
try { oldManifest = JSON.parse(readFileSync(manifestFile, 'utf8')); }
catch { console.error('Invalid Xcode AppIcon Contents.json; refusing to replace it'); process.exit(1); }
if (!mayReplaceAppIconManifest(oldManifest, force)) {
  console.error('Custom Xcode AppIcon exists; refusing to overwrite it. Re-run with --force if intended.');
  process.exit(1);
}
// Generate completely before touching the on-disk catalog, so invalid source
// PNGs do not erase the existing icon's metadata.
const png = createIosIcon(readFileSync(sourceFile));
const manifest = JSON.stringify(iosIconContents(), null, 2) + '\n';
writeFileSync(resolve(catalog, IOS_ICON_FILENAME), png);
writeFileSync(manifestFile, manifest);
console.log('RED Fit iOS 1024px opaque icon prepared in Capacitor AppIcon.appiconset');
