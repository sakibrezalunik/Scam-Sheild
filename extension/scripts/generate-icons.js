/**
 * Generate minimal PNG icons for the ScamShield extension.
 * Each PNG is a solid-color shield icon (simplified placeholder).
 * Run: node scripts/generate-icons.js
 */
const { createWriteStream } = require('fs');
const { deflateSync } = require('zlib');

// Minimal 1x1 red pixel as PNG — we'll draw actual icon shapes via canvas-like approach
// Instead, we generate simple gradient-ish shield SVGs and document conversion.
// For now, generate valid minimal PNGs using raw PNG structure.

function createPNG(width, height, r, g, b) {
  // Create a simple solid-color PNG
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(Buffer.from([0, ...Array.from({ length: width }, () => b, g, r)]));
  }
  const raw = Buffer.concat(rawRows);
  const compressed = deflateSync(raw, { level: 9 });

  const chunk = (name, data) => {
    const buf = Buffer.concat([
      Buffer.from(name),
      data,
      Buffer.from(crc32(name + data).toString(16).padStart(8, '0'), 'hex')
    ]);
    return Buffer.concat([
      Buffer.alloc(4, 0), // length placeholder
      buf
    ]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const sig = Buffer.from('PNG', 'ascii');
  const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  // Fix lengths
  let offset = 8;
  while (offset < png.length - 4) {
    const len = png.readUInt32BE(offset);
    png.writeUInt32BE(len, offset);
    offset += 12 + len;
  }

  return png;
}

function crc32(str) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  const s = typeof str === 'string' ? Buffer.from(str, 'binary') : str;
  for (let i = 0; i < s.length; i++) {
    crc = table[(crc ^ s[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Shield shape using a more sophisticated approach — draw as SVG, we'll convert
// For now create simple solid PNGs; user can replace with real icons
const colors = [
  { r: 16, g: 185, b: 129 }, // green #10b981
];

for (const size of [16, 32, 48, 128]) {
  const { r, g, b } = colors[0];
  const png = createPNG(size, size, r, g, b);
  const path = `E:\\Claude Testing\\scamshield\\extension\\assets\\icon${size}.png`;
  createWriteStream(path).write(png, () => {});
  console.log(`Generated ${path}`);
}

console.log('Done — replace with proper shield icons for production.');
