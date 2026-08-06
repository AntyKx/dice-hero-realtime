# 骰子英雄 → 即時制 Survivor-like 轉向規畫

> 決策紀錄（2026-08-06）：
> 1. 動畫全面走 2D sprite，放棄 `Model3DTest.tsx` 的 3D GLTF 實驗路線
> 2. 戰鬥從回合制擲骰，改成即時制走位＋自動攻擊（參考 DQ 破戒／吸血鬼倖存者）
> 3. 骰子降級為「升級/波次時的抽牌機制」，不再是逐回合的操作核心
> 4. 先簡化到最核心玩法，裝備/天賦/副本/排行榜用 feature flag 藏起來，不刪
>
> 取代 `D:\CLAUDE專案\三選一\PLAN.md`（原本規畫從零用 Godot 做）——
> 改為在既有 17,000 行專案上演化，能重用的邏輯資產遠大於重寫成本。

---

## 0. 這次轉向改變了什麼、沒改變什麼

**沒改變**：TS/React/Vite/Cloudflare Pages 部署管線、`GamePhase` 狀態機架構、
存檔/排行榜後端、三選一的設計哲學。

**改變的只有「戰鬥怎麼進行」**。回合制單體對戰 → 即時制對抗波次怪群。
這一塊是重寫，其餘畫面（地圖、獎勵、選單）不受影響。

---

## 1. 資產盤點：留下 vs 重寫

| 檔案 | 行數 | 處置 |
|---|---|---|
| `buffCards.ts` | 456 | **留下**，觸發時機從「戰後」改成「升級/波次結束」 |
| `relics.ts` | 531 | **留下**，原封不動 |
| `talents.ts` | 450 | 留下，先用 feature flag 隱藏（見 §4） |
| `equipment.ts` | 1,685 | 留下，先用 feature flag 隱藏；數值套用點要接到新的 StatBlock |
| `scoring.ts` + Cloudflare Functions 排行榜 | — | 留下，先隱藏，分數公式之後要重寫（存活時間/擊殺數為主） |
| `mapGen.ts` / `dungeon.ts` | 810 | 節點地圖的「巨觀結構」概念留下：每個節點 = 一場即時戰鬥（一波）；15 層副本先隱藏 |
| `data.ts`（HEROES/ENEMIES/SpriteMeta） | 215 | 留下，**但要擴充**：現有 6 格單列（idle/attack/skill/hurt）沒有方向性移動幀，即時走位需要至少 4 方向或左右翻轉的行走循環 |
| `RewardScreen.tsx` | 102 | 留下，改造成「擲骰 → 三選一卡牌」的入口畫面（見 §3） |
| `App.tsx` GamePhase | — | 新增 `{ type: 'arena_battle', waveConfig }` phase，取代 `battle` 在新模式下的角色 |
| `BattleScreen.tsx` | 6,017 | **不重用**，回合制 UI 邏輯（保留骰/重骰/牌型判定）在即時制下無意義。整支砍掉，新建 `ArenaScreen` |
| `gameLogic.ts`（`evaluateDice`/`computeHeroAction`） | 170 | 牌型判定邏輯不重用；純數值計算部分（傷害公式）可抽出來給新引擎用 |
| `EquipmentScreen.tsx` | 1,147 | 隱藏期間不用碰 |
| `three` / `@react-three/fiber` / `@react-three/drei` | — | **移除依賴**，`Model3DTest.tsx` 一併刪除 |

**淨效果**：約 5,700 行純邏輯/資料留用，約 6,000 行戰鬥 UI 重寫，新增約
2,000～3,000 行即時制引擎程式碼。比從零開始（Godot 方案）省下的是卡池設計、
遺物平衡、meta 進度、後端這些已經調過的內容資產。

---

## 2. 技術決策

| 項目 | 決定 | 理由 |
|---|---|---|
| 戰鬥渲染 | **PixiJS**（純 `pixi.js`，不用 `@pixi/react`） | DOM/CSS 扛不住同屏 50～100+ 動態 sprite＋投射物＋粒子；換渲染層不等於換技術棧，TS/React/Vite/Cloudflare/Capacitor 全部留用。`@pixi/react` 8.x 要求 React 19（本專案是 React 18），改用 imperative 的 `PIXI.Application`，在一個 React 元件內用 `useRef`+`useEffect` 掛載/卸載，剛好對應「canvas 內只有 Pixi 管、UI 疊層只有 React 管」的切分原則 |
| 其他畫面 | 繼續 React DOM | 地圖、獎勵卡、選單不需要 canvas |
| 移動控制 | 觸控拖曳（虛擬搖桿或任意處拖曳） | 直向手遊標準操作，單手可玩 |
| 碰撞 | 手動空間分割（grid-based spatial hash），不用 Pixi 內建物理 | 怪多時 O(n²) 判定會先死 |
| 物件池 | 敵人/投射物/傷害數字/掉落物全部池化 | 同上，避免頻繁 GC |
| 資料驅動 | `data.ts` 的 HEROES/ENEMIES 結構延續，新增 `WaveConfig`/`SpawnPattern` | 波次表資料化，方便之後用 Cloudflare Functions 做遠端調平衡 |

---

## 3. 骰子的新角色：波次/升級抽牌

**設計**：即時戰鬥全程自動攻擊＋玩家走位，不再有任何回合制操作。骰子被
重新定位成「決定強化池品質」的儀式化動畫，出現在兩個時機：

1. **升級**（吃夠 XP）— 螢幕暫停，播放擲骰動畫，骰面點數換算成稀有度加權
   （例如骰到 6 大幅提高 Epic/Legendary 機率），接著跳出既有的三選一卡片 UI
2. **波次結算**（每波怪清完）— 同樣邏輯，用來發遺物或裝備（裝備先隱藏，
   v1 只發遺物）

實作上：`getRandomCards()`/`getRandomRelics()` 已經支援 `tier`/`role` 參數，
只需要新增一個「骰子加權」輸入，不用改函式核心邏輯。`RewardScreen.tsx`
的三選一 UI 幾乎整套照搬，只在最前面插一段擲骰動畫。

這保留了「骰子英雄」的品牌識別度與你已經做好的抽卡機制，同時讓即時戰鬥
本身維持吸血鬼倖存者式的純粹（不被回合制操作打斷節奏）。

---

## 4. v1 簡化範圍（feature flag，不刪除）

保留（v1 核心玩法）：
- 即時走位 + 自動攻擊
- 骰子抽牌三選一（buffCards + relics）
- 節點地圖（每節點 = 一波，簡化成線性或簡單分支）
- Boss 波

先關閉（`FEATURE_FLAGS` 常數控制，程式碼保留）：
- 裝備系統（8 部位/套裝/詞綴/傳奇/鍛造）
- 天賦樹
- 4 個 15 層副本
- 排行榜（分數公式要等新玩法穩定才重寫，先關閉上傳）
- 藥水/詛咒/事件（先關閉，之後看要不要以「即時戰鬥中的拾取物」形式回歸）

```ts
// src/featureFlags.ts
export const FEATURE_FLAGS = {
  equipment: false,
  talents: false,
  dungeons: false,
  leaderboard: false,
  potionsAndCurses: false,
} as const
```

---

## 5. 新引擎需要的模組（原專案沒有，要新寫）

| 模組 | 說明 |
|---|---|
| `arena/PlayerController` | 拖曳輸入 → 位移，邊界限制 |
| `arena/AutoAttack` | 依 `attackSpeed`/`range` 找目標、冷卻計時、開火 |
| `arena/SpawnDirector` | 波次表驅動，時間到就從邊緣生怪，難度隨時間曲線成長 |
| `arena/EnemyAI` | 追擊型/遠程型/衝鋒型幾種基礎行為 |
| `arena/ProjectilePool` / `EnemyPool` / `DamageNumberPool` | 物件池 |
| `arena/PickupSystem` | XP 寶石、磁吸範圍、金幣、拾取合併 |
| `arena/CollisionGrid` | 空間分割碰撞判定 |
| `arena/Juice`（頓幀/震屏/閃白） | 打擊感 |
| `arena/DiceUpgradeOverlay` | 升級時的擲骰動畫 + 呼叫既有 `RewardScreen` 邏輯 |

---

## 6. 美術資產缺口

現有 sprite sheet 是單列 6 格（idle_0/1、attack_0/1、skill_0、hurt_0），
**沒有移動方向幀**。即時走位至少需要：

- 一組行走循環（2～4 幀即可，用左右翻轉省掉左右兩份）
- 如果敵人要有「面向玩家」的表現，敵人也要一份

如果你原本規畫的美術量沒算進這個，這是要新增的產能，建議先用現有
idle 幀 + 位移做「無行走動畫」的簡化版驗證玩法，確定好玩後再補行走幀。

---

## 7. 里程碑

### M0 — 清理與骨架（0.5～1 天）
- 移除 `three`/`@react-three/*` 依賴與 `Model3DTest.tsx`
- `git init`（目前無版控，這是動大手術前的前提）
- 拿掉 `styles.css:14` 的 `min-width:1280px`
- 建 `FEATURE_FLAGS`，把裝備/天賦/副本/排行榜入口用 flag 包起來（先關閉但不刪程式碼）
- 裝 `pixi.js` + `@pixi/react`

### M1 — 即時戰鬥垂直切片（1 週）✅ 骨架完成（2026-08-06）
- `ArenaGame`（純 `pixi.js`，imperative）+ `ArenaScreen`（React 外殼/HUD）+
  `arena_test` phase，掛在 GM 模式（版本號 → 密碼 `dice9999`）底下的
  「🕹 即時戰鬥測試」入口，先不接進正式地圖/獎勵流程
- 玩家拖曳走位、一把自動攻擊武器、一種追擊怪（knight vs goblin，用現有
  `/assets/frames/` 個別幀圖，未做行走動畫）、擊殺掉 XP 寶石、磁吸拾取
- `Pool<T>` 物件池套用在投射物與掉落物
- ✅ `npm run build`（`tsc -b` 對 pixi.js v8 實際型別）通過
- ⚠️ **驗收「60 秒不掉幀、走位手感」尚未完成** —— claude-in-chrome 自動化
  瀏覽器測試時該分頁 `document.hidden === true`，rAF 被瀏覽器節流到幾乎
  不跑，只能驗證「渲染/資源載入/事件有沒有接上」（sprite 正確顯示、HUD
  骨架、投射物方向、Boss/敵人 spawn 邏輯），測不出跟真實時間有關的手感與
  效能。需要在真正前景的瀏覽器或手機上實測才能過這關，見 §8.1

### M2 — 骰子抽牌整合（3～5 天）← **關鍵驗證點** ✅ 骨架完成（2026-08-06）
- 新增 `src/arena/cards.ts`：**沒有**沿用 `buffCards.ts`（那 456 行是回合制專用
  效果，rerollBonus/damagePerRank/freezeOnHighCombo 等語意上套不進即時戰鬥，
  硬轉會變成一層脆弱的翻譯層）。改成一組全新、小而乾淨、直接對應 ArenaGame
  即時屬性的 13 張卡（flatDamage/atkCooldownMult/moveSpeedBonus/maxHpBonus/
  pickupRangeBonus），足夠驗證「擲骰→三選一」這個節奏本身，內容深度留給 M3
- `DiceUpgradeOverlay.tsx`：升級觸發 → `app.ticker.stop()` 暫停戰鬥 → 擲骰動畫
  （重用現有 `DieFace` SVG 元件）→ 骰值加權三選一（重用 `.reward-card` 等
  既有 CSS，樣式跟回合制的 RewardScreen 一致）→ 選卡套用效果 → `ticker.start()`
  恢復戰鬥
- `pickThreeCards()` 的加權邏輯有 `src/arena/cards.test.ts` 4 個 vitest 單元測試
  覆蓋（不受瀏覽器分頁節流影響，可靠）
- `ArenaGame` 新增 `forceLevelUp()` debug 方法 + `ArenaScreen` 暴露
  `window.__arena`，繞開 §8.1 的 rAF 節流限制，讓「升級→暫停→擲骰→三選一→
  套用→恢復」整條路徑能在自動化瀏覽器裡可靠測試（已用 javascript_tool 呼叫
  驗證整條流程跑通，含 HUD 等級數字正確更新）。GM 模式已經是密碼保護的
  dev-only 入口，留著這個 hook 對之後的手動 QA 也有用，不算多餘的debug 殘留
- ✅ 已驗證：擲骰動畫、稀有度加權、卡片套用、暫停/恢復機制都正確
- ⚠️ 尚未驗證（跟 M1 同樣的限制）：連續玩多局「節奏感覺對不對、會不會覺得
  打斷流暢度」這種主觀手感，需要使用者在真正前景的瀏覽器/手機上實測

### M3 — 波次與內容（1.5～2 週）
本輪先做「即時制本身好不好玩」的核心（波次生成、敵人多樣性、Boss），
接著補了「接進正式冒險流程」——遺物系統仍明確留給下一輪，見文末待辦。

- ✅ `src/arena/enemies.ts`：敵人型別表（6 種一般 + 1 隻 Boss，全部沿用現有
  `/assets/frames/enemies/` 個別幀圖，沒加新美術）+ 波次生成純函式
  （`pickEnemyType`/`spawnIntervalSec`/`maxConcurrentEnemies`），6 個 vitest
  覆蓋
- ✅ `ArenaGame` 從單一敵人改成陣列 + `Pool<Sprite>` 物件池管理（敵人死亡後
  sprite 進池子回收，換貼圖重用，不重新 new）；投射物命中判定、自動攻擊
  目標改成「陣列裡找最近的」
- ✅ 難度曲線：生怪間隔 2.2s→0.5s（4分鐘內線性收斂）、同屏上限 6→30 隻
  （5分鐘內線性長）、敵人型別依 `minMinute` 逐步解鎖（黑暗騎士 2.5 分後才會出現）
- ✅ Boss（巨龍，3 分鐘整出現）：血量遠高於一般怪、粉紅色 tint 區分、專屬
  HUD 血條、擊敗後 HUD 顯示「👑 Boss 擊敗！」，掉落大顆經驗寶石
- ✅ 過程中用 `javascript_tool` 直接戳 `window.__arena` 的內部方法/欄位
  （TS 的 `private` 只在編譯期擋，runtime 還是能呼叫），繞開 §8.1 的節流
  限制，端到端驗證了：波次上限精確符合公式、敵人型別按 `minMinute` 正確
  解鎖、Boss 血量/tint 正確、擊殺→物件池回收→掉寶→撿取→升級整條路徑、
  Boss 擊敗轉場——**過程中這樣測還真的抓到一個真 bug**：`gainXp` 原本用
  `if` 判斷升級，單次拿到大量 XP（例如 Boss 的大顆寶石）會只跳一次升級
  提示、漏掉應得的強化次數，已改成 `while` 正確疊代（見 commit）
- ✅ **接進正式冒險流程**：`types.ts` 新增 `arena_run` phase（帶 `heroId`），
  `handleAdventureStart` 對非地城的主線一律導向 `arena_run`（不再建立回合制
  `RunState`/`generateMap`/`map` phase），死亡時 `ArenaGame` 觸發
  `gameOver` 狀態 → `ArenaScreen` 顯示結算畫面（存活時間/等級/擊殺數/
  Boss 是否擊敗）→「返回主選單」。`AdventureReadyScreen` 的英雄選擇 UI
  整個原封不動重用，篇章/路線選擇目前對即時制內容沒有實質影響（先忽略，
  不影響功能，只是畫面文字暫時對不上）。已用瀏覽器實測整條真實路徑：
  主選單「開始新冒險」→ 確認覆蓋 → 選英雄 → 出發 → 真的進入即時戰鬥
  （不是走 GM 測試入口）→ 用 debug hook 觸發死亡 → 結算畫面數字正確 →
  返回主選單成功
- ⚠️ 已知簡化，之後要做：
  - 敵人碰撞/命中判定還是 O(投射物數 × 敵人數) 全對全掃描，沒有空間分割
    （§7 原本就寫了這個要做，還沒做，30 隻上限暫時撐得住，數量再往上加
    之前要先做）
  - 一次大量 XP 若跨好幾個等級，目前只跳一次升級提示（見上面 bug 修復的
    註解），沒有做「升級排隊」，之後真的常常一次跳兩級再考慮
  - 敵人碰撞半徑統一用玩家/敵人的距離圓形近似，沒有依 sprite 實際外框
- ✅ **遺物系統（Boss 戰利品）**：新增 `src/arena/relics.ts`——沿用 M2 對
  `relics.ts`（531 行回合制效果）的同一個決策，不轉譯，改寫一組 6 個全新、
  直接對應 ArenaGame 機制的遺物：穿透之矢（投射物穿透 2 個敵人）、雙重射擊
  （多發 1 發投射物）、嗜血之刃（15% 傷害轉回血）、荊棘護甲（被咬反彈 40%
  傷害）、生命回復（每秒回復 2% 最大HP）、護盾核心（每 12 秒一次全格擋）。
  刻意讓遺物帶新機制而不是單純數值加成，跟升級卡（cards.ts）做出區隔。
  Boss 擊敗時暫停戰鬥，跳出 `RelicLootOverlay` 三選一（金色系卡片，視覺上
  跟升級卡的稀有度色階分開），選完套用並恢復戰鬥。4 個 vitest 覆蓋抽選
  邏輯，並用瀏覽器實測整條路徑：Boss 戰→死亡→戰利品畫面正確顯示→選穿透
  之矢→`pierceBonus` 正確變 2、`ticker` 恢復運作；接著手動套用剩下 5 個
  遺物，逐一驗證回血、護盾格擋（真的擋下一次傷害且護盾用掉歸零）、穿透
  次數都在 runtime 正確生效
- ⛔ **未做，明確留給下一輪**：
  - 中途存檔——`arena_run` 目前沒有接 `saveRun`/`loadSavedRun`，死了就真的
    重來（跟這類遊戲的慣例一致），主選單「繼續冒險」目前顯示的還是轉向前
    留下的舊回合制存檔殘留，良性但畫面文字對不太上，之後要嘛清掉那筆舊
    資料、要嘛幫 arena_run 也接一份自己的存檔格式
  - 100+ 敵人同屏的效能實測——跟 M1/M2 一樣卡在 §8.1 的分頁節流，數字上
    驗證了 spawn 邏輯照公式在跑，但「中階手機維持流暢」這件事本身還是要
    使用者在真正前景的裝置上測

### M4 — 變現（1 週）
- Capacitor 包裝（Android/iOS）
- 廣告復活：`@capacitor-community/admob` Rewarded Ad，死亡時觸發，每局限 1～2 次
- 內購：`@revenuecat/purchases-capacitor`，去廣告 + 角色解鎖
- ✅ 驗收：實機測完整「死亡→看廣告→復活」與「購買→解鎖」流程

### M5 — 打磨與功能回歸評估
- 打擊感（頓幀/震屏/粒子）
- 視情況決定裝備/天賦/副本/排行榜是否要接回新玩法，或永久移除
- 平衡數據紀錄（沿用 Cloudflare Functions，卡片選取率/死亡波次）

---

## 8.1 自動化瀏覽器測試的已知限制

用 claude-in-chrome 測 `ArenaScreen` 時，該分頁常常是
`document.visibilityState === 'hidden'`（即使 `hasFocus()` 是 true）。
PixiJS 的 ticker 走 `requestAnimationFrame`，瀏覽器對隱藏分頁會把 rAF
節流到幾乎不跑，導致：
- `wait()` 期間畫面完全沒有進度（HUD 數字凍結、entity 不動）
- 只有在 `screenshot`/`left_click` 等會強制合成畫面的操作前後，才會擠出
  一兩個 frame 的動畫
- `left_click_drag` 這種合成手勢不會在過程中持續產生真實時間，測不出
  「拖曳走位」的實際手感

**結論**：這個環境的自動化瀏覽器只能驗證「初始渲染/資源載入/事件是否有接上」
這一層，**測不出跟真實時間有關的東西**（走位手感、掉幀與否、60 秒續航）。
這類驗證要嘛請使用者在自己真正在前景的瀏覽器/手機上測，要嘛之後考慮加一個
「debug 強制步進 N frame」的按鈕繞開 rAF 節流。

## 8. 風險

| 風險 | 對策 |
|---|---|
| Pixi + React 整合的心智負擔（兩套渲染模型並存） | 嚴格切分：canvas 內只有 Pixi 管，UI 疊層只有 React 管，兩者只透過 state/props 溝通，不要互相操作對方的節點 |
| 骰子抽牌節奏跟即時戰鬥「合不合」只是假設 | M2 是強制驗收點，不好就調整節奏（例如改成不暫停、用小視窗疊加），別急著往 M3 堆內容 |
| 隱藏的系統之後想接回，發現數值模型不相容 | `equipment.ts`/`talents.ts` 的加成最後都要落在同一組 `StatBlock`，現在重寫戰鬥引擎時就把屬性計算做成獨立模組，之後回歸系統只要接這一層 |
| 效能只在開發機測過 | M1、M3 都要求實機驗收，不要拖到最後 |

---

## 9. 下一步

1. 確認這份規畫方向沒問題
2. 執行 M0（依賴清理、feature flag、git init、裝 Pixi）
3. 進 M1 垂直切片
