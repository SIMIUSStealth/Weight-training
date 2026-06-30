// Generates the PWA icon set + favicon from an inline SVG dumbbell.
// Run with `npm run icons`. Outputs are committed so CI never needs sharp.
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** A 512×512 dumbbell glyph on a dark card. `radius` rounds the background. */
function svg(radius) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd277"/>
      <stop offset="1" stop-color="#f3a01b"/>
    </linearGradient>
    <linearGradient id="db" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2c1607"/>
      <stop offset="1" stop-color="#181006"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.38" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.38"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="${radius}" fill="url(#glow)"/>
  <g fill="url(#db)">
    <rect x="206" y="236" width="100" height="40" rx="20"/>
    <rect x="170" y="196" width="40" height="120" rx="16"/>
    <rect x="302" y="196" width="40" height="120" rx="16"/>
    <rect x="138" y="216" width="34" height="80" rx="14"/>
    <rect x="340" y="216" width="34" height="80" rx="14"/>
    <rect x="118" y="232" width="24" height="48" rx="10"/>
    <rect x="370" y="232" width="24" height="48" rx="10"/>
  </g>
</svg>`
}

async function png(svgStr, size, outRel) {
  const out = resolve(root, outRel)
  await mkdir(dirname(out), { recursive: true })
  await sharp(Buffer.from(svgStr)).resize(size, size).png().toFile(out)
  console.log('wrote', outRel)
}

const rounded = svg(115)
const square = svg(0)

await mkdir(resolve(root, 'public/icons'), { recursive: true })
await writeFile(resolve(root, 'public/favicon.svg'), rounded)
console.log('wrote public/favicon.svg')
await png(rounded, 192, 'public/icons/icon-192.png')
await png(rounded, 512, 'public/icons/icon-512.png')
await png(square, 512, 'public/icons/maskable-512.png')
await png(square, 180, 'public/apple-touch-icon.png')

console.log('done')
