import type { AdventureStageDef } from '../adventureTypes'
import { BRIDGE_COMBAT_WAVES, GOBLIN_CAMP_COMBAT_WAVES, QUEST_FLOWER_BED_ENEMY_ID, QUEST_FLOWER_BED_ENEMY_COUNT } from '../encounters/forestRuins01Encounters'
import { FOREST_RUINS_01_DIALOGUES } from '../dialogues/forestRuins01Dialogues'

/**
 * 森林遺跡 1「迷途的林間入口」（campaign stageId: forest_1_1）。
 *
 * 2026-08-19 Room Transition v2（ASTERVOW Forest01 RoomImplementationPack /
 * RoomCoordinateCheckPack）：換成 10 張直式手機底圖（1080x1920，之前 v1 是
 * 9 張 1280x720 橫向圖，直向手機 contain-fit 後會有大量黑邊，這批圖解決了
 * 這個問題），「林間小徑」跟「女孩岔路」這次拆回兩個獨立房間（v1 曾經合併
 * 成一間）。10 個房間貼在 5400x3840 的離屏 atlas 上（5x2 grid），世界座標＝
 * atlasOrigin + local，跟 v1 是同一套做法。
 *
 * 這次也把三處原本用「實體 collider 物理擋路」的機關（三火盆藤蔓門／哥布林
 * 營地戰鬤／祭壇劇情）改成 RoomTransitionDef.lockedByFlag——出口 zone 本身
 * 沒有變化，只是玩家踩進去時多檢查一個 flag 有沒有達成，沒達成就什麼都不會
 * 發生（原地不動）。這樣「gate 矩形沒對準」頂多變成「還沒解鎖走不過去」，
 * 不會像 v1 連續世界那樣因為座標沒對齊而把玩家憑空卡死——這是這次選這個
 * 方案的主要原因。裂牆（secret02_wall）維持真的可以「打」的秘密機關，但一樣
 * 不再是物理 collider，貼圖純視覺，實際能否進 06A 由 lockedByFlag 判斷。
 *
 * 出口 zone 跟可走範圍的重疊寬度，這次全部先跑過矩形重疊驗證（walkableRect
 * vs 每個 exit 的 triggerRect 都確認有 ≥30 世界單位重疊）才寫進來，不是照
 * 抄這包原始數字——原始數字裡有 2 個出口完全没重疊、3 個重疊不到 20 單位，
 * 已經先修正過。
 */
export const FOREST_RUINS_01_STAGE: AdventureStageDef = {
  stageId: 'forest_1_1',
  world: { width: 5400, height: 3840 },
  spawn: { x: 540, y: 1540 },
  groundColor: 0x1a2e18,

  colliders: [
    // 三火盆謎題的藤蔓門：純視覺（blocksMovement:false），真正的「能不能
    // 過」是 room_05 的 05_to_06 transition 帶的 lockedByFlag。
    { id: 'puzzle_vine_gate', rect: { x: 4760, y: 180, width: 200, height: 40 }, active: true, blocksMovement: false },
    // 森林遺跡廣場的裂牆：一樣純視覺，room_06 的 06_to_06A transition 帶
    // lockedByFlag: 'secret02_wall'（SecretSystem.reveal() 會自動設這個 flag，
    // 用 secret 自己的 id 當 flag 名，不用另外定義）。
    { id: 'secret02_wall', rect: { x: 900, y: 2830, width: 40, height: 180 }, active: true, blocksMovement: false },

    // 2026-08-20：walkableBoundsLocal 每個房間目前都只是一個矩形，跟房間
    // 美術實際的可走區域（拱門柱子、水面、帳篷這種非矩形輪廓）對不上，玩家
    // 回報「可以穿過拱門柱子/走到水上/踩過帳篷」——這裡開始針對幾個明顯的
    // 例子，額外補實體 collider 卡住矩形範圍內「畫面上其實是實體/水面」的
    // 子區域。座標是照 room01/05/07.webp 實際美術肉眼比對出來的，不是精算
    // 出的多邊形，抓大概輪廓、留出美術看起來像通道的地方，不追求像素級精準。

    // room_01 森林入口：入口拱門兩根木柱（atlasOrigin {0,0}）。留中間
    // banner 那個缺口當唯一出入口，跟 spawn {540,1540} 對齊。
    { id: 'terrain_r01_gate_post_l', rect: { x: 340, y: 1480, width: 110, height: 200 }, active: true },
    { id: 'terrain_r01_gate_post_r', rect: { x: 630, y: 1480, width: 110, height: 200 }, active: true },

    // room_05 古老石橋／三火盆：石橋是中間寬、頭尾窄的「橄欖形」步道，
    // 兩側是水面（atlasOrigin {4320,0}）。用 4 段階梯型矩形卡住步道兩側
    // 露出來的水面，中段最寬的地方跟 walkableBoundsLocal 本身已經對齊，
    // 不用額外擋。頭尾兩段的 y 範圍刻意跟 05_to_06／05_to_03 的 transition
    // zone（世界座標 y:90-250／y:1690-1830）留一點距離不重疊——水面
    // collider 蓋到 transition zone 會把玩家卡在踩不進出口判定範圍的窘境。
    // 2026-08-20 修正：top_r／bottom_r 原本寫成 x:4780（世界座標），跟房間
    // 中心線（local x=540／世界 x=4860，跟兩個 transition zone、三個火盆都
    // 對齊在這條線上）不對稱——應該鏡射成 x:5020 才對，寫錯的結果是右側
    // 水面矩形整塊往左多蓋了 240 個單位，剛好蓋住南側入口的重生點
    // （世界座標 4860,1680），玩家從 room_03 走進來直接落在水面 collider
    // 裡面出不去。
    { id: 'terrain_r05_water_top_l', rect: { x: 4440, y: 250, width: 260, height: 150 }, active: true },
    { id: 'terrain_r05_water_top_r', rect: { x: 5020, y: 250, width: 260, height: 150 }, active: true },
    { id: 'terrain_r05_water_uppermid_l', rect: { x: 4440, y: 400, width: 140, height: 250 }, active: true },
    { id: 'terrain_r05_water_uppermid_r', rect: { x: 5140, y: 400, width: 140, height: 250 }, active: true },
    { id: 'terrain_r05_water_lowermid_l', rect: { x: 4440, y: 1270, width: 140, height: 250 }, active: true },
    { id: 'terrain_r05_water_lowermid_r', rect: { x: 5140, y: 1270, width: 140, height: 250 }, active: true },
    { id: 'terrain_r05_water_bottom_l', rect: { x: 4440, y: 1520, width: 260, height: 170 }, active: true },
    { id: 'terrain_r05_water_bottom_r', rect: { x: 5020, y: 1520, width: 260, height: 170 }, active: true },

    // room_07 哥布林營地：四頂帳篷本體（atlasOrigin {2160,1920}），只卡帳篷
    // 布幕的實心範圍，不含門口空地。midleft 寬度故意收窄到 140（不是目測的
    // 完整帳篷寬），因為 pc19（世界座標 2480,3180）就貼在這頂帳篷右側，
    // 早期版本卡到整頂帳篷寬度會讓這枚紫幣被封死在 collider 裡面撿不到。
    { id: 'terrain_r07_tent_topleft', rect: { x: 2320, y: 2260, width: 220, height: 200 }, active: true },
    { id: 'terrain_r07_tent_topright', rect: { x: 2800, y: 2290, width: 200, height: 180 }, active: true },
    { id: 'terrain_r07_tent_midleft', rect: { x: 2310, y: 3090, width: 140, height: 180 }, active: true },
    { id: 'terrain_r07_tent_bottomright', rect: { x: 2840, y: 3320, width: 240, height: 220 }, active: true },

    // room_08 古老祭壇：跟 room_01 同一套木門素材（同樣兩根木柱+banner，
    // 這次在房間底部當入口），加上祭壇拱門兩側各一根石柱（atlasOrigin
    // {3240,1920}）。石柱 y 範圍跟 08_to_09 transition zone（世界座標
    // y:2010-2130）在 y 軸有重疊但 x 軸完全不重疊，不影響出口判定。
    { id: 'terrain_r08_gate_post_l', rect: { x: 3596, y: 3437, width: 110, height: 180 }, active: true },
    { id: 'terrain_r08_gate_post_r', rect: { x: 3856, y: 3437, width: 110, height: 180 }, active: true },
    { id: 'terrain_r08_arch_pillar_l', rect: { x: 3499, y: 2074, width: 90, height: 230 }, active: true },
    { id: 'terrain_r08_arch_pillar_r', rect: { x: 3974, y: 2074, width: 90, height: 230 }, active: true },
  ],

  rooms: [
    {
      id: 'room_01', name: '森林入口',
      atlasOrigin: { x: 0, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room01.webp',
      walkableBoundsLocal: { x: 180, y: 220, width: 720, height: 1460 },
      spawnLocal: { x: 540, y: 1540 },
      transitions: [
        { id: '01_to_02', zone: { x: 450, y: 120, width: 180, height: 130 }, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 1600 } },
      ],
    },
    {
      id: 'room_02', name: '林間小徑',
      atlasOrigin: { x: 1080, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room02.webp',
      walkableBoundsLocal: { x: 180, y: 180, width: 720, height: 1540 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '02_to_03', zone: { x: 430, y: 110, width: 220, height: 120 }, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '02_to_01', zone: { x: 430, y: 1680, width: 220, height: 120 }, targetRoomId: 'room_01', targetSpawnLocal: { x: 540, y: 260 } },
      ],
    },
    {
      id: 'room_03', name: '迷途女孩岔路',
      atlasOrigin: { x: 2160, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room03.webp',
      walkableBoundsLocal: { x: 140, y: 220, width: 800, height: 1460 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '03_to_05', zone: { x: 430, y: 110, width: 220, height: 140 }, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 1680 } },
        { id: '03_to_02', zone: { x: 430, y: 1650, width: 220, height: 150 }, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 260 } },
        { id: '03_to_03A', zone: { x: 70, y: 820, width: 120, height: 220 }, targetRoomId: 'room_03a', targetSpawnLocal: { x: 850, y: 960 } },
      ],
    },
    {
      id: 'room_03a', name: '被遺忘的花圃',
      atlasOrigin: { x: 3240, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room03a.webp',
      walkableBoundsLocal: { x: 120, y: 180, width: 820, height: 1560 },
      spawnLocal: { x: 920, y: 960 },
      transitions: [
        { id: '03A_to_03', zone: { x: 890, y: 820, width: 120, height: 220 }, targetRoomId: 'room_03', targetSpawnLocal: { x: 260, y: 930 } },
      ],
    },
    {
      id: 'room_05', name: '古老石橋／三火盆',
      atlasOrigin: { x: 4320, y: 0 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room05.webp',
      walkableBoundsLocal: { x: 120, y: 220, width: 840, height: 1500 },
      spawnLocal: { x: 540, y: 1710 },
      transitions: [
        { id: '05_to_06', zone: { x: 430, y: 90, width: 220, height: 160 }, targetRoomId: 'room_06', targetSpawnLocal: { x: 540, y: 1650 }, lockedByFlag: 'forest01_vine_gate_open' },
        { id: '05_to_03', zone: { x: 430, y: 1690, width: 220, height: 140 }, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 280 } },
      ],
    },
    {
      id: 'room_06', name: '森林遺跡廣場',
      atlasOrigin: { x: 0, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room06.webp',
      walkableBoundsLocal: { x: 100, y: 180, width: 880, height: 1560 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '06_to_07', zone: { x: 430, y: 100, width: 220, height: 120 }, targetRoomId: 'room_07', targetSpawnLocal: { x: 540, y: 1660 } },
        { id: '06_to_05', zone: { x: 430, y: 1710, width: 220, height: 120 }, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 290 } },
        // x 從 910 往左挪到 870（原本離右邊界只有 50 世界單位，是全關卡最窄
        // 的一段——CameraSystem.ts 為了不裁到這個出口，被迫把可視範圍的裁切
        // 上限壓得很低，畫面因此留白比較多；挪寬到 90 世界單位邊界後可以把
        // 裁切上限拉高，讓畫面填得更滿，見 CameraSystem.ts 開頭註解）。
        { id: '06_to_06A', zone: { x: 870, y: 900, width: 120, height: 220 }, targetRoomId: 'room_06a', targetSpawnLocal: { x: 260, y: 960 }, lockedByFlag: 'secret02_wall' },
      ],
    },
    {
      id: 'room_06a', name: '隱藏密室',
      atlasOrigin: { x: 1080, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room06a.webp',
      walkableBoundsLocal: { x: 100, y: 120, width: 880, height: 1680 },
      spawnLocal: { x: 180, y: 960 },
      transitions: [
        { id: '06A_to_06', zone: { x: 70, y: 860, width: 120, height: 240 }, targetRoomId: 'room_06', targetSpawnLocal: { x: 860, y: 960 } },
      ],
    },
    {
      id: 'room_07', name: '哥布林營地',
      atlasOrigin: { x: 2160, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room07.webp',
      walkableBoundsLocal: { x: 120, y: 180, width: 840, height: 1560 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '07_to_08', zone: { x: 430, y: 90, width: 220, height: 120 }, targetRoomId: 'room_08', targetSpawnLocal: { x: 540, y: 1660 }, lockedByFlag: 'goblin_camp_clear' },
        { id: '07_to_06', zone: { x: 430, y: 1710, width: 220, height: 120 }, targetRoomId: 'room_06', targetSpawnLocal: { x: 540, y: 260 } },
      ],
    },
    {
      id: 'room_08', name: '古老祭壇',
      atlasOrigin: { x: 3240, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room08.webp',
      walkableBoundsLocal: { x: 120, y: 140, width: 840, height: 1640 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '08_to_09', zone: { x: 430, y: 90, width: 220, height: 120 }, targetRoomId: 'room_09', targetSpawnLocal: { x: 540, y: 1660 }, lockedByFlag: 'altar_cutscene_seen' },
        { id: '08_to_07', zone: { x: 430, y: 1710, width: 220, height: 120 }, targetRoomId: 'room_07', targetSpawnLocal: { x: 540, y: 260 } },
      ],
    },
    {
      id: 'room_09', name: '森林深處出口',
      atlasOrigin: { x: 4320, y: 1920 }, size: { width: 1080, height: 1920 },
      background: '/assets/adventure/forest_1_1/rooms_v2/room09.webp',
      walkableBoundsLocal: { x: 160, y: 180, width: 760, height: 1540 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [],
    },
  ],

  npcs: [
    { id: 'lost_girl', name: '迷途女孩', x: 2705, y: 980, interactRadius: 90, dialogueIds: ['girl_greet_before_quest'] },
  ],

  dialogues: FOREST_RUINS_01_DIALOGUES,

  triggers: [
    // 走進祭壇房間就播一次劇情，不需要按互動鍵；播完設 altar_cutscene_seen，
    // room_08 的 08_to_09 出口靠這個 flag 才解鎖。
    { id: 't_altar_cutscene', mode: 'once', area: { x: 3620, y: 2440, width: 320, height: 220 }, action: { type: 'start_cutscene', cutsceneId: 'altar_cutscene', setsFlag: 'altar_cutscene_seen' } },
  ],

  combatZones: [
    {
      id: 'bridge_combat',
      area: { x: 4680, y: 920, width: 360, height: 180 },
      gateColliderIds: [], // 戰鬤中 RoomSystem 本來就不檢查換房，不需要實體閘門
      waves: BRIDGE_COMBAT_WAVES,
      rewardGold: 30,
      rewardExp: 20,
    },
    {
      id: 'goblin_camp_combat',
      area: { x: 2400, y: 2480, width: 600, height: 520 },
      gateColliderIds: [],
      waves: GOBLIN_CAMP_COMBAT_WAVES,
      rewardGold: 50,
      rewardExp: 40,
      setsFlag: 'goblin_camp_clear', // room_07 的 07_to_08 出口靠這個 flag 解鎖
    },
  ],

  puzzles: [
    {
      id: 'bridge_brazier_puzzle',
      kind: 'brazier_gate',
      braziers: [
        { id: 'brazier_01', x: 4600, y: 600, hitsRequired: 3 },
        { id: 'brazier_02', x: 4860, y: 450, hitsRequired: 3 },
        { id: 'brazier_03', x: 5120, y: 600, hitsRequired: 3 },
      ],
      gateColliderId: 'puzzle_vine_gate',
      completeFlag: 'forest01_vine_gate_open',
    },
  ],

  collectibles: [
    // Room 01 森林入口
    { id: 'pc1', kind: 'purple_coin', x: 430, y: 1040 },
    { id: 'pc2', kind: 'purple_coin', x: 650, y: 920 },
    { id: 'pc3', kind: 'purple_coin', x: 520, y: 720 },
    // Room 02 林間小徑
    { id: 'pc4', kind: 'purple_coin', x: 1480, y: 1250 },
    { id: 'pc5', kind: 'purple_coin', x: 1750, y: 980 },
    { id: 'pc6', kind: 'purple_coin', x: 1620, y: 620 },
    // Room 03 迷途女孩岔路
    { id: 'pc7', kind: 'purple_coin', x: 2470, y: 960 },
    { id: 'pc8', kind: 'purple_coin', x: 2930, y: 960 },
    // Room 03A 被遺忘的花圃
    { id: 'pc9', kind: 'purple_coin', x: 3510, y: 510 },
    { id: 'pc10', kind: 'purple_coin', x: 4060, y: 620 },
    { id: 'dirty_teddy', kind: 'quest_item', x: 3760, y: 1180 },
    // Secret #1（花圃草叢）裡的星星碎片 1。
    { id: 'star_piece_1', kind: 'star_piece', x: 3420, y: 300, hidden: true },
    // Room 05 古老石橋／三火盆
    { id: 'pc11', kind: 'purple_coin', x: 4510, y: 1030 },
    { id: 'pc12', kind: 'purple_coin', x: 5210, y: 1030 },
    { id: 'pc13', kind: 'purple_coin', x: 4860, y: 1260 },
    // Room 06 森林遺跡廣場
    { id: 'pc14', kind: 'purple_coin', x: 250, y: 2540 },
    { id: 'pc15', kind: 'purple_coin', x: 830, y: 2530 },
    { id: 'pc16', kind: 'purple_coin', x: 540, y: 2370 },
    // 星星碎片 2、3：沿用原設計先做鎖定佔位，這版撿不到，留給之後回頭探索。
    { id: 'star_piece_2', kind: 'star_piece', x: 810, y: 2250, locked: true },
    // Room 06A 隱藏密室（裂牆後）
    { id: 'pc17', kind: 'purple_coin', x: 1380, y: 2340, hidden: true },
    { id: 'pc18', kind: 'purple_coin', x: 1620, y: 2250, hidden: true },
    { id: 'treasure1', kind: 'treasure', x: 1870, y: 2340, hidden: true, reward: { gold: 80, enhanceStones: 4 } },
    { id: 'star_piece_3', kind: 'star_piece', x: 1920, y: 2370, locked: true },
    // Room 07 哥布林營地
    { id: 'pc19', kind: 'purple_coin', x: 2480, y: 3180 },
    { id: 'pc20', kind: 'purple_coin', x: 2920, y: 3150 },
  ],

  secrets: [
    {
      id: 'secret01_bushes',
      kind: 'illusory_wall',
      area: { x: 3370, y: 260, width: 120, height: 100 },
      revealsCollectibleIds: ['star_piece_1'],
    },
    {
      id: 'secret02_wall',
      kind: 'breakable_wall',
      area: { x: 900, y: 2830, width: 40, height: 180 },
      hp: 3,
      revealsCollectibleIds: ['pc17', 'pc18', 'treasure1'],
    },
  ],

  quests: [
    {
      id: 'lost_teddy',
      npcId: 'lost_girl',
      title: '遺失的小熊',
      acceptDialogueId: 'girl_greet_before_quest',
      inProgressDialogueId: 'girl_quest_in_progress',
      completeDialogueId: 'girl_quest_complete',
      postCompleteDialogueId: 'girl_quest_done',
      // 2026-08-19：原本沿用素材包給的 slime 座標放在房間最上緣（y:370~480），
      // 跟小熊（y:1180）、紫幣、星星碎片分散在房間中下段離很遠——玩家如果
      // 沒特地繞去最上面，觸發範圍（中心 40 世界單位內）根本碰不到，史萊姆
      // 永遠不會生成，任務就卡死在「已接受」永遠湊不齊擊殺數。改成蓋住房間
      // 中段（y:650~1050），跟小熊/收集品的路線重疊，玩家正常逛過去就會
      // 觸發，不用特地去房間最邊緣才踩得到。
      killTarget: {
        enemyId: QUEST_FLOWER_BED_ENEMY_ID,
        count: QUEST_FLOWER_BED_ENEMY_COUNT,
        spawnArea: { x: 3420, y: 650, width: 710, height: 400 },
      },
      requiredCollectibleId: 'dirty_teddy',
      reward: { gold: 50, purpleCoins: 2 },
      completeFlag: 'forest01_lost_teddy_complete',
    },
  ],

  exit: { x: 4860, y: 2290, radius: 90 },

  starThresholds: { purpleCoinCount: 15, starPieceCount: 1 },
}
