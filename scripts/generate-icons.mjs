// 由 src/assets/logo.svg 產生 PWA 圖示：Logo 置中於 bg 色（#F7FAFF）方形底。
// 用法：npm run icons（產出的 PNG 已提交，修改 Logo 時才需要重跑）
import { copyFile, readFile } from 'node:fs/promises'
import sharp from 'sharp'

const BG = '#F7FAFF'
const logo = await readFile(new URL('../src/assets/logo.svg', import.meta.url))
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

// scale：Logo 佔畫布邊長的比例。maskable 需要留在中央 80% 安全區內，所以縮小。
const targets = [
  { name: 'icon-192.png', size: 192, scale: 0.75 },
  { name: 'icon-512.png', size: 512, scale: 0.75 },
  { name: 'icon-maskable-512.png', size: 512, scale: 0.6 },
  { name: 'apple-touch-icon.png', size: 180, scale: 0.75 },
]

for (const { name, size, scale } of targets) {
  const logoSize = Math.round(size * scale)
  const logoPng = await sharp(logo, { density: 72 * (logoSize / 96) * 2 })
    .resize(logoSize, logoSize)
    .png()
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logoPng, gravity: 'center' }])
    .flatten({ background: BG })
    .png()
    .toFile(out(name))
  console.log(`✓ public/${name}`)
}

await copyFile(new URL('../src/assets/logo.svg', import.meta.url), new URL('../public/favicon.svg', import.meta.url))
console.log('✓ public/favicon.svg')
