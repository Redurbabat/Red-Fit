import { deflateSync, inflateSync } from 'node:zlib';

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_DIMENSION = 2048;

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, contents) {
  const tag = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(contents.length);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(crc32(Buffer.concat([tag, contents])));
  return Buffer.concat([length, tag, contents, check]);
}

/** Encode RGBA bytes as a standards-compliant 8-bit RGBA PNG. */
export function encodeRgbaPng(width, height, rgba) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width > MAX_DIMENSION || height > MAX_DIMENSION || rgba.length !== width * height * 4) {
    throw new Error('Invalid RGBA PNG dimensions or payload');
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const start = y * (width * 4 + 1);
    raw[start] = 0;  // PNG filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4)
      .copy(raw, start + 1);
  }
  return Buffer.concat([
    PNG_SIG, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Only accepts bounded 8-bit, noninterlaced PNG. Supports RGBA/RGB/grayscale/palette. */
export function decodePng(bytes) {
  const data = Buffer.from(bytes);
  if (data.length < 45 || !data.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error('The existing PWA icon is not a PNG');
  }
  let width = 0; let height = 0; let channels = 0;
  let palette = null; let transparency = null; let foundHeader = false;
  const idat = [];
  for (let offset = 8; offset + 12 <= data.length;) {
    const length = data.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (length > 32 * 1024 * 1024 || end > data.length) throw new Error('Invalid PNG chunk size');
    const type = data.toString('ascii', offset + 4, offset + 8);
    const value = data.subarray(offset + 8, offset + 8 + length);
    if (crc32(data.subarray(offset + 4, offset + 8 + length)) !== data.readUInt32BE(end - 4)) {
      throw new Error(`Invalid PNG CRC in ${type}`);
    }
    if (type === 'IHDR') {
      if (foundHeader || length !== 13) throw new Error('Invalid PNG header');
      foundHeader = true;
      width = value.readUInt32BE(0);
      height = value.readUInt32BE(4);
      const colorType = value[9];
      if (value[8] !== 8 || value[10] !== 0 || value[11] !== 0 || value[12] !== 0 ||
          ![0, 2, 3, 6].includes(colorType) || width < 1 || height < 1 ||
          width > MAX_DIMENSION || height > MAX_DIMENSION) {
        throw new Error('Expected an 8-bit, noninterlaced PNG (max 2048px)');
      }
      channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
    } else if (type === 'PLTE') palette = value;
    else if (type === 'tRNS') transparency = value;
    else if (type === 'IDAT') idat.push(value);
    else if (type === 'IEND') break;
    else if ((type.charCodeAt(0) & 32) === 0) throw new Error(`Unsupported critical PNG chunk ${type}`);
    offset = end;
  }
  if (!foundHeader || idat.length === 0) throw new Error('PNG missing header or pixels');
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat), { maxOutputLength: (stride + 1) * height });
  if (raw.length !== (stride + 1) * height) throw new Error('PNG pixel payload size mismatch');
  const pixels = Buffer.alloc(width * height * 4);
  const previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const base = y * (stride + 1);
    const filter = raw[base];
    if (filter > 4) throw new Error('Unsupported PNG row filter');
    const row = Buffer.from(raw.subarray(base + 1, base + 1 + stride));
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? row[i - channels] : 0;
      const above = previous[i];
      const upperLeft = i >= channels ? previous[i - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = above;
      if (filter === 3) predictor = (left + above) >>> 1;
      if (filter === 4) {
        const estimate = left + above - upperLeft;
        const distances = [Math.abs(estimate - left), Math.abs(estimate - above), Math.abs(estimate - upperLeft)];
        predictor = distances[0] <= distances[1] && distances[0] <= distances[2] ? left
          : distances[1] <= distances[2] ? above : upperLeft;
      }
      row[i] = (row[i] + predictor) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      if (channels === 4) {
        pixels[target] = row[source]; pixels[target + 1] = row[source + 1];
        pixels[target + 2] = row[source + 2]; pixels[target + 3] = row[source + 3];
      } else if (channels === 3) {
        pixels[target] = row[source]; pixels[target + 1] = row[source + 1];
        pixels[target + 2] = row[source + 2]; pixels[target + 3] = 255;
      } else if (palette) {
        const index = row[source];
        if (index * 3 + 2 >= palette.length) throw new Error('Invalid PNG palette index');
        pixels[target] = palette[index * 3]; pixels[target + 1] = palette[index * 3 + 1];
        pixels[target + 2] = palette[index * 3 + 2]; pixels[target + 3] = transparency?.[index] ?? 255;
      } else {
        pixels[target] = row[source]; pixels[target + 1] = row[source];
        pixels[target + 2] = row[source]; pixels[target + 3] = 255;
      }
    }
    row.copy(previous);
  }
  return { width, height, rgba: pixels };
}

/** Bilinear resampling with premultiplied alpha avoids dark edge halos. */
export function resizeRgba(image, side) {
  if (!Number.isInteger(side) || side < 1 || side > MAX_DIMENSION) throw new Error('Invalid icon size');
  const output = Buffer.alloc(side * side * 4);
  const { width, height, rgba } = image;
  for (let y = 0; y < side; y++) {
    const sourceY = Math.max(0, Math.min(height - 1, (y + .5) * height / side - .5));
    const y0 = Math.floor(sourceY), y1 = Math.min(y0 + 1, height - 1), ty = sourceY - y0;
    for (let x = 0; x < side; x++) {
      const sourceX = Math.max(0, Math.min(width - 1, (x + .5) * width / side - .5));
      const x0 = Math.floor(sourceX), x1 = Math.min(x0 + 1, width - 1), tx = sourceX - x0;
      const neighbors = [
        [(y0 * width + x0) * 4, (1 - tx) * (1 - ty)],
        [(y0 * width + x1) * 4, tx * (1 - ty)],
        [(y1 * width + x0) * 4, (1 - tx) * ty],
        [(y1 * width + x1) * 4, tx * ty],
      ];
      const destination = (y * side + x) * 4;
      let alpha = 0;
      for (const [i, weight] of neighbors) alpha += rgba[i + 3] * weight;
      output[destination + 3] = Math.round(alpha);
      for (let color = 0; color < 3; color++) {
        let premultiplied = 0;
        for (const [i, weight] of neighbors) premultiplied += rgba[i + color] * rgba[i + 3] * weight;
        output[destination + color] = alpha > 0 ? Math.round(premultiplied / alpha) : 0;
      }
    }
  }
  return output;
}

/** Windows ICO with embedded PNGs; 32px layer must be first for Tauri. */
export function encodeWindowsIco(layers) {
  if (!layers.length || layers.some(({ size, png }) => size > 256 || size < 1 || !Buffer.isBuffer(png))) {
    throw new Error('Invalid ICO layers');
  }
  const header = Buffer.alloc(6 + 16 * layers.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(layers.length, 4);
  let offset = header.length;
  for (let i = 0; i < layers.length; i++) {
    const { size, png } = layers[i];
    const entry = 6 + i * 16;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  }
  return Buffer.concat([header, ...layers.map(({ png }) => png)]);
}
