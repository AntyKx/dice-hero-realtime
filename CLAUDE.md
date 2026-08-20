# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                  # 開發伺服器 http://localhost:5173
npm run build                # TypeScript 編譯 + Vite 打包
npm run preview              # 預覽 dist/
node scripts/remove-bg.mjs   # 批次移除 public/assets/spritesheets/ 內所有 PNG 的白色背景
npx wrangler pages deploy dist --project-name diceherorpg --branch=DiceHeroRpg  # 部署到 Cloudflare Pages Production
# ⚠️ 一定要帶 --branch=DiceHeroRpg！這個 Pages 專案的 Production 分支名稱是
# "DiceHeroRpg"（歷史因素，跟本機 git 分支 master 無關）。省略這個參數時
# wrangler 會用本機 git 分支（master）當部署分支，落地變成 Preview，
# 正式站 https://diceherorpg.pages.dev 完全不會更新，但指令不會報錯，
# 很容易誤以為部署成功。
```

無測試框架，無 lint 指令。

## 版號規則（重要）

**每次改動前先更新 `package.json` 的 `version`，再 build + deploy。**
- `+0.0.1` patch：小修正、文字調整、UI 微調
- `+0.1.0` minor：新功能、新內容（新遺物/buff卡/裝備組、新機制）
- `+1.0.0` major：全新副本、全新系統、重大架構變動

目前版本：`9.4.0`

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

### 即時制 ASTERVOW 大廳 + 固定式主線關卡系統（src/campaign/，2026-08 陸續建置）

跟上面「## 架構概覽」記錄的回合制 Roguelite（`main_menu → hero_select → map →
battle`）是完全獨立的第二套遊戲模式，彼此不共用資料/邏輯。玩家從
`main_menu` 進入後看到的是 ASTERVOW 風格大廳（`AdventureReadyScreen.tsx`，
`.ar-screen`），底下的戰鬥引擎是即時制的 `ArenaGame.ts`/`ArenaScreen.tsx`
（見 `src/arena/`），不是 `BattleScreen.tsx` 的骰子回合制。

#### 篇（Saga）→ 章（Chapter）→ 關（Stage）三層結構

```
campaign_saga_select（SagaSelectScreen）
  → campaign_chapter_select{sagaId}（CampaignChapterSelectScreen）
    → campaign_map{campaignId}（CampaignMapScreen，10 個節點地圖）
      → campaign_stage{stageId}（ArenaScreen 即時制戰鬥）
```

九個固定式主線章節（`CampaignStage.campaignId`）分屬三篇（`CAMPAIGN_SAGAS`，
`campaignTypes.ts`），每章固定 10 關（`CampaignStage.stageNumber` 1~10，
第 10 關永遠是章節 Boss）：

| 篇（Saga） | 章節（campaignId） | 資料檔（src/campaign/chapters/） |
|---|---|---|
| 灰燼王國篇 | forest_ruins（森林遺跡）／snowfield_wastes（雪原）／demon_king_castle（魔王城） | forestRuins.ts／snowfield.ts／demonCastle.ts |
| 裂隙前兆篇 | rift_omen_broken_sky（破碎天幕）／rift_omen_void_chasm（虛空裂谷）／rift_omen_eclipse_core（星蝕核心） | riftOmenBrokenSky.ts／riftOmenVoidChasm.ts／riftOmenEclipseCore.ts |
| 深海遺城篇 | deep_sea_coral_shallows（珊瑚淺灘）／deep_sea_sunken_capital（沉沒王城）／deep_sea_emperor_abyss（海皇深淵） | deepSeaCoralShallows.ts／deepSeaSunkenCapital.ts／deepSeaEmperorAbyss.ts |

九個章節線性解鎖（`CAMPAIGN_CHAPTER_ORDER`，`campaignProgress.ts` 的
`isChapterUnlocked()`）：要通關上一章最後一關才解鎖下一章；篇本身的解鎖
（`isSagaUnlocked()`）等於「篇底下第一章」是否解鎖，沒有另外一套判斷。

刻意避開舊 Roguelite 系統（`campaignPick`/`mapGen.ts`）已經在用的
`'main'`/`'rift_omen'`/`'deep_sea'`/`'snowfield'`/`'castle'` 字面值，
`CampaignStage.campaignId`/`bgTheme` 一律用更長、帶場景描述的字尾避免混淆
（見 `campaignTypes.ts` 開頭註解）。

重要檔案：
- `campaignTypes.ts` — 型別 + `CAMPAIGN_SAGAS`/`CAMPAIGN_CHAPTER_ORDER` 常數
- `campaignStages.ts` — `ALL_CAMPAIGN_STAGES`（九章合併，共 90 關）查表函式
- `campaignProgress.ts` — 純函式：解鎖判斷、星數彙總、關卡結算寫回
- `campaignChapterMeta.ts` — 九章的展示用 label/icon/color/封面圖，
  `AdventureReadyScreen.tsx` 大廳預覽卡跟 `CampaignChapterSelectScreen.tsx`
  章節卡共用同一份，`cover`（章節選擇卡封面）跟 `lobbyCover`（大廳頂部
  預覽卡封面）刻意分開兩個欄位——只有森林遺跡的 `lobbyCover` 指向專屬大廳
  美術，其餘 8 章兩個欄位都指向自己的地圖總覽圖
- `campaignStageBg.ts` — `CampaignStage.bgTheme` → 戰鬥背景圖路徑
- `chapters/*.ts` — 九個章節各自的 10 關資料（objective/waves/hazards/
  starConditions/boss），每個檔案開頭註解都有寫清楚跟其他章節的差異
- `src/arena/enemies.ts` 的 `ALL_CAMPAIGN_STAGE_ENEMIES` — 九章共用的敵人/
  Boss 查表，`ArenaGame.ts` 的 `initCampaignStage()` 系列讀這份，不是
  `CAMPAIGN_ENEMY_POOLS`（那是 Roguelite Run 的加權隨機池）
- `src/arena/bossSkills.ts` 的 `BOSS_SKILLS` — 九章 Boss 技能組，key 是
  `bossEnemyId`，3 階段對應血量 100~70%／70~35%／35~0%

`evaluateCustomStar()`（`ArenaGame.ts`）等少數星星判定邏輯是逐關 hardcode
（依 `stage.id` 字面值分派，不是資料驅動），新增/砍章節關卡數時要記得
一起改，見該函式開頭註解的清單。

#### 大廳「出發」與最後遊玩紀錄（AdventureReadyScreen.tsx）

大廳頂部預覽卡（`.av-lobby-map-card`）跟著 `meta.lastPlayedStageId`
（不管陣亡或過關都會更新，`App.tsx` 的 `onCampaignStageEnd`）動態顯示「最後
打的那一關」所屬章節的圖示/名稱/封面圖，不是寫死森林遺跡；金色 CTA 按鈕是
「出發！」，直接開打預覽中的那一關（`onStartCampaignStage`），查看完整
篇/章/關地圖要點 CHAPTER 標籤區塊（`onOpenCampaignMap`），兩者是分開的
入口。

#### GM 除錯模式（GmScreen.tsx）

網址帶 `?gm=1`（`App.tsx` 的 `START_IN_GM_MODE`）直接以 `gm` phase 啟動，
密碼寫死在 `GmScreen.tsx` 的 `GM_PASSWORD`。除了原本的英雄等級/星等調整，
2026-08-16 補上固定式主線關卡一鍵解鎖（全部九章 90 關三星／單一章節／
重置），全部走 `onUpdateMeta()` 安全 merge 寫法，只動 `campaignStageProgress`
欄位，不會覆蓋金幣/星塵/裝備/英雄進度。

### 即時制裝備強化／分解／合成經濟（src/arena/equipment.ts、WarehouseScreen.tsx）

跟上面「### 裝備系統（src/equipment.ts）」的回合制裝備完全分開——即時制
自己的裝備存在 `meta.arenaInventory: ArenaEquipment[]`（帳號共用單一陣列，
不分英雄），`meta.arenaLoadouts` 只是「誰裝了哪個 id」的對照表。

大廳底部導覽「倉庫」（`WarehouseScreen.tsx`，取代原本的「英雄」入口）分
裝備／遺物／道具三個分頁，裝備分頁可以強化/分解/合成：

- `enhanceCost(level)`/`applyEnhance(item)` — 花 `enhanceStoneCount`+金幣，
  `enhanceLevel` 0~10（`ENHANCE_MAX_LEVEL`），每級 `bonus` 全數值
  ×(1+`ENHANCE_BONUS_PER_LEVEL`)，封頂 +50%
- `getEffectiveBonus(item)` — 套用強化加成後的實際數值，**所有讀
  `item.bonus` 的地方（含 `computeArenaEquipBonus()`、UI 顯示）都要改讀這個
  函式的結果**，不然強化了但沒生效
- `salvageArenaEquipment(item)`/`SALVAGE_TABLE` — 分解換強化石／合成材料，
  只有 rare/legendary 才出合成材料
- `synthesizeUpgrade(item)`/`SYNTHESIS_COST` — 花合成材料+金幣把稀有度跳
  一階（magic→rare→legendary），legendary 回 `null`（已頂級）

`meta.enhanceStoneCount`/`meta.synthesisMaterialCount` 是新增的兩個帳號共
用材料貨幣，關卡通關（`campaign_stage`/`arena_run` 都有）小額額外掉強化
石，合成材料只從分解 rare+ 裝備拿。

### Adventure 探索關卡（src/adventure/，Room Transition 架構）

跟上面回合制 Roguelite、即時制 ASTERVOW 大廳/戰鬤都是平行、完全獨立的
第三套系統，只共用少數美術管線跟敵人數值公式。玩家從固定式主線地圖選到
`forest_1_1` 這類 Adventure 專屬關卡時，走的是這一套（`AdventureGame.ts`/
`AdventureStageScreen.tsx`），不是 `ArenaGame.ts`。

離散房間（每個房間直式 1080×1920，貼在一張離屏 atlas 上）+ 單一
worldLayer + 房間淡出淡入轉場，房間內一切資料一律用 room-local 座標
（`CollisionSystem.ts` 統一加一次 `atlasOrigin` 換算，資料端不要手動算）。

**新增/調整任何 Adventure 關卡（地形碰撞、迷你地圖、前景遮擋、角色/敵人
顯示尺寸、房間資料……）之前，先看
[`docs/adventure-room-design-guide.md`](docs/adventure-room-design-guide.md)**
——這份文件整理了 forest_1_1 從 v1 到 v13.6.x 一路踩過的坑（atlasOrigin
座標系誤用、collider 手算世界座標算錯、前景遮擋固定 zIndex 蓋住角色、
迷你地圖用貼圖座標排版看不懂……）跟對應的正確做法，照做可以直接跳過
這些已經解決過的問題，不要重新摸索一次。
