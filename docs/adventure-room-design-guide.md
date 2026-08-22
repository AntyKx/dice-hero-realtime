# Adventure 探索關卡設計指南（Room Transition 架構）

> 本文件整理森林遺跡 1-1（`forest_1_1`）從 Room Transition v1 到 v2、
> 一路調到 v13.6.x 的完整經驗——架構決策、踩過的坑、每個坑的根因跟修法。
> **以後任何新的 Adventure 探索關卡都應該照這份文件的做法做，不要重新
> 摸索一次已經解決過的問題。**

## 一、整體架構

Adventure 探索引擎（`src/adventure/`）是跟回合制 Roguelite（`src/`
根目錄那套）、即時制戰鬥（`src/arena/`）平行、完全獨立的第三套系統，只
共用少數美術管線（`heroSpriteRig.ts`/`frameLoader.ts`）跟數值公式
（`src/arena/enemies.ts` 的 `EnemyTypeDef`）。

### 核心概念：離散房間 + 單一 worldLayer

不是連續世界（那是 v1 的做法，已淘汰），是**離散房間**：

- 整個關卡的所有房間背景圖貼在一張離屏 atlas 上（`world: {width, height}`），
  每個房間有自己的 `atlasOrigin`（左上角在 atlas 世界座標的位置）跟
  `size`（通常統一 `{width:1080, height:1920}`，直式手機比例）。
- `RoomSystem.ts` 管理「目前 active room」，鏡頭（`CameraSystem.ts`）
  永遠鎖在 active room 的範圍，不會像 v1 那樣連續捲動。
- 玩家在世界座標系移動，但房間內的一切資料（`walkableBoundsLocal`、
  `terrainCollidersLocal`、collectibles、NPC、trigger……）都用 **room
  local 座標**（0,0 是房間左上角），需要世界座標時系統自動加
  `room.atlasOrigin`——**資料端永遠只寫 local 座標，不要手動加
  atlasOrigin**，這是這份文件最重要的一條規則，見下面「坑一」。
- 換房間走 0.18 秒淡出→傳送→淡出的 fade transition，不是即時捲動鏡頭。

### 檔案結構

| 檔案 | 職責 |
|---|---|
| `src/adventure/stages/forestRuins01.ts` | 這一關的全部資料：房間、出口、地形碰撞、NPC、任務、戰鬥區、謎題、收集品、秘密 |
| `src/adventure/adventureTypes.ts` | 所有型別契約（`RoomDef`/`RoomTransitionDef`/`RoomTerrainColliderDef`/`ColliderDef`/…） |
| `src/adventure/systems/RoomSystem.ts` | active room、換房 fade、出生點 |
| `src/adventure/systems/CameraSystem.ts` | 鏡頭 cover-fit scale（`computeRoomFitScale`，唯一算縮放公式的地方） |
| `src/adventure/systems/CollisionSystem.ts` | 玩家/敵人移動碰撞、sub-step、room-local terrain collider 換算 |
| `src/adventure/systems/InteractionSystem.ts` | NPC/火盆/裂牆互動距離判定 |
| `src/adventure/systems/CollectibleSystem.ts` | 紫幣/星片/寶箱/任務物拾取距離判定 |
| `src/adventure/combat/AdventureCombatController.ts` | 房間內小範圍即時戰鬥（不是掛 ArenaGame 進來） |
| `src/adventure/objects/StageExit.ts` | 終點兩段式 proximity（先提示、真正踩到才結算） |
| `src/adventure/AdventureGame.ts` | 主迴圈、渲染、HUD 資料組裝、debug overlay |
| `src/adventure/MiniMapHud.tsx` | 迷你地圖（本地窗口＋全圖），完全動態算，見第六節 |
| `src/adventure/art/forestRuins01VisualTuning.ts` | 顯示尺寸/hitbox 公式（英雄/NPC/敵人），見第五節 |
| `public/assets/adventure/{stageId}/rooms_v2/roomXX.webp` | 房間背景圖（直式，實際像素跟 `room.size` 不一定一樣，見坑三） |

---

## 二、新增一個 Room Transition 關卡的標準流程

1. **準備美術**：每個房間一張直式底圖（建議跟 `room.size` 同尺寸，不同
   也沒關係，`AdventureGame.ts` 的 `buildScene()` 會強制 `bg.width/height`
   對齊 `room.size`，但最好一開始就準備正確尺寸，省一層換算誤差）。
2. **定義 `RoomDef[]`**：每個房間給 `id`/`atlasOrigin`/`size`/`background`/
   `walkableBoundsLocal`/`spawnLocal`/`transitions`。`atlasOrigin` 只是
   「這張圖存在離屏 atlas 的哪個位置」，**跟遊戲裡實際的東南西北方向完全
   無關**（這是這份文件要反覆強調的事，見坑二）。
3. **`walkableBoundsLocal` 只框大外框**，不要求精準——這是安全網，真正的
   「哪裡不能走」交給下一步的 `terrainCollidersLocal`。
4. **看圖加 `terrainCollidersLocal`**：這是本文件的核心方法論，見第三節。
5. **`transitions` 的 `zone` 決定方位**：出口 zone 貼在房間 local 座標的
   哪一邊（上/下/左/右），就代表玩家走出那個方向。迷你地圖的房間方位是
   從這裡反推的（見第六節），所以 zone 位置要老實反映美術上出口畫在哪
   （門在畫面上緣就給小 y，門在左緣就給小 x，以此類推）。
6. **驗證**：每加一批新資料，跑一次自動化重疊檢查腳本（見第四節），
   不要只靠肉眼。
7. **版號 + build + deploy**：照 `CLAUDE.md` 的版號規則，`tsc -b` 過、
   `npm run build` 過，才 `wrangler pages deploy`。
8. **先不要 commit**，等使用者在手機上實測過確認沒問題再 commit（這是
   這整個專案這幾個月的固定工作模式，不是 Adventure 特有）。

---

## 三、地形碰撞（`terrainCollidersLocal`）方法論

### 3.1 架構：為什麼是 room-local，不是 stage.colliders

`RoomDef.terrainCollidersLocal?: RoomTerrainColliderDef[]`——每個房間自己
的靜態地形障礙（岩石、樹叢、水面、帳篷、厚牆、柱座……），座標是
**room local**，`CollisionSystem.ts` 的 `blockedByRoomTerrain()` 統一加
一次 `atlasOrigin` 換算成世界座標再判定。

早期版本把這些障礙物全部塞進關卡層級的 `stage.colliders`（世界座標），
每加一個都要手動算 `atlasOrigin + local`——**這是 v13.2.2 一次真實線上
事故的根因**：room_05 南側入口的水面 collider 手算 atlasOrigin 時算錯
240 個單位，玩家一走進房間就卡在 collider 裡出不去。改成 `terrainCollidersLocal`
之後，資料端只寫 local 座標，換算永遠在 `CollisionSystem.ts` 同一個地方
做一次，這整類 bug 不會再發生。

**只有真正需要「開關」的動態機關**（藤蔓門、裂牆這種會隨遊戲進度變成
可通行/不可通行的）才留在 `stage.colliders`（世界座標＋`colliderActive`
全域狀態），因為那需要跨系統共享同一份開關狀態（`PuzzleSystem`/
`SecretSystem`/`CollisionSystem` 都要讀寫）。純靜態、永遠擋路的地形一律
用 `terrainCollidersLocal`。

### 3.2 怎麼決定要不要加碰撞：P0/P1/P2 優先級

不是把底圖所有細節都變成障礙，目標是「玩家視覺上一眼就判斷不可穿越」
的大型實體：

| 優先級 | 物件類型 | 處理方式 |
|---|---|---|
| P0 | 深色樹叢牆、深水區、高牆、明顯門柱、巨大柱座 | 一定要擋，玩家一眼就會覺得「這裡怎麼走得過去」 |
| P1 | 大型岩石、殘牆、帳篷、木柵、瞭望台、厚重遺跡構造 | 要擋，但拆成 2-4 段短矩形，不要一個大矩形封路 |
| P2 | 小石塊、花朵、矮草、苔蘚、薄水邊、零散裝飾 | **不要加碰撞**，加了只會讓操作卡頓、玩家覺得莫名其妙被擋 |

矩形外擴不要超過美術輪廓約 12-18 世界單位。不規則物件（一叢岩石、一片
不規則樹牆）優先用 2-4 個短矩形沿邊界拼湊，不要用一個跨越整個房間高度
的大矩形——那樣看起來像窄走廊，也很容易不小心把出口或收集品封死。

### 3.3 精準定位技巧：像素連通區域分析

如果有去背的前景圖（`foreground.png`，見第七節），可以直接用程式反推
物件的真實像素位置，不用肉眼猜：

```python
from PIL import Image
import collections

def components(path, min_px=200):
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    px = img.load()
    visited = [[False]*w for _ in range(h)]
    comps = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 10 and not visited[y][x]:
                q = collections.deque([(x, y)])
                visited[y][x] = True
                minx = maxx = x; miny = maxy = y; count = 0
                while q:
                    cx, cy = q.popleft()
                    count += 1
                    minx, maxx = min(minx, cx), max(maxx, cx)
                    miny, maxy = min(miny, cy), max(maxy, cy)
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                        nx, ny = cx+dx, cy+dy
                        if 0<=nx<w and 0<=ny<h and not visited[ny][nx] and px[nx,ny][3]>10:
                            visited[ny][nx] = True
                            q.append((nx, ny))
                if count > min_px:
                    comps.append((minx, miny, maxx, maxy, count))
    return comps
```

這個方法在 room_07 的帳篷抓過一次真的錯誤：肉眼目測的 `tent_midleft` y
座標其實量到的是長椅/木桶的位置，用連通區域分析量帳篷屋頂的真實像素
位置後才發現差了 270 個單位。**沒有去背圖的情況下，直接讀取 `Read` 工具
看房間 webp 圖肉眼比對也可以，但每加一批就要跑第四節的自動化重疊檢查
交叉驗證，不要只信肉眼。**

### 3.4 絕對不能忘記檢查的三件事

1. **跟 collectibles/NPC/spawn 的重疊**：新加的 collider 有沒有剛好蓋住
   一個紫幣、星片、任務物、NPC 位置、房間出生點、或另一個房間傳送過來
   的 `targetSpawnLocal`。蓋住的話那個收集品/位置會變成永遠拿不到/卡住。
   room_07 的帳篷曾經因為抓太寬把 pc19 封死在 collider 裡面，修法是拆成
   多塊留一個小缺口讓收集品剛好落在缺口裡（不要移動收集品本身的座標，
   那是已經存檔相容的資料）。
2. **跟 transition zone 的重疊**：新的地形 collider 不能咬到出口 zone
   太多——即使咬到，只要留下 zone 大部分區域仍然暢通，OR 判定下玩家還是
   走得過去，但如果咬到的範圍剛好包住玩家會站的那個點（例如
   `targetSpawnLocal` 剛好落在出口 zone 邊緣，同時被地形 collider 蓋住），
   就會出現「一走進房間就卡住」的死結。room_08 的 `08_to_07` 出口就因為
   跟門柱 collider 重疊了 36×7 個單位而要把出口 zone 的 y 起點從 1690
   往後移到 1700 才避開。
3. **不要用整圈/整片大矩形封住祭壇/圓環類地板裝飾**——那些是可以站立、
   可以繞行的地面圖案，不是障礙物，只擋外圈明顯突出的石柱/殘牆。

### 3.5 自動化重疊檢查腳本模板

每加一批 collider，跑一次這種腳本（`node -e "..."`，不用另外建檔案）：

```js
function rectsOverlap(a, b) {
  return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y
}
function overlapsPoint(rect, wx, wy) {
  return wx >= rect.x && wx <= rect.x+rect.width && wy >= rect.y && wy <= rect.y+rect.height
}

const terrain = { /* room_id: [[id,x,y,w,h], ...]（room-local 座標） */ }
const points  = { /* room_id: [[label,x,y], ...]（collectible/NPC/spawn 的 local 座標） */ }
const zones   = { /* room_id: [[zoneId,x,y,w,h], ...]（transition.zone） */ }

for (const room of Object.keys(terrain)) {
  for (const [label, x, y] of points[room] || []) {
    const hits = terrain[room].filter(([, tx, ty, tw, th]) => overlapsPoint({x:tx,y:ty,width:tw,height:th}, x, y))
    if (hits.length) console.log('POINT CONFLICT', room, label, hits.map(h => h[0]).join(','))
  }
  for (const [zid, zx, zy, zw, zh] of zones[room] || []) {
    for (const [id, x, y, w, h] of terrain[room]) {
      if (rectsOverlap({x:zx,y:zy,width:zw,height:zh}, {x,y,width:w,height:h})) {
        console.log('ZONE CONFLICT', room, zid, 'vs', id)
      }
    }
  }
}
```

沒有輸出＝乾淨。**這比肉眼檢查快、也比肉眼可靠**，這幾輪凡是跳過這一步
直接上線的，事後都證實至少踩到一個坑。

---

## 四、移動與碰撞系統契約

- `CollisionSystem.moveCircleWithCollision()`：子步進（每段最多 6 世界
  單位），每一步先試對角線整體位移，被擋住才退回分軸各自嘗試——沿牆角
  能自然滑動，高速移動也不會一次跨過薄 collider。玩家跟敵人共用這套。
- 敵人（`AdventureCombatController`）現在也會真的檢查房間碰撞
  （`moveEnemyWithCollision`，`allowTransitionOverlap=false`）——早期版本
  完全沒有這段，敵人可以直接穿牆穿水貼臉，2026-08-20 才補上。
- 出口 zone 判定用「hitbox 跟 zone 有重疊就算」（`rectsOverlap`），不是
  「hitbox 要整個塞進 zone」（`fitsInside`）——玩家 hitbox 半徑放大後，
  後者會變成要站得很精準才能觸發，手機搖桿很難對準。`walkableBoundsLocal`
  本身仍然用 `fitsInside`（那是房間本體範圍不是通道，不需要放寬）。
- 換房 fade（0.18 秒）跟結算 fade（0.28 秒）期間鎖輸入，`RoomSystem`/
  `AdventureGame` 的 `pendingFinishWon`/`isFinalizingStage` 各自管一段。

---

## 五、顯示尺寸與 hitbox 公式（`forestRuins01VisualTuning.ts`）

房間世界座標是 1080×1920，鏡頭 cover-fit scale 約 0.455（手機螢幕上），
**任何顯示尺寸常數都要先換算「螢幕上實際幾 px」再判斷合不合理**，不要
只看世界單位的數字大小：

```
screen_px ≈ world_units × 0.455
```

- **英雄**：`getAdventureHeroRenderHeight()` = `clamp(round(getHeroRenderHeight(heroId) * 2.75), 180, 220)`，螢幕上約 82-100px。
- **NPC**：固定 210（`FOREST01_ADVENTURE_DISPLAY.npcHeight`）。
- **敵人**：`getAdventureEnemyRenderHeight(baseHeight)` = `clamp(round(baseHeight * 1.1 + 30), 70, 220)`，`baseHeight` 是 `EnemyTypeDef.spriteHeight`（`src/arena/enemies.ts`）。
  - ⚠️ **這個公式加新敵人時務必先算一遍實際會落在哪個數字**，2026-08-20
    出過一次真事故：舊公式是 `clamp(round(baseHeight*1.15), 150, 230)`，
    森林遺跡實際會出現的敵人（slime=44、goblin 系列=106-114）套進去全部
    低於下限 150，導致史萊姆跟哥布林被夾成同一個尺寸，體型差異完全消失。
    新公式在這個範圍內能正常展開（slime≈78、goblin≈147-155），但如果
    之後新增的敵人 `spriteHeight` 落在很極端的區間，還是要重新驗算 clamp
    範圍夠不夠用，不要照抄數字就假設一定沒事。
- **收集品**（`FOREST01_DISPLAY_HEIGHT`，`forestRuins01Art.ts`）：紫幣 65、
  星片 90、寶箱 130、任務道具 85——這些數字是配合上面英雄/NPC 尺寸一起
  放大過的，如果之後又調整英雄尺寸，記得收集品跟拾取距離
  （`CollectibleSystem.ts` 的 `PICKUP_DIST_BY_KIND`）要一起檢查，不要顧此
  失彼（拾取距離是給玩家「碰到看起來的圖案」的容錯，圖案變大距離沒跟著
  變大會變成「明明看起來碰到了但撿不到」）。
- **互動距離**（`InteractionSystem.ts`）：NPC 56、火盆 64、裂牆 60——同樣
  是配合放大後的顯示尺寸調的手機搖桿容錯值。

---

## 六、迷你地圖（`MiniMapHud.tsx`）

### 6.1 絕對不能用 `atlasOrigin` 排版面

`atlasOrigin` 只是背景圖存在離屏 atlas 貼圖裡的技術座標，**跟玩家在遊戲
裡實際往哪個方向走完全無關**。這是 2026-08-20 一次真的走過的坑：
room_02 在 atlas 上畫在 room_01 右邊，但玩家從 room_01 走到 room_02 其實
是往「上」走。用 atlasOrigin 排出來的地圖使用者完全看不懂。

### 6.2 正確做法：從 transition zone 反推方位，BFS 排版

每個 `RoomTransitionDef.zone` 貼在房間 local 座標的哪一邊，就代表那個
出口通往哪個方向：

```ts
function transitionDirection(zone, roomSize): 'N'|'S'|'E'|'W' {
  const cx = zone.x + zone.width/2, cy = zone.y + zone.height/2
  const d = { N: cy, S: roomSize.height-cy, W: cx, E: roomSize.width-cx }
  return (Object.keys(d) as const).reduce((a, b) => d[a] <= d[b] ? a : b)
}
```

從 `stage.rooms[0]`（關卡起點）當原點做 BFS，每條 transition 依方向把
目標房間放進下一格（N: row-1, S: row+1, E: col+1, W: col-1），畫出來的
地圖才會是「入口在最下面，一路往上走，中途分岔往左/右」這種跟玩家實際
移動方向一致的樣子。

### 6.3 UI 模式：本地窗口 + 展開全圖（不是常駐大面板）

- **本地窗口**（預設常駐）：固定像素大小（不是跟著地圖內容量身放大），
  viewBox 是一個固定尺寸的窗口（例如 3×3 格），**置中在玩家目前房間**，
  隨玩家移動即時跟著移動——不是整張地圖縮小塞進小窗，是像遊戲鏡頭一樣
  「只看得到周圍」。
- **點一下展開成全圖**：半透明背景遮罩 + 置中面板，viewBox 是全部內容的
  邊界，看得到目前為止走過的所有房間。
- **兩種模式都只顯示 `discoveredRoomIds` 裡的房間**——沒走過的房間完全
  不出現（連淡淡的輪廓都不要），連線（走廊）也要求兩端房間都探索過才
  顯示，不要提前爆雷還沒去過的區域長怎樣、怎麼連。
- **面板尺寸算法陷阱**：地圖內容形狀不固定（森林遺跡是一路往北的窄長
  條，別的關卡可能是方形或別的形狀），**用「寬度」反推高度會爆版**
  （螢幕給多寬就撐多高，窄長條地圖算出來的高度會遠超過螢幕實際高度）。
  正確做法是用「高度」當基準（設 `max-height` 上限），寬度用 `aspect-ratio`
  自動反推——內容窄的地圖，寬度自然也窄，不會爆版。這個容器一定要是
  `flex` 容器的子項（`align-items` 不是 `stretch`），不然 block 元素的
  預設寬度行為會蓋掉 aspect-ratio 反推寬度的效果。
- **迷你地圖跟遊戲主狀態刷新是分開的兩件事**：`AdventureGame.emitHud()`
  不是每幀都呼叫，只在特定事件觸發（收到道具、互動提示變化……）。
  **換房間一定要無條件呼叫一次 `emitHud()`**，不能只在「第一次發現房間」
  這個分支才呼叫——2026-08-20 抓到一次 bug：`onRoomEntered()` 只有首次
  發現才觸發 `showToast()`（順便觸發 emitHud），回到已探索過的房間完全
  沒有東西會刷新 HUD，玩家換房間後迷你地圖的目前位置標記還停在上一個
  房間，要等到某個不相關的動作才會順便刷新。

### 6.4 房間 id 大小寫要對齊

`ROOM_LABELS` 這類查表用的 key 一定要跟 `forestRuins01.ts` 實際的
`room.id` 完全一致（含大小寫）——`room_03a`/`room_06a` 是小寫，曾經有
外部草稿寫成 `room_03A`/`room_06A` 大寫，查不到就會 fallback 回
`room.name` 顯示完整房名而不是設計好的短標籤，不會報錯但結果不對，
容易漏看。

---

## 七、前景遮擋層（`foreground`/`foregroundPiecesLocal`）

### 7.1 絕對不能用固定 zIndex

前景圖（門樑、拱門上緣、帳篷屋頂這類該蓋住角色的物件）**不能整張圖用
固定 zIndex 蓋在角色上面**——這個引擎全部角色/NPC/敵人都是用
`zIndex = 自己的 y 座標` 動態排序（Y-sort），固定 zIndex 會讓玩家不管站
在物件前面還後面都被蓋住，變成「角色被切一半」的視覺 bug（2026-08-20
真的線上事故）。

### 7.2 正確做法：依獨立物件切塊，各自用底部 y 座標排序

`RoomDef.foregroundPiecesLocal?: AdventureRect[]`——把前景圖依每個獨立
物件（每頂帳篷、每根門樑）切成多個裁切區塊（Pixi `Texture` 的 `frame`
裁切，同一張來源圖不用另外存檔），每一塊各自用自己的**底部 y 座標**當
`zIndex`：

```ts
fg.zIndex = room.atlasOrigin.y + piece.y + piece.height
```

玩家腳的 y 還沒超過物件底部時，物件蓋住玩家（走到物件後面/上方）；玩家
y 超過之後換玩家蓋住物件（走到物件前面）——這樣才會隨玩家實際位置動態
切換前後，不是整片固定遮擋。一個房間如果有多個獨立前景物件（例如 4 頂
帳篷各自在不同深度），一定要切成多塊各自排序，不能共用一個 zIndex。

### 7.3 排序線怎麼定

排序基準點用去背圖裁切區塊本身的下緣（`rect.y + rect.height`），這是
一個近似值，不保證每個物件都完美，實測後如果某個物件的遮擋時機感覺
太早或太晚，調整那一塊的 `rect` 範圍（尤其是下緣 y）就好，不用整套重做。
🐞 debug overlay 的紫色 y-sort 基準線（見第八節）可以直接拿來對照。

---

## 八、Debug Overlay

`AdventureGame.ts` 的 🐞 按鈕（`toggleDebugArtMode()`）疊出：

| 顏色 | 內容 |
|---|---|
| 綠色（半透明填色） | `walkableBoundsLocal` |
| 橘色（半透明填色） | `terrainCollidersLocal` |
| 紅色 | 動態 `stage.colliders`（藤蔓門/裂牆） |
| 青色（半透明填色） | transition zone |
| 黃色圓 | NPC 互動範圍 |
| 藍色圓 | 謎題火盆互動範圍 |
| 綠色圓 | 收集品拾取範圍 |
| 白色方框 | 玩家實際碰撞判定形狀（正方形，不是圓——見下） |
| 黃色圓（角色身上） | 碰撞半徑參考，**只是視覺參考，實際判定形狀是白色方框那個正方形**，對角線角落請以白色方框為準 |
| 紅色十字 | 玩家腳底 world position 錨點 |
| 紫色線 | y-sort 排序基準線，應該穿過腳底 |
| 藍色橢圓 | 接地陰影校準範圍，不參與碰撞 |

新增房間/新增碰撞時，先開 🐞，沿著入口→左邊界→右邊界→互動物件→戰鬤區
四角→出口這條路線走一遍，確認：
- 碰到水/樹叢/牆/柱/帳篷應該停下或沿另一軸滑動；碰到花朵/小石/苔蘚應該
  可以直接穿過。
- 出口 zone（青色）中央沒有被地形 collider（橘色）蓋住太多。
- 互動範圍（黃/藍/綠圓）沒有被大型 collider 整個包住變成靠近不了。

---

## 九、其他已知的坑（快速索引）

- **收集品/NPC/敵人的世界座標要用 `atlasOrigin + local` 反推**，才知道
  它們屬於哪個房間、跟哪個房間的地形碰撞比對——不要直接拿世界座標數字
  去跟另一個房間的 local 座標比較，那是兩套不同的參考系。
- **敵人靜態立繪（沒有逐幀動畫，只有一張插畫）跟逐幀動畫敵人共用同一套
  `getAdventureEnemyRenderHeight()`**，不要再另外乘一個特殊倍率——如果
  發現某個靜態立繪敵人比例看起來還是怪怪的，先假設是 `spriteHeight`
  這個原始數值本身跟其他敵人不成比例，不要又加一個特殊 case 補丁。
- **任務用的敵人跟正式戰鬤區共用同一套敵人生成/AI/傷害邏輯**
  （`AdventureCombatController.spawnHostileEnemy`），但如果修改
  `update(dt)` 的觸發條件，記得任務敵人不會設 `activeZone`——判斷「AI/
  攻擊要不要 tick」用「有沒有 enemies 存在」，不要用「有沒有 activeZone」，
  不然任務生出來的敵人會變成不會動也打不到的裝飾品（2026-08-20 真事故）。
- **對話/劇情開始時要主動清空 `moveDir`**——玩家走進對話/劇情 trigger 時
  手指通常還按著搖桿，state 切離 explore 後搖桿的 pointermove/up 事件
  如果沒有正確處理，殘留的移動方向會在對話結束、state 切回 explore 的
  瞬間直接套用，變成「講完話自動往前走」。搖桿的 `pointermove`/`up`/
  `cancel` 事件不能只在 explore/combat 才綁定，要一直綁著才能正確收掉
  進行中的 drag。
- **任務完成後的閒聊台詞要用專屬 `postCompleteDialogueId`**，不要偷懶
  沿用 `inProgressDialogueId`（那句話通常還在講任務進行中的內容，任務
  明明完成了卻一直聽到「還沒找到」會很奇怪）。

---

## 十、第二個 Room Transition 關卡（snowfield_2_1，2026-08-21）新增了什麼

forest_1_1 是第一個 Adventure 關卡，很多系統（NPC/謎題/秘密/收集品/紫幣
星片星級）都是照著它一次到位。雪原 2-1「雪線之外」是第二個，資料來源是
外部交付包（含 `room_cut_spec.json`/`entrance_exit_table.json`/
`story_triggers.json`/`encounters.json`/`hazards.json`/`star_conditions.json`
＋正式房間圖），過程中暴露出幾個原本只服務 forest_1_1、沒有真的通用化的
地方，這裡記錄下來，第三個關卡不用重新踩一次：

- **`MiniMapHud.tsx` 原本整個檔案寫死 import `FOREST_RUINS_01_STAGE`**，
  房間幾何/走廊/標籤全部是模組層級常數，只有森林遺跡能用。改成吃
  `stage: AdventureStageDef` prop，內部用 `useMemo` 依 stage 重新算；
  `ROOM_LABELS`/`STAGE_MAP_TITLES` 改成 `Record<stageId, Record<roomId,label>>`
  兩層——不同關卡的房間 id 很可能撞名（兩關都有 `room_01`/`room_02`），
  不拆命名空間會互相蓋掉短標籤。`AdventureStageScreen.tsx` 用
  `getAdventureStageDef(config.stageId)` 解出 stage 物件傳進去。
- **`StageExit.ts` 原本把最終房間 id 寫死成 `FINAL_ROOM_ID = 'room_09'`**
  （forest_1_1 專用）。改成 `ExitDef.roomId?: string`，省略時 fallback
  回 `'room_09'`（forest_1_1 完全不用改），新關卡在 `exit` 裡直接給
  `roomId` 就好。
- **星級判定原本整個綁死紫幣/星片門檻**（`stage.starThresholds`）。新增
  `AdventureStageDef.starConditions?: [StarCondition,StarCondition,StarCondition]`
  ——直接複用 `campaignTypes.ts` 既有的 `StarConditionType`（跟舊
  ArenaGame 那套星星共用同一份型別／同一份 UI 顯示文字來源，不用另外發明
  一組），`AdventureGame.commitStageFinish()` 有 `starConditions` 就優先
  用它（依序檢查，中途沒過就停，跟 CampaignStage 星星「後面建立在前面」
  同一套邏輯），目前只認得 `clear`/`hp_above`/`avoid_skill` 三種 type，
  其餘 type 一律視為通過（不會反而卡關，只是還沒接判定邏輯）。
- **新增環境危害系統**（`HazardZoneDef`，room-local 座標，只在
  `AdventureGame.getActiveHazardZone()` 查詢時加一次 atlasOrigin，跟
  `terrainCollidersLocal` 同一套原則）。目前只實作了 `ice_floor`
  （`MovementSystem.ts` 用速度緩慢趨近目標值取代瞬間貼齊，做出滑行手感，
  `params.slideStrength` 控制回應速度）。設計文件列了 8 種 Hazard，**故意
  不要一次把型別聯集全加上去**——每種語意都不一樣，沒有真的關卡用到就先
  空殼擺著，之後變成沒人維護的死型別，等真的有關卡用到再照這個模式擴充。
- **新增房間 local 座標版的劇情觸發**（`StoryTriggerDef` + 新檔案
  `StoryTriggerSystem.ts`），取代 forest_1_1 用的舊 `TriggerDef`（那個
  `area` 是手動算好的 atlas 世界座標，森林遺跡沿用的舊模式）。新系統只
  檢查目前 `activeRoom`，`roomId` 對不上直接跳過，有 `area` 才比對範圍
  （沒有 `area` 代表「進這個房間就算觸發」）。實際對話內容還是沿用既有
  `stage.dialogues`（id 跟 `StoryTriggerDef.id` 相同）＋
  `DialogueController`，不是重新發明播放機制。
- **新增關卡內 EXP→升級→三選一 Build**（`AdventureStageDef.inStageBuild`）。
  直接複用 Roguelite 既有的 `src/arena/cards.ts`（`ArenaCard`/
  `ArenaCardEffect`/`pickThreeCards`）跟 `DiceUpgradeOverlay.tsx`——那個
  UI 元件本身就是純 React、自己擲骰自己生三張卡，跟 `ArenaGame` 沒有耦合，
  直接搬進 `AdventureStageScreen.tsx` 用，不用重寫一份選卡 UI。
  `AdventureGame.onEnemyKilled()` 累積 `buildExp`，達門檻就把 `state` 切成
  新增的 `'build_pick'`（跟 dialogue/cutscene 一樣會鎖住 movement/combat
  tick），選完卡呼叫 `chooseBuildCard()` 套用 `bonusDamage`/
  `atkCooldownMult`/`moveSpeedMult`/maxHp 加成、切回原本的 state，並馬上
  再檢查一次有沒有下一級要選（避免一次擊殺跨兩級漏算）。
- **新增精英詞綴 + 專屬技能**（`CombatWaveDef.isElite`）。精英只是體型/
  血量倍率＋金色 tint，不需要專屬美術；`frost_wolf` 精英額外解鎖 leap
  技能狀態機（cooldown→telegraph 原地蓄力紅光預警→lunge 高速衝刺，命中
  才算數），命中時呼叫 `AdventureGame.recordSkillHit(skillId)`，給
  `avoid_skill` 星星條件讀取次數用。
- **交付包給的 `walkableBoundsLocal` 沒有跟南/北 transition zone 重疊，中間
  留了 70~100 單位真空帶**（東西向剛好压線通過，南北向明顯漏檢查）——這正是
  第九節「自動化重疊檢查腳本」要抓的那種問題，外部交付包不會自動幫你驗過。
  這次改成整個房間統一收窄成「四邊留 60 單位視覺餘裕」的滿版可走範圍
  （反正 v1 美術包本身也還沒有逐房终形碰撞資料，沒有精細邊界可對齊），
  之後有真正的地形碰撞美術再細分縮小。**任何外部關卡設計包，就算裡面已經
  附了「已驗證」的 checklist，也要照第九節的腳本自己重跑一次再寫進
  程式碼**，不能因為包裝得很正式（JSON schema 工整、附了 Claude Code 專用
  指令文件）就跳過驗證。

---

## 十一、只有 Room 圖、沒有 room_cut_spec.json 時怎麼做（snowfield_2_2，2026-08-21）

2-2「失聯哨站」這次交付只有 8 張正式 Room 圖，沒有附精確座標 JSON——房間
拓撲/連接方向/劇情/戰鬤/Hazard/星星條件全部只能從主線設計文件（純文字
表格＋敘述，沒有 x/y 數字）取得。做法：

- **連接方向照文件表格，實際 local 座標套用 snowfield_2_1 已經驗證過的
  標準模板**（`EAST`/`WEST`/`NORTH`/`SOUTH` 四個固定 zone 矩形＋對應的
  `targetSpawnLocal`），不用每個房間重新發明一組數字。`walkableBoundsLocal`
  直接沿用上一節修好的「四邊留 60 單位」滿版可走範圍，不會重演真空帶問題。
- **同一個房間往同一個方位有兩個不同出口時**（這次 room_04 的東側同時通往
  room_06 跟 room_04a；room_06 的西側同時通往 room_04 跟 room_05），改用
  `EAST_UPPER`/`EAST_LOWER`（或 `WEST_UPPER`/`WEST_LOWER`）把同一側切成
  上下兩個獨立 zone，**不能讓兩個出口共用同一個矩形**——`RoomSystem.update()`
  是線性掃過 `room.transitions` 陣列，同矩形時永遠只吃到陣列裡先出現的
  那個，另一個出口會變成走不進去、但也不會報錯，很容易忽略掉，一定要在
  自動化驗證腳本裡加一條「同房間 transitions 兩兩之間不能互相 overlap」
  的檢查（見這次跑的腳本）。
- **atlas 位置（world 座標）就單純排成規律 grid**（這次是 4x2），不用刻意
  排成「Y 型」——atlas 排版跟玩家實際移動方向完全無關（第五節已經講過），
  刻意排成 Y 字形只是白費工夫。
- **新的 Hazard kind（`falling_icicle`）需要獨立計時器/Pixi 視覺物件時，
  獨立成一個新 System**（`HazardSystem.ts`），不要塞進 `MovementSystem.ts`
  ——`ice_floor` 只是移動修正，沒有自己的物件；`falling_icicle` 有預警圈
  的生命週期（每幀 tick、超時判定命中、銷毀），語意上是完全不同的一類
  行為，硬塞在一起會讓 `MovementSystem` 職責混亂。
- **星星條件不夠用時，優先看能不能借用既有 `StarConditionType`**——
  「找到隱藏房間」直接借用既有的 `'custom'` type + `targetId` 存房間 id
  （`AdventureGame.checkStarCondition()` 判斷 `areasDiscovered.has(targetId)`），
  「時限內通關」借用既有的 `'time_under'` type + `this.elapsed`，都不用新增
  `StarConditionType` 成員。

---

## 十二、雪原篇全 10 關完成（snowfield_2_3～2_10，2026-08-21）新增了什麼

使用者事後提供了重新繪製、跟官方 `room_cut_spec.json` 拓樸正確對應的整批
90 張 Room 圖（含 2-1/2-2 的重繪版），一次把 2-3～2-10 全部補齊，雪原篇
10 關全數轉成 Adventure。這輪規模最大，記錄下來的教訓也最多：

- **同檔名覆蓋舊圖內容時，一定要加版號 query string**——雪原篇這次是拿
  「內容變了但檔名完全沒變」的新圖去覆蓋 `public/assets/adventure/
  snowfield_2_X/rooms/roomXX.webp`（跟 forest_1_1 每次改圖就換資料夾名稱
  的慣例不同）。這正好是先前修過的 Cloudflare 邊緣快取問題
  （`feedback_dicehero_cdn_edge_cache_frames`）的同一個成因：`Assets.load()`
  跟後續 `this.tex(room.background)` 查表都要用 `versionedAsset()` 包過的
  字串，兩邊必須用同一個字串當 key，只加在其中一邊會找不到材質。
- **同一個房間往同一方位有兩個出口的情況比想像中常見**——這次 10 關裡
  room_04/room_05/room_06 這類「匯口」房間出現了 6 次以上的 dual-same-rect
  衝突（2-3 room_04、2-6 room_05、2-8 room_04、2-10 room_05…），全部用
  `EAST_UPPER`/`EAST_LOWER`/`WEST_UPPER`/`WEST_LOWER`（上下各留 360 高度）
  分帶解決，是目前最穩定可重複套用的手法。
- **官方資料裡沒給的 skillId／hazardId 可以自己補**——`hits_under`
  （2-7「被重砸技能命中」）、`avoid_hazard`（2-6/2-8）這幾個 star
  condition 官方 JSON 只給了 value 跟 description，沒給 skillId/hazardId，
  是因為那個技能/危害本身也是這次才設計出來的（官方文件本來就沒有實作
  細節）。只要跟 `AdventureCombatController.ts`/`HazardSystem.ts` 實際用的
  key 對上，這種「文件留白、實作端自己訂 key」是合理的補完，不是瞎猜。
- **精英技能不是每個都適合用同一種「衝刺」動作**——frost_wolf 的 leap／
  frost_knight_captain 的 ice_charge 是位移型（`updateEliteChargeSkill`），
  但 snow_troll 的「重砸」是原地 AOE、ice_dragon 的「冰息」是原地扇形，
  兩者都不該讓 Boss 移動位置。抽成 `ELITE_SKILL_CONFIG: Record<typeId,
  {skillId, kind}>`，`kind: 'charge'|'aoe'|'cone'` 三選一分派，比每個 Boss
  各寫一份幾乎一樣的狀態機好維護。
- **story_triggers.json 的 `combat_clear`／`boss_clear` type 不能套用
  既有的「進房間就播」邏輯**——那是「戰鬤清空後才播」，跟 room_enter/
  area_enter/boss_enter 語意不同。加了 `StoryTriggerDef.
  requiresCombatCleared?: string`（存對應 CombatZoneDef.id），
  `StoryTriggerSystem` 多檢查一次 `g.clearedCombatZones.has(...)`，不用另外
  發明新的觸發系統。
- **speaker 前綴解析抓不到就直接寫死中文**——`npc_<enemyId>`/
  `boss_<enemyId>` 這個慣例（`DialogueController.resolveSpeaker()`）假設
  `<enemyId>` 對得上 `enemies.ts` 的真實 id，但 2-8 官方資料用的是
  `boss_frozen_general`，實際 Boss 是複用的 `frost_knight_captain`，兩者
  對不上。與其硬凹規則相容，直接在對話資料裡把 speaker 寫成字面中文
  「冰封將軍」（resolveSpeaker 對非 npc_/boss_ 前綴的字串會原樣顯示），
  比為了單一個特例改動共用解析邏輯更乾淨。
- **純視覺、沒有星星條件依賴的 Hazard（whiteout）可以大膽簡化**——先確認
  `star_conditions.json` 有沒有引用這個 hazard 再決定實作精細度；whiteout
  沒有任何星星條件用到它，所以視覺效果用四個矩形拼出方形暗角（不是真正
  的圓形漸層遮罩）完全足夠，不用為了視覺精緻度另外做 canvas 漸層貼圖。
- **`AdventureStageDef.spawn` 一定要是世界座標，不是 room_01 的 local
  座標**——這是這批上線後使用者實測才抓到的真事故（2026-08-21）：10 關
  裡全部寫成 `{ x: 540, y: 1640 }`（room_01.spawnLocal 的原始值），只有
  room_01.atlasOrigin 剛好是 `{0,0}` 的關卡（local 恰好等於 world）沒事，
  其餘 6 關 room_01 貼在 atlas 上不是原點，玩家一開場的世界座標就落在
  `updateRoomMask()` 裁切範圍外，整個玩家 sprite 被 mask 蓋掉、完全看不到
  ——症狀是「英雄沒有出現」，很容易誤判成碰撞或圖片問題，但其實跟兩者都
  無關。**正確算法是 `spawn = room_01.atlasOrigin + room_01.spawnLocal`**，
  寫完關卡後務必手動核對這一個值（不要照抄其他關卡的 `{540,1640}`），
  而且要記得這個值不會被本文件第三節的自動化重疊驗證腳本抓到——那組腳本
  只驗證房間之間的 local 幾何關係，沒有單獨驗證 stage.spawn 是否等於
  room_01 的世界座標，這是腳本本身的已知缺口，之後應該補上這一條檢查。

---

## 十三、部署與版號

照 `CLAUDE.md` 既有規則：改動前先 bump `package.json` 的 `version`
（patch/minor/major 對應小修正/新功能/重大架構變動），`npx tsc -b` 過、
`npm run build` 過，才用
`npx wrangler pages deploy dist --project-name diceherorpg --branch=DiceHeroRpg`
部署（一定要帶 `--branch=DiceHeroRpg`，省略會落地變成 Preview 不會更新
正式站）。**除非使用者明確說可以，否則不要主動 commit**——先讓使用者在
手機上實測過，確認沒問題才 commit/push。
