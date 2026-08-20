# ASTERVOW Adventure Map — Tiled Workflow

森林遺跡 01 是第一張切換到正式 Tiled authoring pipeline 的探索關卡。

## 核心原則

**Tiled 管位置；TypeScript 管玩法。**

- Tiled `.tmj`：可走範圍、碰撞框、出生點、換房區、NPC 位置、事件區、戰鬥區、火盆、收集品、秘密區、任務生怪區、關卡出口。
- `forestRuins01MapSource.ts`：房間名稱、換房目標、解鎖旗標、對話、戰鬥波次、獎勵、收集品種類、任務規則。
- `compileAdventureMap.ts`：把房間 local 座標轉成現有 AdventureGame 使用的 atlas/world 座標。

不要再手算 `atlasOrigin + local`，也不要在 `stages/forestRuins01.ts` 寫玩法座標。

## 檔案位置

```text
src/adventure/maps/
├─ forestRuins01MapSource.ts       # 玩法語意，不放座標
├─ compileAdventureMap.ts          # local -> runtime world compiler
└─ tiled/
   ├─ buildTiledAdventureMapSource.ts
   └─ forest_1_1/
      ├─ room_01.tmj
      ├─ room_02.tmj
      ├─ room_03.tmj
      ├─ room_03a.tmj
      ├─ room_05.tmj
      ├─ room_06.tmj
      ├─ room_06a.tmj
      ├─ room_07.tmj
      ├─ room_08.tmj
      └─ room_09.tmj
```

## 在 Tiled 編輯

1. 安裝 Tiled Map Editor。
2. 直接開啟需要修改的 `.tmj`，例如 `room_05.tmj`。
3. Background layer 會顯示目前 1080x1920 房間底圖。
4. 開啟/關閉 Object Layer，直接用滑鼠拖曳或縮放物件。
5. 儲存 `.tmj`。
6. 執行：

```bash
npm run test:maps
npm run build
```

## 固定 Layer 名稱

| Layer | 物件形式 | 用途 |
|---|---|---|
| `Background` | Image Layer | 房間底圖，僅供編輯時對位 |
| `Walkable` | Rectangle | 玩家主要可走區，物件固定叫 `walkable` |
| `Entry` | Point | 房間預設 spawn 與各入口落點 |
| `Transition` | Rectangle | 踩入後換房 |
| `Collision` | Rectangle | 樹、石柱、水面、帳篷等不可通過區 |
| `NPC` | Point | NPC 中心位置 |
| `Trigger` | Rectangle | 劇情/事件觸發區 |
| `Combat` | Rectangle | 戰鬥觸發區 |
| `Puzzle` | Point | 火盆等解謎互動點 |
| `Collectible` | Point | 紫幣、星星碎片、寶箱、任務道具 |
| `Secret` | Rectangle | 假牆、可破壞牆等秘密區域 |
| `Quest` | Rectangle | 支線任務敵人生成範圍 |
| `Exit` | Point | 關卡最終出口，固定叫 `stage_exit` |

Layer 名稱不能自行改名，compiler 會直接拒絕錯誤格式。

## Entry 的設計

每個房間至少有：

```text
Entry
└─ spawn
```

如果房間可以從不同方向進入，再增加具名 Entry，例如：

```text
Entry
├─ spawn
├─ from_room_03
└─ from_room_06
```

Transition 的 TypeScript 設定只指定 `targetEntryId`，真正落點座標由 Tiled Point 決定。

因此要調整「從 room_03 進 room_05 時角色出現的位置」，只需要在 `room_05.tmj` 拖動 `Entry/from_room_03`，不需要改任何 x/y 程式碼。

## 修改碰撞的正確方法

例如 room_05 水面碰撞：

1. 開 `room_05.tmj`。
2. 顯示 `Collision` layer。
3. 直接拖動/縮放 `terrain_r05_water_*` 矩形，讓矩形符合橋面以外的水區。
4. 儲存。
5. 跑 `npm run test:maps` 與 `npm run build`。

不要再到 `forestRuins01MapSource.ts` 改碰撞座標。

## 新增物件

Tiled 與 TypeScript 必須使用相同 ID。

例如新增紫幣：

1. Tiled 的 `Collectible` layer 新增 Point，name 設為 `pc21`。
2. `forestRuins01MapSource.ts` 對應房間加入：

```ts
{ id: 'pc21', kind: 'purple_coin' }
```

只有 Tiled 沒有 TypeScript 定義，或只有 TypeScript 沒有 Tiled 物件，compiler 都會報錯。這是刻意的：避免畫面有物件但遊戲沒邏輯，或程式有物件但位置不存在。

## 不要做的事

- 不要在 `stages/forestRuins01.ts` 寫世界座標。
- 不要手算 5400x3840 atlas 座標。
- 不要把碰撞寫成「看背景圖猜一個 x/y」後直接 commit。
- 不要改 Tiled Object name 卻忘記同步 TypeScript ID。
- 不要用一張新的 AI 完整背景直接覆蓋後，仍沿用舊 Collision；背景改版後必須在 Tiled 重新檢查 Object Layer。

## 下一階段

目前 Tiled 先接管「空間與碰撞」，正式美術仍是每房間一張 Background image。

之後要進一步做到更接近 Guardian Tales 的地圖，可在不破壞目前玩法資料的前提下逐步加入：

```text
Ground Tile Layer
GroundDetail Tile Layer
BackProps Object/Tile Layer
YSort Props Layer
Foreground Tile/Object Layer
FX Layer
Elevation Layer
```

先把碰撞與事件完全可視化、可控，再把背景圖拆成 Tileset；不要兩件事一起重做。
