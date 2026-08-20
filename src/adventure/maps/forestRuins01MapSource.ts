import { FOREST_RUINS_01_DIALOGUES } from '../dialogues/forestRuins01Dialogues'
import {
  BRIDGE_COMBAT_WAVES,
  GOBLIN_CAMP_COMBAT_WAVES,
  QUEST_FLOWER_BED_ENEMY_COUNT,
  QUEST_FLOWER_BED_ENEMY_ID,
} from '../encounters/forestRuins01Encounters'
import type { AdventureMapSource } from './mapSourceTypes'

/**
 * Forest Ruins 01 authoring source.
 *
 * IMPORTANT: every x/y/rect in this file is ROOM-LOCAL. Do not add atlas/world
 * coordinates here. The compiler owns atlas placement and world conversion.
 * This is the first stage converted to the controllable map pipeline.
 */
export const FOREST_RUINS_01_MAP_SOURCE: AdventureMapSource = {
  stageId: 'forest_1_1',
  groundColor: 0x1a2e18,
  roomSize: { width: 1080, height: 1920 },
  atlasColumns: 5,
  startRoomId: 'room_01',
  dialogues: FOREST_RUINS_01_DIALOGUES,
  starThresholds: { purpleCoinCount: 15, starPieceCount: 1 },

  rooms: [
    {
      id: 'room_01',
      name: '森林入口',
      background: '/assets/adventure/forest_1_1/rooms_v2/room01.webp',
      walkableBoundsLocal: { x: 180, y: 220, width: 720, height: 1460 },
      spawnLocal: { x: 540, y: 1540 },
      transitions: [
        { id: '01_to_02', zone: { x: 450, y: 120, width: 180, height: 130 }, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 1600 } },
      ],
      colliders: [
        { id: 'terrain_r01_gate_post_l', rect: { x: 340, y: 1480, width: 110, height: 200 }, active: true },
        { id: 'terrain_r01_gate_post_r', rect: { x: 630, y: 1480, width: 110, height: 200 }, active: true },
      ],
      collectibles: [
        { id: 'pc1', kind: 'purple_coin', x: 430, y: 1040 },
        { id: 'pc2', kind: 'purple_coin', x: 650, y: 920 },
        { id: 'pc3', kind: 'purple_coin', x: 520, y: 720 },
      ],
    },
    {
      id: 'room_02',
      name: '林間小徑',
      background: '/assets/adventure/forest_1_1/rooms_v2/room02.webp',
      walkableBoundsLocal: { x: 180, y: 180, width: 720, height: 1540 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '02_to_03', zone: { x: 430, y: 110, width: 220, height: 120 }, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 1640 } },
        { id: '02_to_01', zone: { x: 430, y: 1680, width: 220, height: 120 }, targetRoomId: 'room_01', targetSpawnLocal: { x: 540, y: 260 } },
      ],
      collectibles: [
        { id: 'pc4', kind: 'purple_coin', x: 400, y: 1250 },
        { id: 'pc5', kind: 'purple_coin', x: 670, y: 980 },
        { id: 'pc6', kind: 'purple_coin', x: 540, y: 620 },
      ],
    },
    {
      id: 'room_03',
      name: '迷途女孩岔路',
      background: '/assets/adventure/forest_1_1/rooms_v2/room03.webp',
      walkableBoundsLocal: { x: 140, y: 220, width: 800, height: 1460 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '03_to_05', zone: { x: 430, y: 110, width: 220, height: 140 }, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 1680 } },
        { id: '03_to_02', zone: { x: 430, y: 1650, width: 220, height: 150 }, targetRoomId: 'room_02', targetSpawnLocal: { x: 540, y: 260 } },
        { id: '03_to_03A', zone: { x: 70, y: 820, width: 120, height: 220 }, targetRoomId: 'room_03a', targetSpawnLocal: { x: 850, y: 960 } },
      ],
      npcs: [
        { id: 'lost_girl', name: '迷途女孩', x: 545, y: 980, interactRadius: 90, dialogueIds: ['girl_greet_before_quest'] },
      ],
      collectibles: [
        { id: 'pc7', kind: 'purple_coin', x: 310, y: 960 },
        { id: 'pc8', kind: 'purple_coin', x: 770, y: 960 },
      ],
    },
    {
      id: 'room_03a',
      name: '被遺忘的花圃',
      background: '/assets/adventure/forest_1_1/rooms_v2/room03a.webp',
      walkableBoundsLocal: { x: 120, y: 180, width: 820, height: 1560 },
      spawnLocal: { x: 920, y: 960 },
      transitions: [
        { id: '03A_to_03', zone: { x: 890, y: 820, width: 120, height: 220 }, targetRoomId: 'room_03', targetSpawnLocal: { x: 260, y: 930 } },
      ],
      collectibles: [
        { id: 'pc9', kind: 'purple_coin', x: 270, y: 510 },
        { id: 'pc10', kind: 'purple_coin', x: 820, y: 620 },
        { id: 'dirty_teddy', kind: 'quest_item', x: 520, y: 1180 },
        { id: 'star_piece_1', kind: 'star_piece', x: 180, y: 300, hidden: true },
      ],
      secrets: [
        { id: 'secret01_bushes', kind: 'illusory_wall', area: { x: 130, y: 260, width: 120, height: 100 }, revealsCollectibleIds: ['star_piece_1'] },
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
          killTarget: {
            enemyId: QUEST_FLOWER_BED_ENEMY_ID,
            count: QUEST_FLOWER_BED_ENEMY_COUNT,
            spawnArea: { x: 180, y: 650, width: 710, height: 400 },
          },
          requiredCollectibleId: 'dirty_teddy',
          reward: { gold: 50, purpleCoins: 2 },
          completeFlag: 'forest01_lost_teddy_complete',
        },
      ],
    },
    {
      id: 'room_05',
      name: '古老石橋／三火盆',
      background: '/assets/adventure/forest_1_1/rooms_v2/room05.webp',
      walkableBoundsLocal: { x: 120, y: 220, width: 840, height: 1500 },
      spawnLocal: { x: 540, y: 1710 },
      transitions: [
        { id: '05_to_06', zone: { x: 430, y: 90, width: 220, height: 160 }, targetRoomId: 'room_06', targetSpawnLocal: { x: 540, y: 1650 }, lockedByFlag: 'forest01_vine_gate_open' },
        { id: '05_to_03', zone: { x: 430, y: 1690, width: 220, height: 140 }, targetRoomId: 'room_03', targetSpawnLocal: { x: 540, y: 280 } },
      ],
      colliders: [
        { id: 'puzzle_vine_gate', rect: { x: 440, y: 180, width: 200, height: 40 }, active: true, blocksMovement: false },
        { id: 'terrain_r05_water_top_l', rect: { x: 120, y: 250, width: 260, height: 150 }, active: true },
        { id: 'terrain_r05_water_top_r', rect: { x: 700, y: 250, width: 260, height: 150 }, active: true },
        { id: 'terrain_r05_water_uppermid_l', rect: { x: 120, y: 400, width: 140, height: 250 }, active: true },
        { id: 'terrain_r05_water_uppermid_r', rect: { x: 820, y: 400, width: 140, height: 250 }, active: true },
        { id: 'terrain_r05_water_lowermid_l', rect: { x: 120, y: 1270, width: 140, height: 250 }, active: true },
        { id: 'terrain_r05_water_lowermid_r', rect: { x: 820, y: 1270, width: 140, height: 250 }, active: true },
        { id: 'terrain_r05_water_bottom_l', rect: { x: 120, y: 1520, width: 260, height: 170 }, active: true },
        { id: 'terrain_r05_water_bottom_r', rect: { x: 700, y: 1520, width: 260, height: 170 }, active: true },
      ],
      combatZones: [
        { id: 'bridge_combat', area: { x: 360, y: 920, width: 360, height: 180 }, gateColliderIds: [], waves: BRIDGE_COMBAT_WAVES, rewardGold: 30, rewardExp: 20 },
      ],
      puzzles: [
        {
          id: 'bridge_brazier_puzzle',
          kind: 'brazier_gate',
          braziers: [
            { id: 'brazier_01', x: 280, y: 600, hitsRequired: 3 },
            { id: 'brazier_02', x: 540, y: 450, hitsRequired: 3 },
            { id: 'brazier_03', x: 800, y: 600, hitsRequired: 3 },
          ],
          gateColliderId: 'puzzle_vine_gate',
          completeFlag: 'forest01_vine_gate_open',
        },
      ],
      collectibles: [
        { id: 'pc11', kind: 'purple_coin', x: 190, y: 1030 },
        { id: 'pc12', kind: 'purple_coin', x: 890, y: 1030 },
        { id: 'pc13', kind: 'purple_coin', x: 540, y: 1260 },
      ],
    },
    {
      id: 'room_06',
      name: '森林遺跡廣場',
      background: '/assets/adventure/forest_1_1/rooms_v2/room06.webp',
      walkableBoundsLocal: { x: 100, y: 180, width: 880, height: 1560 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '06_to_07', zone: { x: 430, y: 100, width: 220, height: 120 }, targetRoomId: 'room_07', targetSpawnLocal: { x: 540, y: 1660 } },
        { id: '06_to_05', zone: { x: 430, y: 1710, width: 220, height: 120 }, targetRoomId: 'room_05', targetSpawnLocal: { x: 540, y: 290 } },
        { id: '06_to_06A', zone: { x: 870, y: 900, width: 120, height: 220 }, targetRoomId: 'room_06a', targetSpawnLocal: { x: 260, y: 960 }, lockedByFlag: 'secret02_wall' },
      ],
      colliders: [
        { id: 'secret02_wall', rect: { x: 900, y: 910, width: 40, height: 180 }, active: true, blocksMovement: false },
      ],
      collectibles: [
        { id: 'pc14', kind: 'purple_coin', x: 250, y: 620 },
        { id: 'pc15', kind: 'purple_coin', x: 830, y: 610 },
        { id: 'pc16', kind: 'purple_coin', x: 540, y: 450 },
        { id: 'star_piece_2', kind: 'star_piece', x: 810, y: 330, locked: true },
      ],
      secrets: [
        { id: 'secret02_wall', kind: 'breakable_wall', area: { x: 900, y: 910, width: 40, height: 180 }, hp: 3, revealsCollectibleIds: ['pc17', 'pc18', 'treasure1'] },
      ],
    },
    {
      id: 'room_06a',
      name: '隱藏密室',
      background: '/assets/adventure/forest_1_1/rooms_v2/room06a.webp',
      walkableBoundsLocal: { x: 100, y: 120, width: 880, height: 1680 },
      spawnLocal: { x: 180, y: 960 },
      transitions: [
        { id: '06A_to_06', zone: { x: 70, y: 860, width: 120, height: 240 }, targetRoomId: 'room_06', targetSpawnLocal: { x: 860, y: 960 } },
      ],
      collectibles: [
        { id: 'pc17', kind: 'purple_coin', x: 300, y: 420, hidden: true },
        { id: 'pc18', kind: 'purple_coin', x: 540, y: 330, hidden: true },
        { id: 'treasure1', kind: 'treasure', x: 790, y: 420, hidden: true, reward: { gold: 80, enhanceStones: 4 } },
        { id: 'star_piece_3', kind: 'star_piece', x: 840, y: 450, locked: true },
      ],
    },
    {
      id: 'room_07',
      name: '哥布林營地',
      background: '/assets/adventure/forest_1_1/rooms_v2/room07.webp',
      walkableBoundsLocal: { x: 120, y: 180, width: 840, height: 1560 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '07_to_08', zone: { x: 430, y: 90, width: 220, height: 120 }, targetRoomId: 'room_08', targetSpawnLocal: { x: 540, y: 1660 }, lockedByFlag: 'goblin_camp_clear' },
        { id: '07_to_06', zone: { x: 430, y: 1710, width: 220, height: 120 }, targetRoomId: 'room_06', targetSpawnLocal: { x: 540, y: 260 } },
      ],
      colliders: [
        { id: 'terrain_r07_tent_topleft', rect: { x: 160, y: 340, width: 220, height: 200 }, active: true },
        { id: 'terrain_r07_tent_topright', rect: { x: 640, y: 370, width: 200, height: 180 }, active: true },
        { id: 'terrain_r07_tent_midleft', rect: { x: 150, y: 1170, width: 140, height: 180 }, active: true },
        { id: 'terrain_r07_tent_bottomright', rect: { x: 680, y: 1400, width: 240, height: 220 }, active: true },
      ],
      combatZones: [
        { id: 'goblin_camp_combat', area: { x: 240, y: 560, width: 600, height: 520 }, gateColliderIds: [], waves: GOBLIN_CAMP_COMBAT_WAVES, rewardGold: 50, rewardExp: 40, setsFlag: 'goblin_camp_clear' },
      ],
      collectibles: [
        { id: 'pc19', kind: 'purple_coin', x: 320, y: 1260 },
        { id: 'pc20', kind: 'purple_coin', x: 760, y: 1230 },
      ],
    },
    {
      id: 'room_08',
      name: '古老祭壇',
      background: '/assets/adventure/forest_1_1/rooms_v2/room08.webp',
      walkableBoundsLocal: { x: 120, y: 140, width: 840, height: 1640 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [
        { id: '08_to_09', zone: { x: 430, y: 90, width: 220, height: 120 }, targetRoomId: 'room_09', targetSpawnLocal: { x: 540, y: 1660 }, lockedByFlag: 'altar_cutscene_seen' },
        { id: '08_to_07', zone: { x: 430, y: 1710, width: 220, height: 120 }, targetRoomId: 'room_07', targetSpawnLocal: { x: 540, y: 260 } },
      ],
      colliders: [
        { id: 'terrain_r08_gate_post_l', rect: { x: 356, y: 1517, width: 110, height: 180 }, active: true },
        { id: 'terrain_r08_gate_post_r', rect: { x: 616, y: 1517, width: 110, height: 180 }, active: true },
        { id: 'terrain_r08_arch_pillar_l', rect: { x: 259, y: 154, width: 90, height: 230 }, active: true },
        { id: 'terrain_r08_arch_pillar_r', rect: { x: 734, y: 154, width: 90, height: 230 }, active: true },
      ],
      triggers: [
        { id: 't_altar_cutscene', mode: 'once', area: { x: 380, y: 520, width: 320, height: 220 }, action: { type: 'start_cutscene', cutsceneId: 'altar_cutscene', setsFlag: 'altar_cutscene_seen' } },
      ],
    },
    {
      id: 'room_09',
      name: '森林深處出口',
      background: '/assets/adventure/forest_1_1/rooms_v2/room09.webp',
      walkableBoundsLocal: { x: 160, y: 180, width: 760, height: 1540 },
      spawnLocal: { x: 540, y: 1660 },
      transitions: [],
      exit: { x: 540, y: 370, radius: 90 },
    },
  ],
}
