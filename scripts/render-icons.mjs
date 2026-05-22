import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  {
    svg: 'assets/source/logo-icon.svg',
    out: 'assets/images/icon.png',
    size: 1024,
  },
  {
    svg: 'assets/source/logo-mark-blue.svg',
    out: 'assets/images/splash-icon.png',
    size: 1024,
  },
  {
    svg: 'assets/source/logo-mark-white.svg',
    out: 'assets/images/android-icon-foreground.png',
    size: 432,
  },
  {
    svg: 'assets/source/logo-mark-mono.svg',
    out: 'assets/images/android-icon-monochrome.png',
    size: 432,
  },
];

for (const t of targets) {
  const src = await readFile(resolve(ROOT, t.svg));
  await sharp(src)
    .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(ROOT, t.out));
  console.log(`✓ ${t.out}`);
}

await sharp({
  create: {
    width: 432,
    height: 432,
    channels: 4,
    background: { r: 10, g: 132, b: 255, alpha: 1 },
  },
})
  .png()
  .toFile(resolve(ROOT, 'assets/images/android-icon-background.png'));
console.log('✓ assets/images/android-icon-background.png');

console.log('\nAll icons rendered.');
