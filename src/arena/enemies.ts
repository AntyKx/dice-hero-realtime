/**
 * M3：敵人型別表與波次生成的純函式。全部沿用現有 /assets/frames/enemies/
 * 底下已經有的個別幀圖（goblin/skeleton/orc/slimeking/mimic/dark_knight/
 * dragon），不用新增美術。
 */

export interface EnemyTypeDef {
  id: string // 對應 /assets/frames/enemies/{id}/idle_0.png
  name: string
  hpMult: number
  speedMult: number
  damageMult: number
  spriteHeight: number
  weight: number
  minMinute: number // 幾分鐘後才會加入池子，製造內容隨時間展開的節奏
  isBoss?: boolean
}

export const ENEMY_TYPES: EnemyTypeDef[] = [
  { id: 'goblin', name: '哥布林', hpMult: 1.0, speedMult: 1.0, damageMult: 1.0, spriteHeight: 64, weight: 30, minMinute: 0 },
  { id: 'skeleton', name: '骸骨兵士', hpMult: 0.7, speedMult: 1.35, damageMult: 0.8, spriteHeight: 66, weight: 24, minMinute: 0 },
  { id: 'orc', name: '荊棘野豬', hpMult: 1.8, speedMult: 0.72, damageMult: 1.3, spriteHeight: 70, weight: 16, minMinute: 0.5 },
  { id: 'slimeking', name: '史萊姆王', hpMult: 1.4, speedMult: 0.85, damageMult: 1.0, spriteHeight: 60, weight: 16, minMinute: 1 },
  { id: 'mimic', name: '寶箱怪', hpMult: 1.2, speedMult: 1.1, damageMult: 1.1, spriteHeight: 62, weight: 14, minMinute: 1.5 },
  { id: 'dark_knight', name: '黑暗騎士', hpMult: 2.6, speedMult: 0.9, damageMult: 1.6, spriteHeight: 74, weight: 8, minMinute: 2.5 },
]

export const BOSS_TYPE: EnemyTypeDef = {
  id: 'dragon', name: '巨龍', hpMult: 26, speedMult: 0.55, damageMult: 2.6, spriteHeight: 130, weight: 0, minMinute: 0, isBoss: true,
}

export const BOSS_SPAWN_SEC = 180 // 3 分鐘

/** 依照目前經過秒數，從已解鎖的敵人型別中依權重抽一種。 */
export function pickEnemyType(elapsedSec: number): EnemyTypeDef {
  const minute = elapsedSec / 60
  const pool = ENEMY_TYPES.filter(t => t.minMinute <= minute)
  const usable = pool.length > 0 ? pool : ENEMY_TYPES.filter(t => t.minMinute === 0)
  const total = usable.reduce((sum, t) => sum + t.weight, 0)
  let r = Math.random() * total
  for (const t of usable) {
    r -= t.weight
    if (r <= 0) return t
  }
  return usable[usable.length - 1]
}

/** 生怪間隔：開局 2.2 秒一隻，4 分鐘內線性收斂到 0.5 秒一隻。 */
export function spawnIntervalSec(elapsedSec: number): number {
  const t = Math.min(elapsedSec, 240) / 240
  return 2.2 - t * 1.7
}

/** 同屏上限：開局 6 隻，5 分鐘內線性長到 30 隻。 */
export function maxConcurrentEnemies(elapsedSec: number): number {
  const t = Math.min(elapsedSec, 300) / 300
  return Math.round(6 + t * 24)
}
