import type { AdventureStageDef } from '../adventureTypes'
import { BRIDGE_COMBAT_WAVES, GOBLIN_CAMP_COMBAT_WAVES, QUEST_FLOWER_BED_ENEMY_ID, QUEST_FLOWER_BED_ENEMY_COUNT } from '../encounters/forestRuins01Encounters'
import { FOREST_RUINS_01_DIALOGUES } from '../dialogues/forestRuins01Dialogues'

/**
 * 森林遺跡 1「迷途的林間入口」（campaign stageId: forest_1_1）Greybox 垂直
 * 切片。世界座標 y 由大到小＝由南（入口/重生點）往北（Exit）前進，呼應
 * 文件第三節給的 9 個區域＋2 個支線分岔：
 *
 * 1 森林入口 → 2 林間小徑 → 3 迷途女孩岔路 →(西側支線)→ 3A 被遺忘的花圃
 *   → 4 古老石橋（Combat #1）→ 三火盆謎題（藤蔓門）→ 5 森林遺跡廣場
 *   →(東側支線，裂牆秘密)→ 5A 隱藏密室
 *   → 6 哥布林營地（Combat #2，順便解鎖 7 的 altar_gate）
 *   → 7 古老祭壇（劇情）→ 8 Exit
 */
export const FOREST_RUINS_01_STAGE: AdventureStageDef = {
  stageId: 'forest_1_1',
  world: { width: 2400, height: 3600 },
  spawn: { x: 1200, y: 3400 },
  groundColor: 0x2e4a24,

  colliders: [
    // 石橋 Combat #1 的前後藤蔓：預設開啟（active:false=不擋路），戰鬤開始/
    // 結束由 AdventureCombatController 自動切換。
    { id: 'bridge_gate_south', rect: { x: 950, y: 2365, width: 500, height: 22 }, active: false },
    { id: 'bridge_gate_north', rect: { x: 950, y: 2103, width: 500, height: 22 }, active: false },
    // 三火盆謎題的藤蔓門：預設關閉（active:true=擋路），PuzzleSystem 全部
    // 點燃後打開。
    { id: 'puzzle_vine_gate', rect: { x: 1080, y: 1955, width: 240, height: 22 }, active: true },
    // 森林遺跡廣場→隱藏密室的裂牆：預設關閉，SecretSystem 打穿後打開。
    { id: 'secret02_wall', rect: { x: 1500, y: 1550, width: 22, height: 250 }, active: true },
    // 哥布林營地 Combat #2 的前後藤蔓，跟古老祭壇的石門（打完這場戰鬤才
    // 一起解鎖，見 stage(1) 的 firstClearReward 註解／CombatZoneDef 說明）。
    { id: 'goblin_gate_south', rect: { x: 900, y: 1288, width: 600, height: 22 }, active: false },
    { id: 'goblin_gate_north', rect: { x: 900, y: 988, width: 600, height: 22 }, active: false },
    { id: 'altar_gate', rect: { x: 1000, y: 878, width: 400, height: 22 }, active: true },
  ],

  areas: [
    { id: 'area1', name: '森林入口', area: { x: 900, y: 3250, width: 600, height: 300 } },
    { id: 'area2', name: '林間小徑', area: { x: 900, y: 2850, width: 600, height: 300 } },
    { id: 'area3', name: '迷途女孩岔路', area: { x: 900, y: 2450, width: 600, height: 300 } },
    { id: 'area3a', name: '被遺忘的花圃', area: { x: 450, y: 2400, width: 500, height: 350 } },
    { id: 'area4', name: '古老石橋', area: { x: 950, y: 2100, width: 500, height: 280 } },
    { id: 'area5', name: '森林遺跡廣場', area: { x: 900, y: 1500, width: 600, height: 350 } },
    { id: 'area5a', name: '隱藏密室', area: { x: 1520, y: 1550, width: 400, height: 250 } },
    { id: 'area6', name: '哥布林營地', area: { x: 900, y: 1000, width: 600, height: 300 } },
    { id: 'area7', name: '古老祭壇', area: { x: 900, y: 500, width: 600, height: 300 } },
    { id: 'area8', name: '出口', area: { x: 1000, y: 150, width: 400, height: 250 } },
  ],

  npcs: [
    { id: 'lost_girl', name: '迷途女孩', x: 1200, y: 2600, dialogueIds: ['girl_greet_before_quest'] },
  ],

  dialogues: FOREST_RUINS_01_DIALOGUES,

  triggers: [
    { id: 't_area1', mode: 'once', area: { x: 900, y: 3250, width: 600, height: 300 }, action: { type: 'discover_area', areaId: 'area1', areaName: '森林入口' } },
    { id: 't_area2', mode: 'once', area: { x: 900, y: 2850, width: 600, height: 300 }, action: { type: 'discover_area', areaId: 'area2', areaName: '林間小徑' } },
    { id: 't_area3', mode: 'once', area: { x: 900, y: 2450, width: 600, height: 300 }, action: { type: 'discover_area', areaId: 'area3', areaName: '迷途女孩岔路' } },
    { id: 't_area3a', mode: 'once', area: { x: 450, y: 2400, width: 500, height: 350 }, action: { type: 'discover_area', areaId: 'area3a', areaName: '被遺忘的花圃' } },
    { id: 't_area4', mode: 'once', area: { x: 950, y: 2100, width: 500, height: 280 }, action: { type: 'discover_area', areaId: 'area4', areaName: '古老石橋' } },
    { id: 't_area5', mode: 'once', area: { x: 900, y: 1500, width: 600, height: 350 }, action: { type: 'discover_area', areaId: 'area5', areaName: '森林遺跡廣場' } },
    { id: 't_area5a', mode: 'once', area: { x: 1520, y: 1550, width: 400, height: 250 }, action: { type: 'discover_area', areaId: 'area5a', areaName: '隱藏密室' } },
    { id: 't_area6', mode: 'once', area: { x: 900, y: 1000, width: 600, height: 300 }, action: { type: 'discover_area', areaId: 'area6', areaName: '哥布林營地' } },
    { id: 't_area7', mode: 'once', area: { x: 900, y: 500, width: 600, height: 300 }, action: { type: 'discover_area', areaId: 'area7', areaName: '古老祭壇' } },
    { id: 't_area8', mode: 'once', area: { x: 1000, y: 150, width: 400, height: 250 }, action: { type: 'discover_area', areaId: 'area8', areaName: '出口' } },
    // 走進祭壇範圍自動播一次劇情，不需要按互動鍵——呼應文件「進入古老祭壇
    // 後播放簡短劇情 Trigger」。
    { id: 't_altar_cutscene', mode: 'once', area: { x: 950, y: 550, width: 500, height: 200 }, action: { type: 'start_cutscene', cutsceneId: 'altar_cutscene' } },
  ],

  combatZones: [
    {
      id: 'bridge_combat',
      area: { x: 950, y: 2100, width: 500, height: 280 },
      gateColliderIds: ['bridge_gate_south', 'bridge_gate_north'],
      waves: BRIDGE_COMBAT_WAVES,
      rewardGold: 30,
      rewardExp: 20,
    },
    {
      id: 'goblin_camp_combat',
      area: { x: 900, y: 1000, width: 600, height: 300 },
      // altar_gate 一併放進來：這場戰鬤結束時 gateColliderIds 全部會被打開
      // （active=false），順便解鎖古老祭壇的石門，不需要另外做「取得鑰匙」
      // 的道具欄位——見文件「取得 forest_ruins_key」的簡化版實作。
      gateColliderIds: ['goblin_gate_south', 'goblin_gate_north', 'altar_gate'],
      waves: GOBLIN_CAMP_COMBAT_WAVES,
      rewardGold: 50,
      rewardExp: 40,
    },
  ],

  puzzles: [
    {
      id: 'bridge_brazier_puzzle',
      kind: 'brazier_gate',
      braziers: [
        { id: 'brazier_01', x: 1080, y: 1990, hitsRequired: 3 },
        { id: 'brazier_02', x: 1200, y: 1970, hitsRequired: 3 },
        { id: 'brazier_03', x: 1320, y: 1990, hitsRequired: 3 },
      ],
      gateColliderId: 'puzzle_vine_gate',
      completeFlag: 'forest01_vine_gate_open',
    },
  ],

  collectibles: [
    // 18 顆開放紫幣，沿主路徑＋花圃支線分布。
    { id: 'pc1', kind: 'purple_coin', x: 1100, y: 3480 },
    { id: 'pc2', kind: 'purple_coin', x: 1300, y: 3480 },
    { id: 'pc3', kind: 'purple_coin', x: 1000, y: 3320 },
    { id: 'pc4', kind: 'purple_coin', x: 1400, y: 3320 },
    { id: 'pc5', kind: 'purple_coin', x: 1050, y: 3050 },
    { id: 'pc6', kind: 'purple_coin', x: 1350, y: 3000 },
    { id: 'pc7', kind: 'purple_coin', x: 1150, y: 2900 },
    { id: 'pc8', kind: 'purple_coin', x: 950, y: 2550 },
    { id: 'pc9', kind: 'purple_coin', x: 1450, y: 2500 },
    { id: 'pc10', kind: 'purple_coin', x: 600, y: 2550 },
    { id: 'pc11', kind: 'purple_coin', x: 800, y: 2680 },
    { id: 'pc12', kind: 'purple_coin', x: 550, y: 2420 },
    { id: 'pc13', kind: 'purple_coin', x: 1080, y: 2300 },
    { id: 'pc14', kind: 'purple_coin', x: 1320, y: 2280 },
    { id: 'pc15', kind: 'purple_coin', x: 1000, y: 1850 },
    { id: 'pc16', kind: 'purple_coin', x: 1400, y: 1800 },
    { id: 'pc17', kind: 'purple_coin', x: 1200, y: 1600 },
    { id: 'pc18', kind: 'purple_coin', x: 1200, y: 600 },
    // Secret #2（裂牆）裡的另外 2 顆紫幣＋寶箱，總數仍是 20（不是額外加碼）。
    { id: 'pc19', kind: 'purple_coin', x: 1650, y: 1620, hidden: true },
    { id: 'pc20', kind: 'purple_coin', x: 1750, y: 1700, hidden: true },
    { id: 'treasure1', kind: 'treasure', x: 1800, y: 1650, hidden: true, reward: { gold: 80, enhanceStones: 4 } },
    // Secret #1（花圃草叢）裡的星星碎片 1。
    { id: 'star_piece_1', kind: 'star_piece', x: 550, y: 2600, hidden: true },
    // 星星碎片 2、3：文件要求先做鎖定佔位，這版撿不到，留給之後回頭探索。
    { id: 'star_piece_2', kind: 'star_piece', x: 1450, y: 1150, locked: true },
    { id: 'star_piece_3', kind: 'star_piece', x: 1350, y: 600, locked: true },
    // 支線任務道具：遺失的小熊。
    { id: 'dirty_teddy', kind: 'quest_item', x: 700, y: 2500 },
  ],

  secrets: [
    {
      id: 'secret01_bushes',
      kind: 'illusory_wall',
      area: { x: 500, y: 2560, width: 120, height: 100 },
      revealsCollectibleIds: ['star_piece_1'],
    },
    {
      id: 'secret02_wall',
      kind: 'breakable_wall',
      area: { x: 1500, y: 1550, width: 22, height: 250 },
      hp: 3,
      revealsCollectibleIds: ['pc19', 'pc20', 'treasure1'],
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
      killTarget: {
        enemyId: QUEST_FLOWER_BED_ENEMY_ID,
        count: QUEST_FLOWER_BED_ENEMY_COUNT,
        spawnArea: { x: 450, y: 2400, width: 500, height: 350 },
      },
      requiredCollectibleId: 'dirty_teddy',
      reward: { gold: 50, purpleCoins: 2 },
      completeFlag: 'forest01_lost_teddy_complete',
    },
  ],

  exit: { x: 1200, y: 250, radius: 90 },

  starThresholds: { purpleCoinCount: 15, starPieceCount: 1 },
}
