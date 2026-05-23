import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Background navy sampled from the PNG corner — keeps splash + adaptive bg
// flush with the artwork's own background so masking doesn't reveal seams.
const BG_NAVY = { r: 0x0d, g: 0x19, b: 0x2e, alpha: 1 };

const ICON_SRC = 'assets/source/surprise-travel.png';
const SPLASH_SRC = 'assets/source/splash-travel-surprise.png';
const MONO_SRC = 'assets/source/logo-mark-mono.svg';

const targets = [
  { src: ICON_SRC, out: 'assets/images/icon.png', size: 1024, trim: false },
  { src: SPLASH_SRC, out: 'assets/images/splash-icon.png', size: 1024, trim: true },
  { src: ICON_SRC, out: 'assets/images/android-icon-foreground.png', size: 432, trim: false },
  { src: MONO_SRC, out: 'assets/images/android-icon-monochrome.png', size: 432, trim: false },
];

for (const t of targets) {
  const buf = await readFile(resolve(ROOT, t.src));
  let pipeline = sharp(buf);
  if (t.trim) pipeline = pipeline.trim({ background: '#ffffff' });
  await pipeline
    .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(ROOT, t.out));
  console.log(`✓ ${t.out}`);
}

await sharp({
  create: { width: 432, height: 432, channels: 4, background: BG_NAVY },
})
  .png()
  .toFile(resolve(ROOT, 'assets/images/android-icon-background.png'));
console.log('✓ assets/images/android-icon-background.png');

console.log('\nAll icons rendered.');
