import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { encodeRgbaPng, encodeRgbPng, decodePng } from './nativeIconCodec.mjs';
import { createIosIcon, iosIconContents, mayReplaceAppIconManifest } from './iosIconAssets.mjs';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const appSet = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
function flatRgba(side, [r, g, b, a]) {
  const bytes = Buffer.alloc(side * side * 4);
  for (let i = 0; i < bytes.length; i += 4) {
    bytes[i] = r; bytes[i + 1] = g; bytes[i + 2] = b; bytes[i + 3] = a;
  }
  return bytes;
}
function fixture(fn, { createCatalog = true, manifest = { images: [{ filename: 'AppIcon-512@2x.png' }], info: { author: 'xcode', version: 1 } }, icon = encodeRgbaPng(512, 512, flatRgba(512, [220, 40, 40, 255])) } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'redfit-ios-icon-'));
  try {
    mkdirSync(join(dir, 'tools'), { recursive: true });
    mkdirSync(join(dir, 'public/icons'), { recursive: true });
    for (const filename of ['nativeIconCodec.mjs', 'iosIconAssets.mjs', 'prepare-ios-icons.mjs']) {
      copyFileSync(join(toolsDir, filename), join(dir, 'tools', filename));
    }
    writeFileSync(join(dir, 'public/icons/icon-512.png'), icon);
    if (createCatalog) {
      mkdirSync(join(dir, appSet), { recursive: true });
      writeFileSync(join(dir, appSet, 'Contents.json'), JSON.stringify(manifest));
    }
    return fn(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
function run(dir, args = []) { return spawnSync(process.execPath, [join(dir, 'tools/prepare-ios-icons.mjs'), ...args], { encoding: 'utf8' }); }

test('RGB PNG encoder emits 8-bit truecolor without an alpha channel', () => {
  const png = encodeRgbPng(1, 1, Uint8Array.of(12, 34, 56));
  assert.equal(png[24], 8);
  assert.equal(png[25], 2);
  assert.deepEqual([...decodePng(png).rgba], [12, 34, 56, 255]);
});

test('iOS app icon is 1024x1024, fully opaque, and preserves solid colors', () => {
  const input = encodeRgbaPng(512, 512, flatRgba(512, [234, 45, 17, 255]));
  const result = createIosIcon(input);
  assert.equal(result.readUInt32BE(16), 1024);
  assert.equal(result.readUInt32BE(20), 1024);
  assert.equal(result[25], 2);
  const decoded = decodePng(result);
  assert.deepEqual([...decoded.rgba.subarray(0, 4)], [234, 45, 17, 255]);
  assert.deepEqual([...decoded.rgba.subarray(-4)], [234, 45, 17, 255]);
});

test('transparent source pixels are composed over RED Fit dark brand background', () => {
  const input = encodeRgbaPng(512, 512, flatRgba(512, [255, 0, 0, 0]));
  const decoded = decodePng(createIosIcon(input));
  assert.deepEqual([...decoded.rgba.subarray(0, 4)], [17, 24, 39, 255]);
});

test('rejects invalid RGB dimensions or buffers and malformed background colors', () => {
  assert.throws(() => encodeRgbPng(1, 1, Uint8Array.of(1)), /Invalid RGB/);
  assert.throws(() => createIosIcon(encodeRgbaPng(512, 512, flatRgba(512, [0, 0, 0, 255])), [-1, 20, 300]), /Expected RGB/);
});

test('refuses nonsquare and undersized PWA icons', () => {
  assert.throws(() => createIosIcon(encodeRgbaPng(300, 300, flatRgba(300, [0, 0, 0, 255]))), /at least 512/);
  assert.throws(() => createIosIcon(encodeRgbaPng(512, 600, Buffer.alloc(512 * 600 * 4))), /at least 512/);
});

test('Xcode asset JSON uses a single universal 1024px image', () => {
  const manifest = iosIconContents();
  assert.equal(manifest.images.length, 1);
  assert.deepEqual(manifest.images[0], {
    filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024',
  });
  assert.equal(manifest.info.version, 1);
});

test('CLI populates an existing Capacitor iOS AppIcon catalog', () => fixture(dir => {
  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  const png = readFileSync(join(dir, appSet, 'AppIcon-1024.png'));
  assert.equal(png[25], 2);
  assert.equal(decodePng(png).width, 1024);
  const catalog = JSON.parse(readFileSync(join(dir, appSet, 'Contents.json'), 'utf8'));
  assert.deepEqual(catalog, iosIconContents());
}));

test('CLI fails before any write if the native Xcode project is absent', () => fixture(dir => {
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /npx cap add ios/);
  assert.equal(existsSync(join(dir, appSet)), false);
}, { createCatalog: false }));

test('CLI protects an existing custom AppIcon unless --force is given', () => fixture(dir => {
  const before = readFileSync(join(dir, appSet, 'Contents.json'), 'utf8');
  assert.equal(mayReplaceAppIconManifest(JSON.parse(before)), false);
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Custom Xcode AppIcon/);
  assert.equal(readFileSync(join(dir, appSet, 'Contents.json'), 'utf8'), before);
  assert.equal(existsSync(join(dir, appSet, 'AppIcon-1024.png')), false);
  const forced = run(dir, ['--force']);
  assert.equal(forced.status, 0, forced.stderr);
  assert.equal(decodePng(readFileSync(join(dir, appSet, 'AppIcon-1024.png'))).height, 1024);
}, { manifest: { images: [{ filename: 'MyCustomIcon.png' }], info: { author: 'xcode', version: 1 } } }));

test('invalid source PNG does not modify existing Xcode icon manifest', () => fixture(dir => {
  const original = readFileSync(join(dir, appSet, 'Contents.json'), 'utf8');
  const result = run(dir);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(join(dir, appSet, 'Contents.json'), 'utf8'), original);
}, { icon: Buffer.from('not-a-png') }));
