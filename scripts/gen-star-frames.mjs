import { PNG } from 'pngjs'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

const SHEET_DIR = 'public/assets/spritesheets/heroes'
const OUT_DIR = 'public/assets/frames/heroes'
const NAMES = ['idle_0', 'idle_1', 'attack_0', 'attack_1', 'skill_0', 'hurt_0']

const HEROES = [
  { id: 'knight', stars: [['knight_s0',423,320],['knight_s1',356,320],['knight_s2',393,320],['knight_s3',358,320]] },
  { id: 'mage', stars: [['mage_s0',374,320],['mage_s1',345,320],['mage_s2',315,320],['mage_s3',347,320]] },
  { id: 'priest', stars: [['priest_s0',243,320],['priest_s1',259,320],['priest_s2',274,320],['priest_s3',310,320]] },
  { id: 'rogue', stars: [['rogue_s0',415,320],['rogue_s1',425,320],['rogue_s2',484,320],['rogue_s3',347,320]] },
  { id: 'princess', stars: [['princess_s0',350,320],['princess_s1',313,320],['princess_s2',316,320],['princess_s3',319,320]] },
  { id: 'archer', stars: [['archer_s0',361,320],['archer_s1',483,320],['archer_s2',349,320],['archer_s3',388,320]] },
  { id: 'dwarf', stars: [['dwarf_s0',384,320],['dwarf_s1',328,320],['dwarf_s2',340,320],['dwarf_s3',354,320]] },
  { id: 'bard', stars: [['bard_s0',355,320],['bard_s1',342,320],['bard_s2',315,320],['bard_s3',317,320]] },
  { id: 'beastmaster', stars: [['beastmaster_s0',339,320],['beastmaster_s1',300,320],['beastmaster_s2',347,320],['beastmaster_s3',332,320]] },
  { id: 'engineer', stars: [['engineer_s0',295,320],['engineer_s1',313,320],['engineer_s2',339,320],['engineer_s3',324,320]] },
  { id: 'fighter', stars: [['fighter_s0',262,188],['fighter_s1',264,192],['fighter_s2',272,198],['fighter_s3',298,238]] },
]

let ok = 0, fail = 0
for (const hero of HEROES) {
  hero.stars.forEach(([sheetId, frameW, frameH], starTier) => {
    const srcPath = `${SHEET_DIR}/${sheetId}.png`
    if (!existsSync(srcPath)) { console.error('MISSING SHEET', srcPath); fail++; return }
    const src = PNG.sync.read(readFileSync(srcPath))
    const expectedW = frameW * 6
    if (src.width !== expectedW || src.height !== frameH) {
      console.error(`DIM MISMATCH ${sheetId}: sheet is ${src.width}x${src.height}, expected ${expectedW}x${frameH}`)
      fail++
      return
    }
    const outDir = `${OUT_DIR}/${hero.id}/s${starTier}`
    mkdirSync(outDir, { recursive: true })
    for (let i = 0; i < 6; i++) {
      const out = new PNG({ width: frameW, height: frameH })
      for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
          const sx = i * frameW + x
          const si = (y * src.width + sx) * 4
          const di = (y * frameW + x) * 4
          out.data[di] = src.data[si]
          out.data[di+1] = src.data[si+1]
          out.data[di+2] = src.data[si+2]
          out.data[di+3] = src.data[si+3]
        }
      }
      writeFileSync(`${outDir}/${NAMES[i]}.png`, PNG.sync.write(out))
    }
    ok++
    console.log(`OK ${hero.id} s${starTier} <- ${sheetId} (${frameW}x${frameH})`)
  })
}
console.log(`\n完成：${ok} 組成功，${fail} 組失敗`)
