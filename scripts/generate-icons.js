import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";

const SIZES = [16, 32, 48, 128];

await mkdir("assets", { recursive: true });

for (const size of SIZES) {
  await writeFile(`assets/icon-${size}.png`, makeIconPng(size));
}

console.log(`Generated ${SIZES.length} PNG icons.`);

function makeIconPng(size) {
  const data = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const outerRadius = size * 0.34;
  const innerRadius = size * 0.25;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const distance = Math.sqrt(dx * dx + dy * dy);

      let color = [255, 250, 241, 255];
      if (distance < outerRadius) color = [31, 41, 55, 255];
      if (distance < innerRadius && distance > innerRadius * 0.72) color = [247, 200, 115, 255];
      if (Math.abs(dx) < size * 0.045 && dy < size * 0.1 && dy > -size * 0.19) color = [255, 250, 241, 255];
      if (dy > size * 0.02 && dx > -size * 0.02 && dx < size * 0.19 && Math.abs(dy - dx * 0.55) < size * 0.045) color = [255, 250, 241, 255];

      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }

  return encodePng(size, size, data);
}

function encodePng(width, height, rgba) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    rgba.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const name = Buffer.from(type);
  return Buffer.concat([u32(data.length), name, data, u32(crc32(Buffer.concat([name, data])))]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
