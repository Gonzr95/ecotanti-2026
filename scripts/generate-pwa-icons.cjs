const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, bgColor, fgColor) {
  // BG: rgb, FG: rgb
  // Create raw RGBA image buffer
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Calculate distance from center for a rounded icon / shield shape
      const cx = width / 2;
      const cy = height / 2;
      const dx = (x - cx) / (width * 0.35);
      const dy = (y - cy) / (height * 0.35);
      const isInside = (dx * dx + dy * dy) <= 1.0;

      if (isInside) {
        // Foreground (Indigo / White)
        rawData[pxOffset] = fgColor[0];
        rawData[pxOffset + 1] = fgColor[1];
        rawData[pxOffset + 2] = fgColor[2];
        rawData[pxOffset + 3] = 255;
      } else {
        // Background (Slate 950: #020617)
        rawData[pxOffset] = bgColor[0];
        rawData[pxOffset + 1] = bgColor[1];
        rawData[pxOffset + 2] = bgColor[2];
        rawData[pxOffset + 3] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    
    // CRC calculation
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // CRC32 table
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (0xedb88320 & (-(c & 1)));
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', deflated);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'projects', 'backoffice', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Background: #020617 (Slate 950), Foreground: #6366f1 (Indigo 500)
const bg = [2, 6, 23];
const fg = [99, 102, 241];

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPng(192, 192, bg, fg));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPng(512, 512, bg, fg));
console.log('✅ PWA Icons generated successfully in', iconsDir);

