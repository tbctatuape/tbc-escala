import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal PNG generator in pure Node.js (no external deps)
function createRawPNG(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw pixel data with scanline filter byte (0)
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);

  // Center TV screen calculation
  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.45;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      
      // Draw dark petroleum background with amber icon in center
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < outerR * 0.4) {
        // Inner amber logo (play triangle area)
        if (dx > -width*0.1 && dx < width*0.1 && Math.abs(dy) < width*0.12 && (dx*1.5 + Math.abs(dy)) < width*0.15) {
          rawData[pxOffset] = 251;   // R
          rawData[pxOffset + 1] = 191; // G
          rawData[pxOffset + 2] = 36;  // B (Amber #fbbf24)
        } else {
          // Inner tv frame dark slate
          rawData[pxOffset] = 30;
          rawData[pxOffset + 1] = 41;
          rawData[pxOffset + 2] = 59;
        }
      } else if (dist < outerR * 0.75) {
        // Slate card background
        rawData[pxOffset] = 30;
        rawData[pxOffset + 1] = 41;
        rawData[pxOffset + 2] = 59;
      } else {
        // #0f172a background
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);

  const crcVal = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write PNG files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createRawPNG(192, 192, 15, 23, 42));
fs.writeFileSync(path.join(publicDir, 'logo192.png'), createRawPNG(192, 192, 15, 23, 42));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createRawPNG(180, 180, 15, 23, 42));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createRawPNG(512, 512, 15, 23, 42));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createRawPNG(512, 512, 15, 23, 42));

console.log('PWA PNG assets successfully generated in public/ directory!');
