# Dice Hero RPG — 完整專案文件

> 版本 v6.8 · 技術棧：React 18 + TypeScript + Vite PWA  
> 部署：Netlify (diceherorpg.netlify.app) + Cloudflare Pages (diceherorpg.pages.dev)

---

## 目錄

1. [指令](#指令)
2. [架構總覽](#架構總覽)
3. [GamePhase 狀態機](#gamephase-狀態機)
4. [核心型別（types.ts）](#核心型別)
5. [英雄系統（data.ts）](#英雄系統)
6. [敵人系統（data.ts + bosses.ts）](#敵人系統)
7. [骰子與戰鬥計算（gameLogic.ts）](#骰子與戰鬥計算)
8. [主線地圖（mapGen.ts）](#主線地圖)
9. [副本系統（dungeon.ts）](#副本系統)
10. [戰鬥畫面（BattleScreen）](#戰鬥畫面)
11. [Buff 卡系統（buffCards.ts）](#buff-卡系統)
12. [遺物系統（relics.ts）](#遺物系統)
13. [裝備系統（equipment.ts）](#裝備系統)
14. [天賦系統（talents.ts）](#天賦系統)
15. [事件 / 詛咒 / 藥水](#事件詛咒藥水)
16. [Meta 與存檔（meta.ts + save.ts）](#meta-與存檔)
17. [畫面元件清單](#畫面元件清單)
18. [Sprite Sheet 格式](#sprite-sheet-格式)
19. [Firebase 整合](#firebase-整合)
20. [CSS 命名慣例](#css-命名慣例)

---

## 指令

```bash
npm run dev                  # 開發伺服器 http://localhost:5173
npm run build                # TypeScript 編譯 + Vite 打包
npm run preview              # 預覽 dist/
node scripts/remove-bg.mjs   # 批次移除 public/assets/spritesheets/ 內白色背景
node scripts/import-star-sprites.mjs  # 綠幕5frame→去背→6frame統一排版

# 部署 Cloudflare Pages（改完直接 build + 部署）
npm run build && npx wrangler pages deploy dist --project-name diceherorpg
```

---

## 架構總覽

```
src/
  App.tsx              # 根元件，持有 phase + run + meta 狀態
  types.ts             # 所有共用型別
  data.ts              # HEROES[] + ENEMIES[] + SpriteMeta
  gameLogic.ts         # 純函式：evaluateDice / computeHeroAction / applyCardEffects
  mapGen.ts            # 主線地圖：generateMap / advanceMap / getEnemyForNode
  dungeon.ts           # 副本：DungeonDef / DungeonNode / generateDungeonMap
  buffCards.ts         # ALL_BUFF_CARDS + getRandomCards
  relics.ts            # ALL_RELICS + getRandomRelics
  equipment.ts         # 裝備生成、詞綴、套裝、星蝕系列
  talents.ts           # 天賦樹、星等條件、EXP
  bosses.ts            # ENEMY_MECHANICS + MECHANIC_DESC
  events.ts            # GAME_EVENTS + getRandomEvent
  curses.ts            # ALL_CURSES + getRandomCurse
  potions.ts           # ALL_POTIONS + getRandomPotion
  meta.ts              # loadMeta / saveMeta / calcRunStardust
  save.ts              # saveRun / loadSavedRun / clearSavedRun
  screens/             # 各畫面元件（見畫面元件清單）
  components/          # 共用元件：SpriteAnimator / DieFace / RelicChip 等
  lib/firebase.ts      # Firebase Auth + Firestore cloud save/load
```

---

## GamePhase 狀態機

`App.tsx` 持有 `phase: GamePhase`，根據 phase 渲染對應畫面。

### 主線流程

```
main_menu
  → hero_select → route_select
    → map → battle → reward / relic_reward / equipment_drop
    → map → rest / shop / event
    → map → boss → chapter_clear → relic_reward → map（新章）
    → map → final boss → victory
    → game_over（HP 歸零）
```

### 副本流程

```
main_menu → dungeon_select
  → dungeon_map（節點地圖）
    → battle（副本戰鬥）
      ↙ win  → dungeon_map（推進節點）
      ↙ boss → dungeon_result（通關）
      ↙ loss → dungeon_result（失敗）
```

### 其他 phases

| type | 說明 |
|------|------|
| `equipment_manage` | 裝備管理畫面 |
| `forge` | 鍛造畫面 |
| `equipment_drop` | 戰後裝備掉落選擇 |
| `chapter_clear` | 章節通關 |
| `meta` | （已廢棄，改為 victory） |

### GamePhase 型別（完整）

```typescript
export type GamePhase =
  | { type: 'main_menu' }
  | { type: 'equipment_manage' }
  | { type: 'forge' }
  | { type: 'hero_select' }
  | { type: 'route_select' }
  | { type: 'equipment_drop' }
  | { type: 'map' }
  | { type: 'battle'; isElite: boolean; isBoss: boolean; isChapterBoss: boolean;
      floorMult: number; goldReward: number; enemyId: string;
      enemyAffixes: EnemyAffix[]; forbiddenDice?: number[] }
  | { type: 'reward' }
  | { type: 'relic_reward' }
  | { type: 'shop' }
  | { type: 'rest' }
  | { type: 'event'; eventId: string }
  | { type: 'chapter_clear'; chapter: number }
  | { type: 'meta'; result: RunResult }
  | { type: 'game_over' }
  | { type: 'victory'; result: RunResult }
  | { type: 'dungeon_select' }
  | { type: 'dungeon_map'; dungeonId: string; heroId: string }
  | { type: 'dungeon_result'; dungeonId: string; heroId: string; cleared: boolean; floorsCleared: number }
```

---

## 核心型別

### RunState（主線局內狀態）

```typescript
type RunState = {
  party: PartyMember[]          // 隊伍成員（目前僅 1 人）
  activePartyIdx: number        // 當前操作中的隊員 index
  gold: number
  cards: BuffCard[]             // 持有的 buff 卡
  relics: string[]              // 持有的遺物 id 陣列
  curses: string[]              // 持有的詛咒 id 陣列
  enemyStatus: StatusEffect[]
  heroStatus: StatusEffect[]
  nodes: MapNode[]              // 主線地圖節點（一個章節）
  currentNodeId: number | null
  noDamageBattleCount: number   // 連續零傷害場次（不倒翁遺物等用）
  chapter: number               // 當前章節 1-3
  routeType: RouteType          // 'safe' | 'risk' | 'resource'
  potions: string[]             // 持有藥水 id（最多 MAX_POTIONS=3）
  cardLevels: Record<string, number>  // card id → 等級 1~3
}
```

### MetaState（局外永久狀態）

```typescript
type MetaState = {
  stardust: number            // 星塵（主要貨幣）
  totalRuns: number
  totalWins: number
  unlockedCardIds: string[]   // 已解鎖的卡牌
  unlockedRelicIds: string[]  // 已解鎖的遺物
  inventory: Equipment[]      // 背包（最多 INVENTORY_MAX=250）
  loadouts: Record<string, HeroLoadout>  // 英雄裝備配置
  heroProgress: Record<string, HeroProgress>  // 英雄進度
  fateLevel: number           // 0-5（每次通關 +1 解鎖）
  activeFateLevel: number     // 目前使用的難度
  lockedUids: string[]        // 被鎖定（防止誤拆）的裝備 UID
  dungeonProgress?: Record<string, { cleared: boolean; bestFloor: number }>
}
```

### StatusEffect（狀態效果）

```typescript
type StatusType = 'burn' | 'freeze' | 'poison' | 'vulnerable' | 'armor_break'
type StatusEffect = { type: StatusType; stacks: number }
```

| 狀態 | 機制 |
|------|------|
| `burn` | 每回合造成 stacks 傷害，觸發後 stacks--，歸零移除 |
| `freeze` | 凍結 stacks 回合，期間敵人不行動 |
| `poison` | 每回合造成 stacks 傷害（類似 burn，但有不同計算） |
| `vulnerable` | 受到傷害增加 40%（或根據卡牌設定） |
| `armor_break` | 累積破甲層數，降低敵人防禦 |

### MapNode（主線地圖節點）

```typescript
type NodeType = 'battle' | 'elite' | 'rest' | 'shop' | 'event' | 'boss' | 'chest'
type MapNode = {
  id: number
  type: NodeType
  floor: number    // 第幾層（1-30，共3章各10層）
  layer: number    // 行索引
  col: number      // 列索引（0-2）
  connections: number[]   // 連往下一層的 id
  cleared: boolean
  reachable: boolean
}
```

---

## 英雄系統

### HEROES 陣列（10 個英雄）

| id | 名稱 | 職業 role | HP | ATK | DEF | 技能 |
|----|------|-----------|-----|-----|-----|------|
| `knight` | 聖騎士 | slash | 168 | 28 | 14 | 聖盾破軍斬 |
| `mage` | 火焰法師 | fire | 102 | 39 | 5 | 烈焰隕星 |
| `priest` | 神官祭司 | holy | 122 | 18 | 8 | 光輪祝禱 |
| `rogue` | 影刃刺客 | shadow | 108 | 31 | 5 | 暗影連襲 |
| `princess` | 皇家公主 | ice | 118 | 24 | 8 | 皇家冰晶陣 |
| `archer` | 遊俠獵人 | arrow | 114 | 26 | 7 | 疾風箭雨 |
| `dwarf` | 矮人戰士 | hammer | 148 | 27 | 12 | 震地戰錘 |
| `bard` | 吟遊詩人 | song | 108 | 19 | 6 | 戰歌奏鳴 |
| `beastmaster` | 獸語馴獸師 | beast | 132 | 24 | 9 | 狼魂突擊 |
| `engineer` | 機關技師 | gear | 120 | 23 | 8 | 蒸氣砲擊 |

### 星等（Stars）系統

每個英雄有 0★~3★ 共 4 個 sprite（`starSprites[0..3]`）。  
`getHeroSprite(hero, stars)` 根據星等返回對應 SpriteMeta。  
星等稱號透過 `getHeroStarTitle(heroId, stars)` 取得。

### Hero 型別

```typescript
type Hero = {
  id: string
  name: string
  title: string      // 副標題
  hp: number
  atk: number
  def: number
  role: Role
  skill: string      // 技能名稱（顯示用）
  desc: string
  sprite: SpriteMeta
  starSprites?: [SpriteMeta, SpriteMeta, SpriteMeta, SpriteMeta]
  portrait?: string  // 高清立繪路徑（點擊後顯示 modal）
}
```

---

## 敵人系統

### ENEMIES 陣列（22 個敵人）

**主線第一章（CH1.png，第 row 0-4）**

| id | 名稱 | HP | ATK | DEF |
|----|------|-----|-----|-----|
| `goblin` | 哥布林 | 180 | 18 | 4 |
| `orc` | 荊棘野豬 | 250 | 25 | 8 |
| `skeleton` | 骸骨兵士 | 210 | 19 | 6 |
| `mimic` | 寶箱怪 | 225 | 22 | 8 |
| `golem` | 石巨人（章節BOSS） | 340 | 30 | 12 |

**主線第二章（CH2.png）**

| id | 名稱 | HP | ATK | DEF |
|----|------|-----|-----|-----|
| `ice_wolf` | 冰霜狼 | 230 | 26 | 6 |
| `slimeking` | 冰晶史萊姆 | 250 | 21 | 8 |
| `lightning_lancer` | 冰甲騎士 | 285 | 28 | 11 |
| `yeti` | 雪原巨怪 | 330 | 29 | 12 |
| `ice_witch` | 冰霜女巫（章節BOSS） | 300 | 30 | 9 |

**主線第三章（CH3.png）**

| id | 名稱 | HP | ATK | DEF |
|----|------|-----|-----|-----|
| `fire_hound` | 炎獄魔犬 | 300 | 33 | 9 |
| `bat_dragon` | 翼魔飛龍 | 330 | 34 | 11 |
| `dark_sorceress` | 魅魔女王 | 310 | 36 | 9 |
| `dark_knight` | 焰獄騎士 | 350 | 34 | 13 |
| `dragon` | 烈焰巨龍（最終BOSS） | 460 | 40 | 14 |

**星蝕裂隙副本專用**

| id | 名稱 | HP | ATK | DEF |
|----|------|-----|-----|-----|
| `rift_imp` | 裂隙小鬼 | 220 | 24 | 5 |
| `star_sand_golem` | 星砂魔偶 | 280 | 22 | 12 |
| `mirror_thief` | 鏡像盜賊 | 240 | 29 | 6 |
| `eclipse_nun` | 星蝕修女 | 260 | 20 | 7 |
| `rift_guardian` | 裂隙守衛 | 380 | 34 | 14 |
| `star_reaper` | 星界收割者 | 360 | 38 | 8 |
| `eclipse_bishop` | 星蝕主教 | 520 | 38 | 12 |

### 敵人機制（bosses.ts）

所有敵人在 `ENEMY_MECHANICS` 中定義 `BossMechanic`：

```typescript
type BossMechanic = {
  chargeMax: number    // 0 = 即時觸發，>0 = 蓄力回合數
  chargeName: string
  special: BossSpecial
  armorTurns?: number  // golem 用：前 N 回合無敵
}
```

**星蝕裂隙敵人機制說明**

| 敵人 | 機制 |
|------|------|
| `rift_imp` | 每回合開始，禁忌點數 30% 機率改變 |
| `star_sand_golem` | 出手含禁忌點數時，額外獲得護盾（1顆+10、2顆+18、3顆以上+30） |
| `mirror_thief` | 玩家打出三條以上時，下次攻擊 +40% |
| `eclipse_nun` | 每2回合回復25HP；玩家含禁忌時額外+15HP |
| `rift_guardian` | 玩家含禁忌點數出手時反擊（1顆8傷、2顆16傷、3顆以上25傷+易傷） |
| `star_reaper` | 每4回合大攻擊；玩家打出不含禁忌的三條以上可延後1回合 |
| `eclipse_bishop` | 雙血條三階段（見下方副本系統） |

---

## 骰子與戰鬥計算

### evaluateDice（gameLogic.ts）

```typescript
function evaluateDice(dice: number[]): ComboResult
// 返回 { label, rank, baseDamage, heal }
```

| 牌型 | rank | baseDamage | heal |
|------|------|-----------|------|
| 散骰 | 0 | 9 | 0 |
| 一對 | 1 | 14 | 1 |
| 兩對 | 2 | 22 | 2 |
| 三條 | 3 | 30 | 3 |
| 葫蘆 | 4 | 40 | 5 |
| 順子 | 4 | 38 | 4 |
| 四條 | 5 | 46 | 6 |
| 五條 | 6 | 58 | 8 |

### computeHeroAction（gameLogic.ts）

根據 `hero.role` 計算 `{ damage, heal, defend, isSkill }`。

| role | 主要加成邏輯 |
|------|-------------|
| slash | rank≥3 +10傷；rank≥6 +6護盾 |
| fire | rank≥4 +18；rank≥5 +6 |
| holy | heal += combo.heal×4 + 6的數量×5；damage-6；isSkill從rank2觸發 |
| shadow | rank≥2 +12；rank≥4 +8 |
| ice | rank≥4 +12傷+5護盾，否則+4傷 |
| arrow | rank≥4 +14 |
| hammer | rank≥3 +11，否則+5 |
| song | heal += 10+combo.heal×2；damage-4；isSkill從rank2觸發 |
| beast | damage += 8+rank×2；rank≥4 +3護盾 |
| gear | rank≥2 +10；rank≥4 +6 |

### applyCardEffects（gameLogic.ts）

統一處理 buff 卡加成。處理順序：
1. 累加 `healMult`（加法疊加，避免乘法過強）
2. 逐卡套用 `flatDamage`、`damagePerRank`、`burnOnAttack` 等
3. 特殊卡用 id 判斷：`poet_soul`、`heavy_blow`

---

## 主線地圖

### 地圖結構（mapGen.ts）

```
CHAPTER_COUNT = 3
FLOORS_PER_CHAPTER = 10  (9 choice rows + 1 boss row)
FLOOR_COUNT = 30         (3章 × 10層)

每層 3 個選擇節點（boss層只有1個）
節點類型依 routeType 機率分布
```

### 章節配置

| 章節 | 主題 | 普通敵 | 精英 | BOSS |
|------|------|--------|------|------|
| 1 | 森林遺跡 | goblin, skeleton | orc | golem |
| 2 | 雪原地城 | ice_wolf, slimeking, lightning_lancer | yeti | ice_witch |
| 3 | 魔王城 | fire_hound, bat_dragon, dark_sorceress | dark_knight | dragon |

### 路線類型（RouteType）

| 類型 | 特色 |
|------|------|
| `safe` | 較多休息節點，較少精英 |
| `risk` | 較多精英、事件；金幣獎勵較高 |
| `resource` | 較多商店、寶箱 |

### 難度縮放

```typescript
// floorMult 計算
base = 1 + (chapter-1)*0.5 + (chapterFloor-1)*0.1
mult = base * fateMult
if isBoss:  mult *= 1.8
if isElite: mult *= 1.35

// fateMult = 1 + activeFateLevel * 0.08
```

### 戰後回復

- 普通戰鬥：+15% maxHp
- 精英戰鬥：+8% maxHp
- BOSS 戰鬥：+25% maxHp
- 加上遺物 `healOnWin` / `healOnWinPct`

---

## 副本系統

### 星蝕裂隙（star_eclipse）

**15層 3區，每區5層節點地圖**

| 區域 | 層號 | 節點內容 |
|------|------|----------|
| 第一區：裂隙入口 | 0-3 | 3節點選擇層 |
| | 4 | 👑 小BOSS：星蝕修女 |
| 第二區：星蝕迴廊 | 5-8 | 3節點選擇層 |
| | 9 | 👑 小BOSS：裂隙守衛 |
| 第三區：主教寢宮 | 10-13 | 3節點選擇層 |
| | 14 | 🔥 最終BOSS：星蝕主教 |

**選擇層配置（每層3節點 shuffle）**

| 層 | 類型組合 |
|----|----------|
| 0,1,3,5,7,10,12 | `['battle','battle','rest']` 或 `['battle','rest','battle']` |
| 2,6,8,11,13 | `['battle','elite','rest']` |

**怪物池**

| 區域 | 普通怪 | 精英 |
|------|--------|------|
| Zone 1 (0-3) | rift_imp, star_sand_golem, mirror_thief | star_reaper |
| Zone 2 (5-8) | star_sand_golem, mirror_thief, rift_imp | star_reaper |
| Zone 3 (10-13) | star_sand_golem, mirror_thief | star_reaper |

**floorMult 數值**

| 層 | 普通 | 精英 | mini_boss/boss |
|----|------|------|----------------|
| 0 | 0.88 | — | — |
| 1 | 0.95 | — | — |
| 2 | 1.00 | 1.10 | — |
| 3 | 1.05 | — | — |
| 4 | — | — | 1.15 (eclipse_nun) |
| 5 | 1.18 | — | — |
| 6 | 1.22 | 1.32 | — |
| 7 | 1.26 | — | — |
| 8 | 1.30 | 1.40 | — |
| 9 | — | — | 1.50 (rift_guardian) |
| 10 | 1.42 | — | — |
| 11 | 1.46 | 1.56 | — |
| 12 | 1.50 | — | — |
| 13 | 1.54 | 1.65 | — |
| 14 | — | — | 1.80 (eclipse_bishop) |

### DungeonNode 型別

```typescript
type DungeonNodeType = 'battle' | 'elite' | 'mini_boss' | 'rest' | 'boss'

type DungeonNode = {
  id: string           // e.g. 'dn_2_1'
  type: DungeonNodeType
  layer: number        // 0=entry, 14=final boss
  col: number
  enemyId?: string     // undefined for rest nodes
  floorMult: number
  connections: string[]
  cleared: boolean
  reachable: boolean
}
```

### 地圖連接規則

1. **converge（→mini_boss/boss）**：當前層所有節點連往單一節點
2. **fan-out（boss→）**：單一節點連往所有下一層節點
3. **random-branch**：按 col 對齊 + 40% 機率額外連相鄰

確保所有節點至少有一條連接（orphan nodes 補連）。

### 節點選擇流程（App.tsx handleDungeonNodeSelect）

- `rest` 節點：直接回復 maxHp×20%，呼叫 `advanceDungeonMap`，不進 battle
- 其他節點：隨機指定一個禁忌點數（1-6），進入 `battle` phase
- `mini_boss` 節點：`isElite: true`（BattleScreen 的精英戰處理）
- `boss` 節點：`isBoss: true`

### 副本戰鬥結果（App.tsx handleDungeonBattleComplete）

- **失敗**：進 `dungeon_result(cleared=false)`；給 20% expReward
- **普通勝利**：`advanceDungeonMap`，+10% maxHp 小回復，回 `dungeon_map`
- **boss 勝利**：生成裝備掉落（優先嘗試 `tryGenerateEclipseDrop`），給完整 expReward + goldReward，進 `dungeon_result(cleared=true)`
- **休息節點**：回復後不進 battle，直接推進地圖

### 星蝕主教雙血條機制（BattleScreen）

```typescript
// 第一血條：520 HP（enemy.hp）
// 第二血條：BISHOP_BAR2_HP = Math.round(520 * 0.58) ≈ 302 HP

// Phase 判斷
bishopBar === 1:
  phase 1 (HP > 60%): 禁忌宣告，每2回合換禁忌點數
  phase 2 (HP ≤ 60%): 雙重禁忌，新增第二個禁忌點數，每顆造成4傷
bishopBar === 2 (第二血條):
  phase 3: 星蝕審判，每3回合判定（淨骰→主教受30傷；含禁忌→玩家受20傷）

// 蛻變觸發（3個 kill-check 點均需攔截）
if isEclipseBishop && bishopBarRef.current === 1:
  bishopBarRef.current = 2
  setBishopBar(2)
  setEnemyHp(BISHOP_BAR2_HP)
  setBossPhase(3)
  setBishopTurnCount(0)
  setForbiddenDiceState(prev => [...prev, 新禁忌點數])
  addLog('🌑 星蝕主教蛻變！第二血條已解封！')
  doStartNextTurn(); return
```

### 核心機制：禁忌骰面

每場副本戰鬥隨機指定 1-2 個禁忌點數（1-6）。出手時骰子含禁忌點數：

| 含禁忌骰數 | 副作用 |
|-----------|--------|
| 1顆 | 敵人 +8 護盾 |
| 2顆 | 敵人 +8 護盾，玩家受 5 傷害 |
| 3顆以上 | 敵人 +15 護盾，玩家受 10 傷害 + 1層易傷 |

### 副本獎勵

- 星蝕裂隙：200 星塵 + 500 EXP + legendary 裝備
- 失敗：100 EXP（20%）

### 新增副本規範

1. `dungeon.ts` 的 `DungeonId` union 加入新 id
2. `DUNGEON_DEFS` 加入新副本定義
3. 若有新核心機制，在 `types.ts` 的 `GamePhase.battle` 加入對應欄位
4. 新的 `generateXxxDungeonMap()` 加在 `dungeon.ts`
5. `App.tsx` 的 `startDungeon` 依 dungeonId 生成對應地圖
6. 每區至少1個收斂節點（小BOSS），最後一區以最終BOSS結尾
7. floorMult 從 ~0.88 線性爬升至最終 BOSS ~1.8

---

## 戰鬥畫面

### BattleScreen 核心 Props

```typescript
interface BattleScreenProps {
  run: RunState
  equipment: Equipment[]
  talentBonus: TalentBonus
  enemyId: string
  floorMult: number
  isElite: boolean
  isBoss: boolean
  isChapterBoss: boolean
  activeFateLevel: number
  enemyAffixes: EnemyAffix[]
  goldReward: number
  heroStars: number
  forbiddenDice?: number[]     // 副本禁忌點數
  onComplete: (result) => void
}
```

### 戰鬥流程

1. 初始擲 5 顆骰子（`rollFive()`）
2. 玩家點擊骰子切換保留狀態
3. 點「重骰」重新擲非保留骰（基本 2 次 + buff 卡 / 遺物加成）
4. 點「攻擊！」呼叫 `doAttack()`
5. `evaluateDice()` → `computeHeroAction()` → `applyCardEffects()`
6. 套用各種加成（裝備詞綴、天賦、遺物）
7. 計算禁忌骰子副作用（副本模式）
8. 套用狀態效果（burn 扣血、freeze 跳過）
9. 敵人存活且未凍結 → `enemyAttack()`

### BOSS 三階段

```typescript
const hpPct = enemyHp / enemy.hp
const bossPhase = hpPct < 0.30 ? 3 : hpPct < 0.60 ? 2 : 1
// Phase 1: 一般
// Phase 2: HP ≤ 60%，特殊技觸發頻率 ×1.5
// Phase 3: HP ≤ 30%，特殊技觸發頻率 ×2
```

### EnemyAffix（敵人詞綴）

由 `rollEnemyAffixes(fateLevel, isBoss)` 生成，fateLevel > 0 時啟用。

| id | 效果 |
|----|------|
| `thorns` | 攻擊反彈 value 傷害 |
| `regen` | 每回合回復 value HP |
| `armor` | 傷害 -value |
| `berserk` | 攻擊 ×1.5（boss 必有） |
| `poison_sting` | 每次攻擊附加 value 層中毒 |
| `immune` | 前 2 回合免疫 |

---

## Buff 卡系統

### BuffCard 型別

```typescript
type BuffCard = {
  id: string
  name: string
  desc: string
  rarity: 'common' | 'rare' | 'epic'
  effect: BuffEffect
  role?: Role         // 職業限定卡
  maxLevel?: number   // 1=不可升級（預設）；3=可升至3級
  levelData?: CardLevelData[]  // [lv2, lv3] 的 effectOverride
}
```

### BuffEffect 常用欄位

| 欄位 | 說明 |
|------|------|
| `flatDamage` | 每次攻擊 +N 傷害 |
| `damagePerRank` | 每點骰型等級 +N 傷害 |
| `rerollBonus` | 每回合額外重骰次數 |
| `burnOnAttack` | 攻擊附加 N 層燃燒 |
| `freezeOnHighCombo` | rank ≥ N 時凍結敵人 |
| `lowHpDamageMult` | HP < 30% 時傷害乘數 |
| `maxHpBonus` | 取得時一次性增加最大 HP |
| `healMult` | 治療量乘數（加法疊加） |
| `startShield` | 每回合開始獲得 N 護盾 |
| `poisonOnAttack` | 攻擊附加 N 層中毒 |
| `armorBreakOnHighCombo` | rank ≥ armorBreakRank 時破甲 N |
| `comboDamage` | rank ≥ minRank 時 +value 傷害 |
| `ignitePct` | 引爆 N% 燃燒層數造成即時傷害 |
| `tabooRerollDmgPct` | 禁忌重骰：每次重骰 +N% 傷害（max 18%） |
| `curseDmgPct` | 每個詛咒 +N% 傷害 |

### 特殊卡（BattleScreen 內特殊處理）

| id | 效果 |
|----|------|
| `undying` | 本場首次致死保留 1 HP |
| `fate_die` | 每回合開始獲得一顆額外骰 |
| `poet_soul` | 造成傷害同時，治療量也等量轉為傷害 |

### 卡牌升級

- 商店可以花金幣升級持有的可升卡
- 升級時 `cardLevels[id]` +1（上限 `maxLevel`）
- `getEffectiveCardEffect(card, level)` 合併 `effectOverride`

---

## 遺物系統

### Relic 型別

```typescript
type Relic = {
  id: string
  name: string
  desc: string
  tier: 'common' | 'rare' | 'boss'
  requiredRole?: Role      // 職業專屬
  dungeonOnly?: string     // 只在特定副本掉落
  effect: RelicEffect
}
```

### 重要 RelicEffect 欄位

| 欄位 | 說明 |
|------|------|
| `rerollBonus` | 每回合額外重骰次數 |
| `firstRerollFree` | 命運骰杯：每場首次重骰免費 |
| `onesToSix` | 破碎骰冠：骰子 1 點變 6 點 |
| `reviveAtHp` | 逆轉沙漏：首次致死時以 N% HP 復活 |
| `healOnSix` | 每顆 6 回復 N HP |
| `healOnWin` | 戰後回復 N HP |
| `healOnWinPct` | 戰後回復 N% maxHp |
| `lifestealPct` | 傷害 N% 回血 |
| `burnKillHeal` | 擊殺燃燒敵人回復 N HP |
| `poisonAtkPerTurn` | 敵人中毒時每回合累積攻擊力（最多+15） |
| `angerBonusDmg` | 血怒護符：每層怒氣 +N 傷害 |
| `rerollDmgPct` | 命運之手：本回合重骰≥2 時 +N% 傷害 |
| `corruptSixDice` | 腐化骰杯：6點造成傷害+易傷而非回血 |
| `relicMaxHpMult` | 惡魔契約：取得時 maxHP × N（永久） |

---

## 裝備系統

### EquipmentSlot（8個裝備欄位）

```
weapon | head | body | hands | boots | ring1 | ring2 | accessory
```

（`armor` 為舊版相容別名）

### Equipment 型別

```typescript
type Equipment = {
  uid: string
  name: string
  slot: EquipmentSlot
  rarity: 'normal' | 'magic' | 'rare' | 'legendary'
  requiredRole?: Role
  affixes: Affix[]
  legendaryEffectId?: LegendaryEffectId
  legendaryDesc?: string
  setId?: SetId
  setPiece?: number   // 1~4
}
```

### 詞綴（AffixId）

**通用詞綴**

| id | 效果 |
|----|------|
| `flat_damage` | 攻擊 +N |
| `damage_per_rank` | 每點骰型等級 +N 傷害 |
| `burn_on_attack` | 攻擊附加 N 層燃燒 |
| `poison_on_attack` | 攻擊附加 N 層中毒 |
| `hp_bonus` | HP +N |
| `def_bonus` | 防禦 +N |
| `start_shield` | 每回合開始 +N 護盾 |
| `reroll_bonus` | 額外重骰次數 |
| `heal_bonus` | 治療量 +N |
| `gold_pct` | 金幣獲得 +N% |

**星蝕詞綴**

| id | 效果 |
|----|------|
| `forbidden_clean_dmg` | 不含禁忌點數出手時傷害 +N% |
| `forbidden_once_guard` | 每場首次禁忌副作用免疫 |
| `forbidden_self_dmg_reduce` | 禁忌自傷 -N% |
| `clean_dice_shield` | 不含禁忌點數時獲得 N 護盾 |
| `forbidden_removed_atk` | 每次重骰蓄積 +N 傷害 |
| `eclipse_followup` | 兩對以上且不含禁忌追加 N 傷害 |

### 套裝系統（SetId）

每職業一套，共 11 套（10 職業 + eclipse_set）：

| SetId | 職業 | 4件效果（LegendaryEffectId） |
|-------|------|-------------------------|
| slash_set | 聖騎士 | slash_damage_shield |
| fire_set | 火焰法師 | fire_burn_explosion |
| holy_set | 神官祭司 | holy_heal_damage |
| shadow_set | 影刃刺客 | shadow_first_strike |
| ice_set | 皇家公主 | ice_freeze_aura |
| arrow_set | 遊俠獵人 | arrow_double_hit |
| hammer_set | 矮人戰士 | hammer_charge_crit |
| song_set | 吟遊詩人 | song_dice_boost |
| beast_set | 獸語馴獸師 | beast_atk_stack |
| gear_set | 機關技師 | gear_reroll_charge |
| eclipse_set | 全職業（副本掉落） | eclipse_4pc |

### 重要 Legendary 效果

| id | 效果 |
|----|------|
| `slash_damage_shield` | 每顆6→+8護盾；≥2顆6→敵人本回合攻擊-40% |
| `fire_burn_explosion` | 三條以上每超一階追加小火球(+10傷+2燃燒) |
| `holy_heal_damage` | 兩對以上治療×1.5，溢出轉護盾 |
| `shadow_first_strike` | 兩對以上追加一次同傷攻擊 |
| `ice_freeze_aura` | 順子/四條以上必凍結；敵人每殘留1層凍結→ATK+8 |
| `arrow_double_hit` | 每種不同點數各追加一箭(+6傷) |
| `judge_staff` | 星蝕裁決杖：淨骰→易傷2層；含禁忌→自傷6+傷害+25% |
| `rift_bow` | 裂隙獵弓：全不同+淨骰→5發星箭(各+6傷) |

### 裝備生成

```typescript
function generateEquipment(slot, rarity, heroRole?): Equipment
function tryGenerateDrop(isElite, isBoss, heroRole?, fateLevel?): Equipment | null
function tryGenerateEclipseDrop(isElite, isBoss, heroRole?): Equipment | null
```

掉落機率：
- 普通戰鬥：fateLevel×4%
- 精英：15% + fateLevel×5%
- BOSS：30% + fateLevel×8%

星蝕副本 BOSS 必定掉落裝備（優先嘗試 eclipse 系列）。

### 鍛造（ForgeScreen）

- 消耗星塵 + 裝備材料升階
- 可強化詞綴數值
- 可嘗試合成套裝

---

## 天賦系統

### 英雄進度

```typescript
type HeroProgress = {
  level: number         // 1-100
  exp: number
  stars: number         // 0-3
  runsCompleted: number
  runsWon: number
  selectedTalents: Record<number, string>  // level → choice id
}
```

### 天賦節點

每個英雄在 Lv 20/40/60/80/100 各有一個天賦節點，每節點三選一：

```typescript
type TalentNode = {
  level: 20 | 40 | 60 | 80 | 100
  choices: [TalentChoice, TalentChoice, TalentChoice]
}
```

### TalentBonus（計算後彙總）

```typescript
type TalentBonus = {
  flatDamage, damagePerRank, hpBonus, defBonus,
  startShield, rerollBonus, healBonus, burnOnAttack,
  startEnemyBurn, startEnemyFreeze,
  rankedDamages: Array<{ minRank, value }>,
  lowHpDamageMult,
  passives: Array<{ id: TalentPassiveId; value; value2? }>,
  skillOverrideId?: SkillOverrideId,
}
```

### 星等（Stars）解鎖條件

```typescript
function checkStarConditions(prog: HeroProgress): number
// 1★: level >= 20 && runsWon >= 3
// 2★: level >= 60 && runsWon >= 10
// 3★: level >= 100 && runsWon >= 20
```

### EXP 計算

```typescript
function calcRunExp(won: boolean, floorsCleared: number): number
// won: 基礎 500
// floorsCleared: ×10 per floor
// 失敗：×0.4

function addHeroExp(prog, exp): HeroProgress
// 每級需要 exp：level × 50 + 100
// 升級上限 100
```

---

## 事件詛咒藥水

### 事件（events.ts）

```typescript
type EventOutcomeType = 'heal' | 'full_heal' | 'gold' | 'damage' | 'relic' | 'curse' | 'rare_card' | 'nothing'
```

事件為多選一格式，每個選項有對應的 `outcome`。

### 詛咒（curses.ts）

```typescript
type CurseEffect = {
  rerollPenalty?: number   // 重骰次數減少
  maxHpMult?: number       // 最大HP倍率（如 0.8 = -20%）
  selfDmgPct?: number      // 每回合開始扣除當前HP的N%
  healPenaltyPct?: number  // 治療量減少N%
  lockRandomDie?: number   // 每回合隨機鎖定N顆骰
  enemyAtkMult?: number    // 敵人攻擊力+N%
}
```

詛咒取得途徑：
- 命運等級 ≥ 4：每局開始隨機一個詛咒
- 事件選擇
- 休息點「禱告」可移除第一個詛咒

### 藥水（potions.ts）

```typescript
type PotionEffect = {
  healFlat?: number     // 直接回復 N HP
  healPct?: number      // 回復 N% maxHp
  shield?: number       // 獲得 N 護盾
  regenTurns?: number   // 回血持續回合
  regenAmt?: number     // 每回合回復量
}
```

最多持有 `MAX_POTIONS = 3` 瓶。  
開局自動給一瓶 `heal_small`。

---

## Meta 與存檔

### meta.ts

```typescript
function loadMeta(): MetaState     // 從 localStorage 'dice_hero_meta_v2'
function saveMeta(m: MetaState): void
function calcRunStardust(won: boolean, floorsCleared: number, fateLevel: number): number
```

### save.ts（局內進度）

```typescript
type RunSave = {
  run: RunState
  phase: GamePhase
  rewardCards: BuffCard[]
  rewardRelics: Relic[]
  pendingDrop: Equipment | null
  pendingPhaseAfterDrop: GamePhase
  savedAt: string
}
function saveRun(data): void    // localStorage 'dice_hero_run_v1'
function loadSavedRun(): RunSave | null
function clearSavedRun(): void
```

自動存檔時機：在 `SAVE_PHASES` 的 phase 時（map/battle/reward/等）。  
局結束（game_over / victory）時清除存檔。

### Firebase（lib/firebase.ts）

- 使用 Google 登入
- `cloudSave(uid)` / `cloudLoad(uid)` 同步 meta + run
- 登入後自動比較時間戳，若雲端較新則自動還原
- 每次 local save 同時靜默同步雲端

---

## 畫面元件清單

### screens/

| 檔案 | 對應 phase | 說明 |
|------|-----------|------|
| `MainMenuScreen.tsx` | main_menu | 主選單（繼續、冒險、裝備、鍛造、副本） |
| `MapScreen.tsx` | map | 主線節點地圖 |
| `BattleScreen.tsx` | battle | 骰子戰鬥系統（最大元件） |
| `RewardScreen.tsx` | reward | 三選一 buff 卡 |
| `RelicRewardScreen.tsx` | relic_reward | 三選一遺物 |
| `ShopScreen.tsx` | shop | 商店（買藥/治療/卡/升卡/遺物） |
| `RestScreen.tsx` | rest | 休息（休息/禱告/訓練） |
| `EventScreen.tsx` | event | 隨機事件 |
| `ChapterClearScreen.tsx` | chapter_clear | 章節通關獎勵 |
| `RouteSelectScreen.tsx` | route_select | 路線選擇 |
| `GameOverScreen.tsx` | game_over | 死亡畫面 |
| `VictoryScreen.tsx` | victory | 通關畫面 |
| `EquipmentScreen.tsx` | equipment_manage | 裝備管理/配置 |
| `EquipmentDropScreen.tsx` | equipment_drop | 拾取/拆解裝備 |
| `ForgeScreen.tsx` | forge | 鍛造系統 |
| `DungeonSelectScreen.tsx` | dungeon_select | 副本選擇 |
| `DungeonMapScreen.tsx` | dungeon_map | 副本節點地圖 |
| `DungeonResultScreen.tsx` | dungeon_result | 副本結果 |
| `CompendiumScreen.tsx` | — | 圖鑑（從主選單進入） |

### components/

| 檔案 | 說明 |
|------|------|
| `SpriteAnimator.tsx` | Sprite 動畫（CSS background-position 切格） |
| `DieFace.tsx` | 骰子面顯示元件 |
| `RelicChip.tsx` | 遺物小標籤元件 |
| `HeroPortraitModal.tsx` | 英雄高清立繪 modal（選角畫面使用） |
| `SaveCodeModal.tsx` | 存檔碼匯出/匯入 |

---

## Sprite Sheet 格式

### 預設格式（6 格水平排列）

```
| 0      | 1      | 2        | 3        | 4       | 5     |
| idle_0 | idle_1 | attack_0 | attack_1 | skill_0 | hurt_0|
```

`SpriteAnimator` 以 CSS `background-position` 切格，`FRAME_COUNT = 6`。

### 章節 sprite sheet（CH1/CH2/CH3）

```
1400×1400px，5 cols × 5 rows，每格 280×280
frameCount = 5（無 skill 幀）
frameRow = 敵人在 sheet 中的 row（0-4）

SpriteMeta: { sheet: 'CH1.png', frameWidth: 280, frameHeight: 280, frameCount: 5, frameRow: N, totalRows: 5 }
```

### SpriteMeta 型別

```typescript
type SpriteMeta = {
  sheet: string        // 路徑
  frameWidth: number
  frameHeight: number
  frameCount?: number  // 預設 6
  frameRow?: number    // multi-row sheet 用
  totalRows?: number
}
```

### 星等圖片命名

```
heroes/{heroId}_s0.png  → 0★
heroes/{heroId}_s1.png  → 1★
heroes/{heroId}_s2.png  → 2★
heroes/{heroId}_s3.png  → 3★
```

### 背景移除腳本

`scripts/remove-bg.mjs`：三階段 BFS（移除白色背景 → 還原封閉洞 → 邊緣淡出）

---

## Firebase 整合

```typescript
// lib/firebase.ts
auth: Auth
googleProvider: GoogleAuthProvider
cloudSave(uid: string): Promise<void>   // 寫入 Firestore doc
cloudLoad(uid: string): Promise<{ meta?: string; run?: string } | null>
signInWithPopup / signOut / onAuthStateChanged
```

- 資料以 JSON 字串存入 Firestore，欄位：`meta`（MetaState）、`run`（RunSave）
- 衝突解決：雲端時間戳 > 本地時間戳 → 自動還原雲端

---

## CSS 命名慣例

### 通用

```css
.page                /* 全頁容器 */
.topbar              /* 頂部標題列 */
.topbar.small        /* 局內縮小版 */
.stat-chip           /* 狀態顯示標籤（HP/金幣/卡牌） */
.ghost               /* 透明底線按鈕 */
.hp-box              /* HP 條容器 */
.hp-fill             /* HP 條填色 */
```

### 戰鬥畫面

```css
.battle-wrap
.dice-row            /* 骰子橫排 */
.die-btn             /* 單顆骰子按鈕 */
.die-btn.held        /* 保留狀態 */
.die-btn.forbidden   /* 禁忌點數 */
.battle-log          /* 戰鬥紀錄 */
.enemy-hp            /* 敵人血條 */
.bishop-bar2         /* 星蝕主教第二血條（紫色漸層） */
```

### 副本地圖

```css
.dungeon-map-wrap
.dmap-header
.dmap-grid           /* 節點格線容器（position: relative） */
.dmap-svg            /* 連線 SVG（absolute 疊加） */
.dmap-row            /* 一層節點橫排 */
.dmap-node           /* 節點按鈕基底 */
.dmap-node-battle / .dmap-node-elite / .dmap-node-mini_boss / .dmap-node-rest / .dmap-node-boss
.dmap-node.cleared / .reachable / .locked
.dmap-line.travelled / .available / .dim
.dmap-zone-header    /* 區域分隔標題 */
```

### 主線地圖

```css
.map-wrap
.map-grid
.map-node / .map-node-battle / .map-node-elite / .map-node-boss / .map-node-rest
.map-node.cleared / .reachable / .locked
```

### 裝備稀有度

```css
.rarity-normal / .rarity-magic / .rarity-rare / .rarity-legendary
```

---

## 版本記錄摘要

| 版本 | 主要更新 |
|------|---------|
| v6.8 | 目前版本（副本節點地圖系統、星蝕主教雙血條） |
| v6.x | 副本系統（dungeon）、禁忌骰子機制 |
| v5.x | 裝備系統（8部位套裝）、天賦樹、星等 |
| v4.x | 三章節主線、章節BOSS機制 |
| v3.x | Roguelite地圖、buff卡、遺物系統 |

---

*此文件由 Claude Code 自動生成，涵蓋截至 v6.8 的完整架構。*
