# 森林遺跡 1–20 關接地式旅程系統

> ⚠️ **2026-08-16 起已停用**：森林遺跡從 20 關砍到 10 關重新設計後，
> `CampaignMapScreen.tsx` 已經不再呼叫這套系統（`hasTravelSegments`/
> `CampaignTravelPreview` 沒有任何畫面引用）。以下內容是停用前的設計
> 存檔，當歷史文件參考即可，不要假設它仍在運作；見
> `src/campaign/README.md` 的說明。

森林遺跡主線（`forest_1_1` ~ `forest_1_20`）選關前的走位過場。跟
`src/campaign/campaignTypes.ts`/`chapters/forestRuins.ts`（關卡戰鬥資料：
敵人、波次、目標、獎勵、三星條件、Boss）完全分開——這一套只負責「玩家
點選關卡後、進入即時制戰鬥前的走位畫面」，不含任何戰鬥/勝負邏輯，也不會
被 `src/arena/ArenaGame.ts` 讀取。

## 資料結構

| 檔案 | 內容 |
|---|---|
| `src/campaign/chapterTravelTypes.ts` | `TravelLayer`（單一圖層：backdrop/midground/ground/foreground）、`TravelPathNode`、`TravelSegment` 型別 |
| `src/campaign/chapterTravelData.ts` | 四篇章 × 六段 = 24 段資料 + `getTravelSegmentsForStage(stageId)`/`hasTravelSegments(stageId)` + 開發期覆蓋率自我檢查 |
| `src/components/CampaignTravelPreview.tsx` | 播放元件：依 `layers[]` 分層渲染、角色沿 `pathNodes` 走位、`parallax` 位移、篇章氣氛粒子、略過按鈕 |

`CampaignMapScreen.tsx` **完全沒有改動**——它一開始就是靠
`hasTravelSegments(stageId)` 泛用判斷要不要攔截選關，資料從 6 段（篇章 I）
擴到 24 段（全 4 篇章）之後自動對所有 20 關生效，不需要碰選關 UI 本身。

## 篇章對照與節點覆蓋率

| 篇章 | chapterId | 對應關卡 | 氣氛(ambience) | 轉場段 | 篇章終點 |
|---|---|---|---|---|---|
| I 枯葉邊境 | `forest-ch1` | `forest_1_1`–`forest_1_5` | `leaves` 落葉 | `c1_05_broken_arch` | 狂暴獸人隊長 |
| II 根脈低語 | `forest-ch2` | `forest_1_6`–`forest_1_10` | `root-glow` 根脈光 | `c2_05_heartwood_gate` | 古樹守衛 |
| III 黑霧裂口 | `forest-ch3` | `forest_1_11`–`forest_1_15` | `miasma` 瘴氣 | `c3_05_obsidian_rift_gate` | 黑騎士先鋒 |
| IV 巢穴終焉 | `forest-ch4` | `forest_1_16`–`forest_1_20` | `heat-haze` 熱霧 | `c4_05_crater_ascent` | 森林巨龍 |

每篇章 6 段 = 4 個一般戰鬥段 + 1 個純轉場段 + 1 個 Boss 戰鬥段，轉場段接在
該篇章 Boss 段前面一起播（例如點 `forest_1_5` 會依序播
`c1_05_broken_arch` → `c1_06_orc_ritual_ground`）。20 個既有戰鬥關卡
剛好各自對應一個 `kind:'battle'` 段落，`chapterTravelData.ts` 底部有一段
`import.meta.env.DEV` 才跑的自我檢查，關卡缺漏或重複會在開發模式直接
`throw`（正式建置不受影響，因為那段程式碼會被 tree-shake 掉）。

`ambience`（氣氛粒子層）目前是**每篇章統一一種**，不是逐段挑選——森林遺跡
的四篇章敘事本來就分別對應落葉/根脈/黑霧/熱霧四種主題氣氛，統一套用比
逐段各異更符合「一路穿越同一種氛圍」的旅程感。`TravelSegment.ambience`
型別多保留了 `'embers'`（餘燼）一個選項沒被目前資料用到，供之後個別段落
想要特別強調（例如某個火盆特寫段）時覆寫。

## 美術替換對照表

第一版刻意把地面/地標/前景遮罩收斂成固定幾類代稱重複使用，而不是 24 段
各自發明新代稱——這樣正式美術只需要準備下面這張表列出的資產數量，不用
畫 24 套不同的地面/裝飾。**全部都是暫代**，不是最終美術。

### 地面模組（6 類，`GROUND_STYLE` in `CampaignTravelPreview.tsx`）

| 代稱 | 目前暫代 | 用在哪些段落 |
|---|---|---|
| `dirt_path` | CSS 漸層（土色） | 枯木哨口、哥布林木柵、樹根迷境、腐敗林徑 |
| `stone_path` | CSS 漸層（灰色） | 苔蘚古道、箭雨殘道、碎核庭院、碎片回廊、殘破防線 |
| `wood_bridge` | CSS 漸層（木色） | 荊棘彎道、毒菇濕地、毒霧低谷、獸人鐵關 |
| `stone_stairs` | CSS 漸層（深灰） | 崩塌拱門、薩滿祭壇、火山口上坡 |
| `ritual_platform` | CSS 漸層（暖灰） | 獸人儀式台、心材之門、古樹心室、先鋒決鬥坪、龍巢天井 |
| `scorched_rock` | CSS 漸層（焦紅黑） | 荊棘獵場、黑曜裂門、龍巢岩穴 |

### 地標（midground，6 類）

`wood_post` 🌲、`stone_pillar` 🗿、`palisade` 🚧、`brazier` 🔥、
`ruin_gate` ⛩️、`broken_altar` 🏛️ —— 目前都是 emoji 佔位圖示。

### 前景遮罩（foreground，10 類）

`fallen_leaves` 🍂、`thorn_cluster` 🌵、`fallen_rock` ⛰️、`moss_tuft` 🌿、
`mushroom_cluster` 🍄、`root_tangle` 🥀、`mist_wisp` 💨、`ember_spark` ✨、
`banner_flag` 🚩、`crystal_shard` 💎 —— 依角色 `footY` 排序，z-index 固定
最高（1000），會遮住角色下半身。

### 氣氛層（ambience，5 類）

`leaves`/`embers`/`miasma`/`root-glow`/`heat-haze`，目前全部是 CSS
`radial-gradient` 小圓點 + keyframe 動畫（`.ctp-amb-*` in `styles.css`），
沒有用任何 emoji 或圖片，純色塊小點飄動。

### 怎麼換成真美術

1. **地面**：把 `GROUND_STYLE[key]` 改成讀一張圖片路徑即可——建議在
   `TravelLayer` 加一個可選的 `asset` 欄位給 ground layer 用（`asset`
   目前只有 backdrop 在用），`CampaignTravelPreview.tsx` 的 `LayerView`
   多判斷「ground 有 asset 就用 `background-image`，否則 fallback 回
   `GROUND_STYLE`」，資料面 `chapterTravelData.ts` 完全不用改動代稱命名，
   逐段補 `asset` 即可漸進替換。
2. **地標／前景**：把 `DECOR_GLYPH[key]` 那一行改成渲染 `<img>` 或
   `<SpriteAnimator>`，其餘代稱字串不用變，可以逐一替換不用整批換完。
3. **氣氛粒子**：把對應 `.ctp-amb-{ambience}` 的 CSS 規則換成真的粒子貼圖
   或更精緻的動畫，`AmbienceLayer` 元件本身不用改。
4. **pathNodes 座標**：新美術跟目前暫代色塊的比例可能不同，換完美術後
   建議在瀏覽器重新走一次，微調 `x`/`footY`/`scale`。

## 接地感（不可省略的四項規則，實作方式）

1. **腳底錨點**：`.ctp-char-anchor` 用 `transform: translate(-50%, calc(-100% + bobPx))`，角色圖片的底部中心對齊 `pathNode` 座標，不是用圖片中心或左上角定位。
2. **`footY` 驅動 z-index**：每幀 `wrap.style.zIndex = String(20 + Math.round(pose.footY * 60))`，角色離鏡頭越近（`footY` 越大）疊在越上層。
3. **陰影跟腳底同步縮放**：`.ctp-char-shadow` 用同一個 `pose.scale` 縮放，位置固定對齊角色錨點（同一個 `wrap` 內，`translate(-50%,-50%) scale(pose.scale)`）。
4. **前景遮擋**：`.ctp-decor-slot-fg` 固定 `z-index: 1000`，永遠蓋在角色（`z-index` 最高約 80）之上，角色走到前景裝飾的視覺位置時下半身會被遮住。

## 更新紀錄

- **2026-08-14**：backdrop 換成森林遺跡專屬戰鬥場景圖（5 個 `bgTheme` 各
  一張，`public/assets/backgrounds/forest_ruins_2026_08/`），取代原本借用
  `forest_1-3.jpg`/`castle_1-3.jpg`/`snowfield_1-3.jpg` 的暫代方案。同一
  `bgTheme` 目前只有 1 張圖，24 段裡同主題的段落背景會完全相同（例如
  1-4 關的旅程段全部是同一張 `forest_entrance_1.jpg`）；等美術補齊每主題
  的第 2、3 張變體，再依段落錯開即可有更多變化。地面/地標/前景/氣氛層仍是
  CSS/emoji 暫代，還沒換真美術。

## 已知限制

- 沒有玩家位置持久化——每次開旅程預覽都是從畫面左側/上方邊緣重新出發，
  不會記得「上次走到哪」；`TravelSegment.entrance`/`exit` 欄位已經預留
  （目前等同 `pathNodes` 的第一/最後一個節點），供之後補「通關後從上一段
  結束位置接續」時使用，這次沒有實作。
- 沒有做「鏡頭橫向平移」式的完整視差滾動——`parallax` 係數目前只換算成
  角色行走時每個圖層一次性、幅度很小（±50px 基準）的水平位移，模擬淺淺
  的景深感，不是攝影機真的橫向跟拍。
- 角色走路用的是既有 `idle` 幀（sprite sheet 沒有專屬走路幀），視覺上偏向
  「小碎步滑動」而不是真的走路動作。
- 這是新增的旅程視覺層，不影響、也沒有修改任何既有的 PWA/Workbox 建置
  設定——`npm run build` 若失敗必定跟本次修改無關（本次改動只有純資料檔、
  一個 React 元件、CSS，沒有動 `vite.config.ts`/`vite-plugin-pwa` 設定）。
