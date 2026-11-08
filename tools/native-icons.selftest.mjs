import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decodePng, encodeRgbaPng, encodeWindowsIco, resizeRgba } from './nativeIconCodec.mjs';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const rgba = Buffer.alloc(512 * 512 * 4);
for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
  const i = (y * 512 + x) * 4;
  rgba[i] = x % 256;
  rgba[i + 1] = y % 256;
  rgba[i + 2] = 80;
  rgba[i + 3] = x < 8 ? 0 : 255;
}
const png = encodeRgbaPng(512, 512, rgba);

test('decode preserves the RGBA source and PNG checksum', () => {
  const image = decodePng(png);
  assert.equal(image.width, 512);
  assert.equal(image.height, 512);
  assert.deepEqual(image.rgba, rgba);
});

test('corrupt PNG CRC fails closed', () => {
  const corrupted = Buffer.from(png);
  corrupted[29] ^= 1;
  assert.throws(() => decodePng(corrupted), /CRC/);
});

test('rejects undersized source icons', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'redfit-icon-'));
  try {
    mkdirSync(join(fixture, 'tools'));
    mkdirSync(join(fixture, 'public/icons'), { recursive: true });
    copyFileSync(join(toolsDir, 'prepare-windows-icons.mjs'), join(fixture, 'tools/prepare-windows-icons.mjs'));
    copyFileSync(join(toolsDir, 'nativeIconCodec.mjs'), join(fixture, 'tools/nativeIconCodec.mjs'));
    writeFileSync(join(fixture, 'public/icons/icon-512.png'),
      encodeRgbaPng(100, 100, new Uint8Array(100 * 100 * 4)));
    const result = spawnSync(process.execPath, [join(fixture, 'tools/prepare-windows-icons.mjs')], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /at least 512px/);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test('resizer creates 8-bit RGBA pixels with premultiplied alpha edges', () => {
  const image = { width: 512, height: 512, rgba };
  const result = decodePng(encodeRgbaPng(32, 32, resizeRgba(image, 32)));
  assert.equal(result.width, 32);
  assert.equal(result.height, 32);
  assert.equal(result.rgba.length, 32 * 32 * 4);
  assert.equal(result.rgba[3], 128);
});

test('ICO includes 16, 24, 32, 48, 64, 256 and 32px first', () => {
  const layers = [32, 16, 24, 48, 64, 256].map(size =>
    ({ size, png: encodeRgbaPng(size, size, resizeRgba({ width: 512, height: 512, rgba }, size)) }));
  const ico = encodeWindowsIco(layers);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 6);
  assert.equal(ico[6], 32);
  for (let k = 0; k < 6; k++) {
    const entry = 6 + k * 16;
    const size = ico[entry] || 256;
    const offset = ico.readUInt32LE(entry + 12);
    const pngBytes = ico.subarray(offset, offset + ico.readUInt32LE(entry + 8));
    assert.equal(decodePng(pngBytes).width, size);
  }
});

test('CLI generates every Windows icon resource from an existing PWA image', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'redfit-icon-'));
  try {
    mkdirSync(join(fixture, 'tools'));
    mkdirSync(join(fixture, 'public/icons'), { recursive: true });
    copyFileSync(join(toolsDir, 'prepare-windows-icons.mjs'), join(fixture, 'tools/prepare-windows-icons.mjs'));
    copyFileSync(join(toolsDir, 'nativeIconCodec.mjs'), join(fixture, 'tools/nativeIconCodec.mjs'));
    writeFileSync(join(fixture, 'public/icons/icon-512.png'), png);
    const result = spawnSync(process.execPath, [join(fixture, 'tools/prepare-windows-icons.mjs')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    for (const [name, size] of [
      ['32x32.png', 32], ['128x128.png', 128],
      ['128x128@2x.png', 256], ['icon.png', 512],
    ]) {
      const bytes = readFileSync(join(fixture, 'src-tauri/icons', name));
      assert.equal(decodePng(bytes).width, size);
    }
    assert.ok(readFileSync(join(fixture, 'src-tauri/icons/icon.ico')).length > 100);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
