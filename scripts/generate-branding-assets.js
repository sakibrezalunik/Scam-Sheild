/**
 * Generate ScamShield branding assets from the official logo.
 *
 * The official logo contains:
 * - Shield mark (top ~55% of image)
 * - "SCAMSHIELD" text with gradient (middle)
 * - "by Lunik" text (bottom)
 *
 * For icons we need just the shield mark.
 * For full branding we use the complete logo.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = 'logo-source.png';
const BASE = 'E:\\Claude Testing\\scamshield';

async function main() {
  // ── Read source ──────────────────────────────────────────────
  const logoBuffer = fs.readFileSync(path.join(BASE, SRC));
  const logoMeta = await sharp(logoBuffer).metadata();
  console.log(`Source: ${logoMeta.width}x${logoMeta.height}`);

  // ── 1. Extract shield mark (top ~55% of image) ──────────────
  // The shield mark occupies roughly the top portion before the text
  const shieldRatio = 0.55;
  const shieldHeight = Math.round(logoMeta.height * shieldRatio);
  const shieldBuffer = await sharp(logoBuffer)
    .extract({ left: 0, top: 0, width: logoMeta.width, height: shieldHeight })
    .png()
    .toBuffer();

  // Also create a centered crop of just the shield (better for small icons)
  // The shield appears roughly centered horizontally
  const shieldMarkBuffer = await sharp(logoBuffer)
    .extract({
      left: Math.round(logoMeta.width * 0.15),
      top: Math.round(logoMeta.height * 0.05),
      width: Math.round(logoMeta.width * 0.7),
      height: Math.round(shieldHeight * 0.9),
    })
    .png()
    .toBuffer();

  // ── 2. Web favicon.ico ──────────────────────────────────────
  const faviconSizes = [16, 32, 48, 64];
  const faviconBuffers = [];
  for (const size of faviconSizes) {
    const buf = await sharp(shieldMarkBuffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();
    faviconBuffers.push(buf);
  }
  // Write favicon.ico (simple multi-size ICO)
  await writeICO(path.join(BASE, 'public', 'favicon.ico'), faviconBuffers);
  console.log('✓ public/favicon.ico');

  // ── 3. Full logo PNGs for web ───────────────────────────────
  const fullLogoBuffer = await sharp(logoBuffer)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(BASE, 'public', 'branding', 'scamshield-logo.png'), fullLogoBuffer);
  console.log('✓ public/branding/scamshield-logo.png');

  // ── 4. Desktop Tauri icons ──────────────────────────────────
  const tauriIcons = path.join(BASE, 'desktop', 'src-tauri', 'icons');
  fs.mkdirSync(tauriIcons, { recursive: true });

  // Main icon.png (256x256)
  const icon256 = await sharp(shieldMarkBuffer)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(tauriIcons, 'icon.png'), icon256);
  console.log('✓ desktop/src-tauri/icons/icon.png');

  // icon.ico (multi-size)
  await writeICO(path.join(tauriIcons, 'icon.ico'), [
    await sharp(shieldMarkBuffer).resize(16, 16, { fit: 'cover' }).png().toBuffer(),
    await sharp(shieldMarkBuffer).resize(24, 24, { fit: 'cover' }).png().toBuffer(),
    await sharp(shieldMarkBuffer).resize(32, 32, { fit: 'cover' }).png().toBuffer(),
    await sharp(shieldMarkBuffer).resize(48, 48, { fit: 'cover' }).png().toBuffer(),
    await sharp(shieldMarkBuffer).resize(64, 64, { fit: 'cover' }).png().toBuffer(),
    await sharp(shieldMarkBuffer).resize(128, 128, { fit: 'cover' }).png().toBuffer(),
    await sharp(shieldMarkBuffer).resize(256, 256, { fit: 'cover' }).png().toBuffer(),
  ]);
  console.log('✓ desktop/src-tauri/icons/icon.ico');

  // Standard Tauri icons
  const iconSizes = [32, 128];
  for (const s of iconSizes) {
    const buf = await sharp(shieldMarkBuffer)
      .resize(s, s, { fit: 'cover' })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(tauriIcons, `${s}x${s}.png`), buf);
    console.log(`✓ desktop/src-tauri/icons/${s}x${s}.png`);
  }

  // @2x variant
  const icon2x = await sharp(shieldMarkBuffer)
    .resize(256, 256, { fit: 'cover' })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(tauriIcons, '128x128@2x.png'), icon2x);
  console.log('✓ desktop/src-tauri/icons/128x128@2x.png');

  // Windows Store icons
  const storeSizes = [
    { name: 'Square30x30Logo', size: 30 },
    { name: 'Square44x44Logo', size: 44 },
    { name: 'Square71x71Logo', size: 71 },
    { name: 'Square107x107Logo', size: 107 },
    { name: 'Square142x142Logo', size: 142 },
    { name: 'Square150x150Logo', size: 150 },
    { name: 'Square284x284Logo', size: 284 },
    { name: 'Square310x310Logo', size: 310 },
    { name: 'StoreLogo', size: 50 },
  ];
  for (const { name, size } of storeSizes) {
    const buf = await sharp(shieldMarkBuffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(tauriIcons, `${name}.png`), buf);
    console.log(`✓ desktop/src-tauri/icons/${name}.png`);
  }

  // ── 5. Extension icons ──────────────────────────────────────
  const extAssets = path.join(BASE, 'extension', 'assets');
  fs.mkdirSync(extAssets, { recursive: true });

  for (const size of [16, 32, 48, 128]) {
    const buf = await sharp(shieldMarkBuffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(extAssets, `icon${size}.png`), buf);
    console.log(`✓ extension/assets/icon${size}.png`);
  }

  // ── 6. Desktop index.html favicon ───────────────────────────
  // Create a small favicon for the desktop app too
  const deskFavicon = await sharp(shieldMarkBuffer)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toBuffer();
  const desktopPublic = path.join(BASE, 'desktop', 'public');
  fs.mkdirSync(desktopPublic, { recursive: true });
  fs.writeFileSync(path.join(desktopPublic, 'favicon.png'), deskFavicon);
  console.log('✓ desktop/public/favicon.png');

  console.log('\nAll branding assets generated successfully.');
}

/**
 * Write a multi-size ICO file from an array of PNG buffers.
 * Simplified ICO writer — creates a valid .ico with multiple resolutions.
 */
async function writeICO(outputPath, buffers) {
  const entries = [];
  for (const buf of buffers) {
    const meta = await sharp(buf).metadata();
    entries.push({ buffer: buf, width: meta.width, height: meta.height });
  }

  // Sort by size ascending
  entries.sort((a, b) => a.width - b.width);

  const iconDirOffset = 6; // 2 + 2 + 2
  let dataOffset = iconDirOffset + entries.length * 16;

  // Build directory entries
  const dirEntries = entries.map((e) => {
    const entry = Buffer.alloc(16);
    entry[0] = e.width > 256 ? 0 : e.width;
    entry[1] = e.height > 256 ? 0 : e.height;
    entry[2] = 0; // palette
    entry[3] = 0; // reserved
    entry[4] = 1; // color planes (1)
    entry[5] = 24; // bits per pixel (24-bit)
    entry.writeUInt32LE(e.buffer.length, 6); // size
    entry.writeUInt32LE(dataOffset, 10); // offset
    return entry;
  });

  // Build file
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(entries.length, 4); // count

  const parts = [header, ...dirEntries];
  for (const e of entries) parts.push(e.buffer);

  const ico = Buffer.concat(parts);
  fs.writeFileSync(outputPath, ico);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
