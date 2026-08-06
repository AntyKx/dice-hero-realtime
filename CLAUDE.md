# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                  # 開發伺服器 http://localhost:5173
npm run build                # TypeScript 編譯 + Vite 打包
npm run preview              # 預覽 dist/
node scripts/remove-bg.mjs   # 批次移除 public/assets/spritesheets/ 內所有 PNG 的白色背景
npx wrangler pages deploy dist --project-name diceherorpg  # 部署到 Cloudflare Pages
```

無測試框架，無 lint 指令。

## 版號規則（重要）

**每次改動前先更新 `package.json` 的 `version`，再 build + deploy。**
- `+0.0.1` patch：小修正、文字調整、UI 微調
- `+0.1.0` minor：新功能、新內容（新遺物/buff卡/裝備組、新機制）
- `+1.0.0` major：全新副本、全新系統、重大架構變動

目前版本：`1.5.2`

## 架構概覽

**React 18 + TypeScript + Vite** 的骰子 RPG，採 Roguelite 關卡地圖結構。

### 遊戲流程（GamePhase 狀態機）

```
main_menu → hero_select → route_select → map → battle → reward → map → ... → boss → victory
                                              ↘ shop / rest / event ↗
                                              ↘ game_over (HP歸零)

副本流程：dungeon_select → dungeon_map → battle(dungeonId) → relic_reward/reward → dungeon_map
          → dungeon_score (通關) / dungeon_result (放棄)
```

`App.tsx` 持有 `phase: GamePhase` 與 `run: RunState`，根據 phase 渲染對應的 screen 元件。

### 核心資料層

| 檔案 | 職責 |
|------|------|
| `src/types.ts` | 所有共用型別（RunState、GamePhase、BuffCard、StatusEffect、AffixId、LegendaryEffectId、SetId…） |
| `src/data.ts` | HEROES[]、ENEMIES[] 陣列與 SpriteMeta。新增角色改這裡 |
| `src/buffCards.ts` | ALL_BUFF_CARDS 陣列與 `getRandomCards(count, role?, excludeIds?, dungeonId?)` |
| `src/mapGen.ts` | `generateMap()` 產生主線 5 層節點地圖；`getEnemyForNode()`、`advanceMap()` |
| `src/gameLogic.ts` | 純函式：`evaluateDice()`、`computeHeroAction()`、`applyCardEffects()`、`getRerollBonus()` |
| `src/dungeon.ts` | DUNGEON_DEFS[]、DungeonId 型別、各副本地圖生成（`generateStarEclipseMap` 等） |
| `src/equipment.ts` | 裝備系統：`computeEquipBonus()`、`tryGenerate*Drop()`、SET_DEFS、LEGENDARY_DEFS |
| `src/relics.ts` | ALL_RELICS[]、`getRandomRelics(count, excludeIds?, tier?, role?, dungeonId?)` |
| `src/scoring.ts` | 副本分數計算、排行榜讀寫（本地 + Cloud API）、`getDiceComboScore()` |
| `src/talents.ts` | 天賦樹系統、`computeTalentBonus()`、星等被動 |
| `src/curses.ts` | ALL_CURSES[]、詛咒效果 |
| `src/events.ts` | 事件池、`getRandomEvent()` |
| `src/bosses.ts` | Boss 特殊行為定義 |

### 畫面層（src/screens/）

| 檔案 | 對應 phase |
|------|-----------|
| `MapScreen.tsx` | `map` — 主線節點地圖 |
| `DungeonMapScreen.tsx` | `dungeon_map` — 副本 15 層節點地圖（3 區） |
| `BattleScreen.tsx` | `battle` — 骰子戰鬥（主線＋副本共用） |
| `RewardScreen.tsx` | `reward` — 選 buff 卡 |
| `RelicRewardScreen.tsx` | `relic_reward` — 副本精英獎勵選遺物 |
| `ShopScreen.tsx` | `shop` — 商店 |
| `RestScreen.tsx` | `rest` — 休息 |
| `ForgeScreen.tsx` | `forge` — 裝備重鑄/升星/強化 |
| `EquipmentScreen.tsx` | `equipment_manage` — 裝備管理 |
| `DungeonSelectScreen.tsx` | `dungeon_select` — 副本選擇 |
| `DungeonClearScreen.tsx` | `dungeon_score` — 通關結算＋排行榜上傳 |
| `LeaderboardScreen.tsx` | `leaderboard` — 排行榜（動態讀 DUNGEON_DEFS） |
| `GameOverScreen.tsx` | `game_over` |
| `VictoryScreen.tsx` | `victory` |
| `AshCovenantEventScreen.tsx` | `dungeon_event`（灰燼聖約副本事件） |

### 戰鬥系統（BattleScreen）

骰子流程：
1. 初始擲 5 顆骰子
2. 玩家點擊骰子切換「保留」狀態
3. 點「重骰」重新擲非保留骰（最多 2 次 + buff 卡加成）
4. 點「攻擊！」確認出手
5. `evaluateDice()` → `computeHeroAction()` → `applyCardEffects()` 依序計算
6. 套用狀態效果（燃燒扣血、凍結跳過敵人回合）
7. 若敵人存活且未被凍結，觸發 `enemyAttack()`

狀態效果（`StatusEffect`）：
- `burn`：stacks 值 = 每回合傷害；觸發後 stacks--，歸零時移除
- `freeze`：stacks 值 = 剩餘回合數；期間敵人不行動
- `poison`：每回合傷害，不衰減直到移除
- `vulnerable`：受到傷害增加

機制指示條（BattleScreen 頂部）：
- 📖 按鈕開啟機制說明 Modal（`showMechanicInfo` state）
- 各副本 mechanic-hint 文字顯示在指示條下方（`.mechanic-hint` class）

### 副本系統（src/dungeon.ts）

目前 4 個副本，全在 `DUNGEON_DEFS[]`：

| DungeonId | 名稱 | 特殊機制 | Boss |
|-----------|------|---------|------|
| `star_eclipse` | 星蝕裂隙 | 禁忌骰面、不穩定/祝福骰 | 暗月主教（三階段） |
| `burning_throne` | 燃燒王座 | 魔焰計量條（0-6格） | 燃燒王座Boss |
| `black_tide` | 黑潮深淵 | 氧氣+潮汐狀態（退潮/漲潮/深壓/亂流） | 潮汐王 奧斯瑞恩（三血條） |
| `ash_covenant` | 灰燼聖約 | 聖約進度（累積→灰燼審判）+王血詛咒 | 灰燼殘王 奧爾德雷克（三血條） |

#### 灰燼聖約：聖約進度累積規則
- 骰 6 → +6；骰 5 → +4
- 五條 +10；大順 +8；順子 +4
- 傷害 > 60 → +8；治療 > 30 → +6
- 進度 50%：敵攻 +10%
- 進度 75%：敵攻 +20%，英雄治療 -20%
- 進度滿（上限）：灰燼審判 — 受 30 傷害，重置為 30，下回合骰子 -1
- Boss（ash_fallen_king_aldrek）三階段：亡國之王 → 聖約之王（+4燃燒+進度+15）→ 灰燼王魂（+6燃燒+進度+15）

### 地圖系統

主線：`MapScreen + mapGen` — 5 層 × 3 排 × 2-3 節點，節點類型：battle / elite / rest / shop / boss

副本：`DungeonMapScreen + dungeon.ts` — 15 層分 3 區（每區 5 層），節點類型：battle / elite / mini_boss / rest / boss / event / chest

### Buff 卡（src/buffCards.ts）

`BuffCard` 型別欄位：
- `id`, `name`, `desc`, `rarity: 'common'|'rare'|'epic'`
- `effect: BuffEffect`
- `role?: Role` — 職業限定
- `dungeonOnly?: string` — 副本限定（如 `'ash_covenant'`）
- `maxLevel?: number`、`levelData?: CardLevelData[]`

`getRandomCards(count, role?, excludeIds?, dungeonId?)` — dungeonId 用來過濾副本專屬卡

常用 `BuffEffect` 欄位：
- `flatDamage` → 固定加傷
- `damagePerRank` → 每點骰型等級加傷
- `rerollBonus` → 額外重骰次數
- `burnOnAttack` → 攻擊附加燃燒層數
- `freezeOnHighCombo` → rank ≥ N 時凍結
- `lowHpDamageMult` → HP < 30% 時傷害乘數
- `maxHpBonus` → 加入 run 時增加最大 HP
- `burnEnemyDmgPct` → 敵人燃燒時傷害 +N%
- `shieldBonusDmgPct` → 護盾存在時傷害 +N%
- `startShield` → 戰鬥開始護盾

### 裝備系統（src/equipment.ts）

#### 8 裝備部位
`weapon | head | body | hands | boots | ring | accessory`（LoadoutSlot 有 ring1/ring2）

#### 稀有度
`normal | magic | rare | legendary`

#### 掉落函式（副本專用）
- `tryGenerateEclipseDrop(isElite, isBoss, role?, difficulty?)` — 星蝕裂隙
- `tryGenerateThroneDrops(isElite, isBoss, role?, difficulty?)` — 燃燒王座
- `tryGenerateBlackTideDrop(isElite, isBoss, role?, difficulty?)` — 黑潮深淵
- `tryGenerateCovenantDrop(isElite, isBoss, role?, difficulty?)` — 灰燼聖約

#### 套裝（SET_DEFS）
| SetId | 名稱 | 2件效果 | 4件效果 |
|-------|------|--------|--------|
| `eclipse_set` | 星蝕觀測者 | — | 淨骰追加20傷+8護盾（`eclipse_4pc`） |
| `throne_set` | 焰獄征服者 | — | 反噬後下次攻擊+30傷+10護盾（`throne_4pc`） |
| `abyss_set` | 深淵勇者 | 氧氣上限+1、漲潮防禦+8 | 潮汐切換+12護盾；退潮+15傷（`abyss_4pc`） |
| `covenant_set` | 灰燼誓約 | 最大HP+20、防禦+3 | 每次審判後永久攻擊+8（上限+32）；審判傷害-25%（`covenant_4pc`） |
| `{role}_set` | 職業套裝 | 屬性加成 | 職業招牌效果（`{role}_set4`） |

eclipse_set / throne_set / abyss_set / covenant_set 排除在 `ROLE_OF_SET` 外（全職業副本套裝）

#### 灰燼聖約詞綴（AffixId）
- `covenant_low_dmg` — 聖約進度 < 50 時傷害 +N%
- `covenant_burst_shield` — 聖約審判後獲得 N 護盾
- `covenant_suppress` — 聖約審判傷害 -N%
- `covenant_high_atk` — 聖約進度 ≥ 75 時傷害 +N%

#### 灰燼聖約傳奇武器（LegendaryEffectId）
- `covenant_sword` — 進度 ≥ 75 時追加 18 傷害；審判後回復 15 HP
- `ash_judgment_reversal` — 審判傷害改為對敵方 30 真傷（英雄不受傷）

#### EquipBonus 灰燼聖約欄位
`covenantLowDmgPct`, `covenantBurstShield`, `covenantSuppressPct`, `covenantHighAtkPct`, `covenantSet2pc`

### 遺物系統（src/relics.ts）

`Relic` 型別：`{ id, name, tier:'common'|'rare'|'boss', requiredRole?, dungeonOnly?, effect: RelicEffect }`

`getRandomRelics(count, excludeIds?, tier?, role?, dungeonId?)` — dungeonId 用來加權副本專屬遺物

#### 灰燼聖約遺物（dungeonOnly: 'ash_covenant'）
| id | 名稱 | tier | 效果欄位 |
|----|------|------|---------|
| `covenant_charm` | 聖約護符 | common | `covenantLowShield: 4`（進度<50每回合+4護盾） |
| `ash_pendant` | 灰燼護墜 | common | `covenantBurstHeal: 12`（審判後+12HP） |
| `vow_stone` | 誓約石 | common | `covenantBurstDmgReduce: 50`（審判傷害-50%） |
| `judgment_focus` | 審判之眸 | rare | `covenantHighDmgPct: 20`（進度≥75傷害+20%） |
| `covenant_seal` | 聖約封印 | rare | `covenantBurstAtkBonus: 8`（審判後永久攻擊+8） |
| `ashen_kings_trophy` | 灰燼王印 | boss | `covenantBurstShieldBonus: 25`（審判後+25護盾） |

### 排行榜（src/scoring.ts + LeaderboardScreen）

- 完全 `dungeonId` 參數驅動，新副本加入 `DUNGEON_DEFS` 後自動出現 tab
- Cloud API：`/leaderboard`（POST 上傳、GET 查詢）
- 本地備份：localStorage key = `dh_lb_{dungeonId}[_{heroClass}][_{seasonId}]`
- 分數公式：基礎1000 + 速度分(1200-回合×45) + HP分(剩餘HP%×900) + 骰型分(上限700) + 挑戰獎勵 - 重試×1000

### Sprite Sheet 格式

所有角色 sprite sheet 為**單列 6 格水平排列**：

| index | 0 | 1 | 2 | 3 | 4 | 5 |
|-------|---|---|---|---|---|---|
| 狀態 | idle_0 | idle_1 | attack_0 | attack_1 | skill_0 | hurt_0 |

`SpriteAnimator` 以 CSS `background-position` 切格，`FRAME_COUNT = 6` 為常數。各角色的 `frameWidth`/`frameHeight` 定義在 `data.ts`。

PNG 背景透明處理：`scripts/remove-bg.mjs` 使用三階段 BFS（移除背景白色 → 還原封閉洞 → 邊緣淡出）。

### PWA 設定（vite.config.ts）

- `registerType: 'autoUpdate'` — 自動安裝新版 SW，不需使用者確認
- `skipWaiting: true` — 新 SW 立刻接管，不等舊分頁關閉
- SW 更新靠 content hash（非版號），每次 build 有改動就會觸發更新
