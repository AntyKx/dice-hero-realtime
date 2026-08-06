/**
 * 產生 Dice Hero PWA 圖示
 * 設計：深藍圓角背景 + 金色骰子（六點）+ 寶劍
 * 執行：node scripts/gen-icons.mjs
 */

import { PNG } from 'pngjs'
import { writeFileSync, mkdirSync } from 'fs'

function createIcon(size) {
  const png = new PNG({ width: size, height: size, colorType: 6 })
  const d = png.data
  d.fill(0)

  const s = size

  // Alpha-composite: draw pixel with anti-aliasing
  function put(x, y, r, g, b, a) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || x >= s || y < 0 || y >= s) return
    const i = (y * s + x) * 4
    const sa = a / 255, da = d[i+3] / 255
    const oa = sa + da * (1 - sa)
    if (oa < 0.001) return
    d[i]   = Math.round((r * sa + d[i]   * da * (1-sa)) / oa)
    d[i+1] = Math.round((g * sa + d[i+1] * da * (1-sa)) / oa)
    d[i+2] = Math.round((b * sa + d[i+2] * da * (1-sa)) / oa)
    d[i+3] = Math.round(oa * 255)
  }

  function circle(cx, cy, r, R, G, B, alpha = 255) {
    const rr = Math.ceil(r + 1.5)
    for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
      const dist = Math.sqrt(dx*dx + dy*dy)
      const a = Math.max(0, Math.min(1, r - dist + 0.7))
      if (a > 0) put(cx + dx, cy + dy, R, G, B, Math.round(a * alpha))
    }
  }

  function roundRect(x0, y0, w, h, r, R, G, B, alpha = 255) {
    const x1 = x0 + w, y1 = y0 + h
    const pad = 2
    for (let y = Math.floor(y0) - pad; y <= Math.ceil(y1) + pad; y++) {
      for (let x = Math.floor(x0) - pad; x <= Math.ceil(x1) + pad; x++) {
        const qx = x < x0 + r ? x0 + r - x : x > x1 - r ? x - (x1 - r) : 0
        const qy = y < y0 + r ? y0 + r - y : y > y1 - r ? y - (y1 - r) : 0
        const sd = Math.sqrt(Math.max(0,qx)*Math.max(0,qx) + Math.max(0,qy)*Math.max(0,qy)) - r
        const a = Math.max(0, Math.min(1, -sd + 0.7))
        if (a > 0) put(x, y, R, G, B, Math.round(a * alpha))
      }
    }
  }

  // Thick line with round caps
  function line(x1, y1, x2, y2, thick, R, G, B, alpha = 255) {
    const len = Math.sqrt((x2-x1)**2 + (y2-y1)**2)
    if (len < 0.001) return
    const steps = Math.ceil(len * 2)
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      circle(x1 + (x2-x1)*t, y1 + (y2-y1)*t, thick/2, R, G, B, alpha)
    }
  }

  // ── 1. Background: deep navy, slight gradient ─────────────────────────
  roundRect(0, 0, s, s, s * 0.18, 10, 18, 45)

  // subtle top highlight
  for (let y = 0; y < s * 0.5; y++) {
    const strength = (1 - y / (s * 0.5)) * 15
    for (let x = 0; x < s; x++) {
      if (d[(y * s + x) * 4 + 3] > 0) {
        const i = (y * s + x) * 4
        d[i]   = Math.min(255, d[i]   + Math.round(strength))
        d[i+1] = Math.min(255, d[i+1] + Math.round(strength))
        d[i+2] = Math.min(255, d[i+2] + Math.round(strength * 2))
      }
    }
  }

  // ── 2. Die face ──────────────────────────────────────────────────────
  const dm = s * 0.095
  const dr = s * 0.115

  // Shadow under die
  roundRect(dm + s*0.025, dm + s*0.025, s - dm*2, s - dm*2, dr, 0, 0, 0, 80)

  // Gold outer border
  roundRect(dm, dm, s - dm*2, s - dm*2, dr, 210, 158, 28)

  // Gold face
  roundRect(dm + s*0.018, dm + s*0.018, s - dm*2 - s*0.036, s - dm*2 - s*0.036, dr * 0.92, 255, 198, 48)

  // Cream inner face
  const fm = dm + s * 0.055
  roundRect(fm, fm, s - fm*2, s - fm*2, dr * 0.7, 252, 244, 218)

  // ── 3. Six pips (dark navy) ──────────────────────────────────────────
  const pr  = s * 0.057
  const pc  = { r: 18, g: 30, b: 72 }
  const lx  = s * 0.320, rx = s * 0.680
  const ty  = s * 0.290, my = s * 0.500, by = s * 0.710

  for (const [cx, cy] of [[lx,ty],[rx,ty],[lx,my],[rx,my],[lx,by],[rx,by]])
    circle(cx, cy, pr, pc.r, pc.g, pc.b)

  // ── 4. Sword (white/silver) ──────────────────────────────────────────
  //  — small diagonal sword bottom-right of die face, at ~45°
  const sw = s * 0.030   // sword half-thickness
  const sc = { r: 255, g: 245, b: 200 }  // warm white

  // Blade: from bottom-right toward center-left (45°)
  const bx1 = s * 0.730, by1 = s * 0.760
  const bx2 = s * 0.555, by2 = s * 0.585
  line(bx1, by1, bx2, by2, sw * 0.55, sc.r, sc.g, sc.b)

  // Tip: sharper
  circle(bx2, by2, sw * 0.3, sc.r, sc.g, sc.b)

  // Crossguard (perpendicular to blade, at 1/3 from handle)
  const gt  = 0.38
  const gcx = bx1 + (bx2 - bx1) * gt, gcy = by1 + (by2 - by1) * gt
  const gbdx = -(by2 - by1), gbdy = (bx2 - bx1)  // perpendicular vector
  const gbLen = Math.sqrt(gbdx**2 + gbdy**2)
  const guardLen = s * 0.088
  line(
    gcx - gbdx / gbLen * guardLen, gcy - gbdy / gbLen * guardLen,
    gcx + gbdx / gbLen * guardLen, gcy + gbdy / gbLen * guardLen,
    sw * 0.75, 200, 230, 255
  )

  // Pommel (small circle at handle end)
  circle(bx1 + (bx2-bx1)*0.08, by1 + (by2-by1)*0.08, sw * 1.1, 200, 230, 255)

  return png
}

// Generate icons
mkdirSync('public/icons', { recursive: true })

for (const size of [32, 180, 192, 512]) {
  const png = createIcon(size)
  const buf = PNG.sync.write(png)
  writeFileSync(`public/icons/icon-${size}.png`, buf)
  console.log(`✓ icon-${size}.png`)
}

// Also copy 192 as favicon
writeFileSync('public/favicon.ico', PNG.sync.write(createIcon(32)))
console.log('✓ favicon.ico (32px)')
console.log('\n完成！')
