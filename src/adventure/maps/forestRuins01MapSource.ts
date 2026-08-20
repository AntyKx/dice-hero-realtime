import { FOREST_RUINS_01_DIALOGUES } from '../dialogues/forestRuins01Dialogues'
import {
  BRIDGE_COMBAT_WAVES,
  GOBLIN_CAMP_COMBAT_WAVES,
  QUEST_FLOWER_BED_ENEMY_COUNT,
  QUEST_FLOWER_BED_ENEMY_ID,
} from '../encounters/forestRuins01Encounters'
import { buildTiledAdventureMapSource, parseTiledRoomMap } from './tiled/buildTiledAdventureMapSource'
import type { TiledAdventureMapGameplay } from './tiled/tiledAdventureTypes'

import room01Raw from './tiled/forest_1_1/room_01.tmj?raw'
import room02Raw from './tiled/forest_1_1/room_02.tmj?raw'
import room03Raw from './tiled/forest_1_1/room_03.tmj?raw'
import room03aRaw from './tiled/forest_1_1/room_03a.tmj?raw'
import room05Raw from './tiled/forest_1_1/room_05.tmj?raw'
import room06Raw from './tiled/forest_1_1/room_06.tmj?raw'
import room06aRaw from './tiled/forest_1_1/room_06a.tmj?raw'
import room07Raw from './tiled/forest_1_1/room_07.tmj?raw'
import room08Raw from './tiled/forest_1_1/room_08.tmj?raw'
import room09Raw from './tiled/forest_1_1/room_09.tmj?raw'

/**
 * Forest Ruins 01 gameplay semantics.
 *
 * IMPORTANT:
 * - NO gameplay coordinates belong in this file anymore.
 * - Move/resize objects in the corresponding .tmj file with Tiled.
 * - This file only defines meaning: target room, flags, waves, rewards, dialogue,
 *   collectible kind, quest rules, etc.
 */
const FOREST_RUINS_01_GAMEPLAY: TiledAdventureMapGameplay = {
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
      transitions: [
        { id: '01_to_02', targetRoomId: 'room_02', targetEntryId: 'from_room_01' },
      ],
      colliders: [
        { id: 'terrain_r01_gate_post_l', active: true },
        { id: 'terrain_r01_gate_post_r', active: true },
      ],
      collectibles: [
        { id: 'pc1', kind: 'purple_coin' },
        { id: 'pc2', kind: 'purple_coin' },
        { id: 'pc3', kind: 'purple_coin' },
      ],
    },
    {
      id: 'room_02',
      name: '林間小徑',
      background: '/assets/adventure/forest_1_1/rooms_v2/room02.webp',
      transitions: [
        { id: '02_to_03', targetRoomId: 'room_03', targetEntryId: 'from_room_02' },
        { id: '02_to_01', targetRoomId: 'room_01', targetEntryId: 'from_room_02' },
      ],
      collectibles: [
        { id: 'pc4', kind: 'purple_coin' },
        { id: 'pc5', kind: 'purple_coin' },
        { id: 'pc6', kind: 'purple_coin' },
      ],
    },
    {
      id: 'room_03',
      name: '迷途女孩岔路',
      background: '/assets/adventure/forest_1_1/rooms_v2/room03.webp',
      transitions: [
        { id: '03_to_05', targetRoomId: 'room_05', targetEntryId: 'from_room_03' },
        { id: '03_to_02', targetRoomId: 'room_02', targetEntryId: 'from_room_03' },
        { id: '03_to_03A', targetRoomId: 'room_03a', targetEntryId: 'from_room_03' },
      ],
      npcs: [
        { id: 'lost_girl', name: '迷途女孩', interactRadius: 90, dialogueIds: ['girl_greet_before_quest'] },
      ],
      collectibles: [
        { id: 'pc7', kind: 'purple_coin' },
        { id: 'pc8', kind: 'purple_coin' },
      ],
    },
    {
      id: 'room_03a',
      name: '被遺忘的花圃',
      background: '/assets/adventure/forest_1_1/rooms_v2/room03a.webp',
      transitions: [
        { id: '03A_to_03', targetRoomId: 'room_03', targetEntryId: 'from_room_03a' },
      ],
      collectibles: [
        { id: 'pc9', kind: 'purple_coin' },
        { id: 'pc10', kind: 'purple_coin' },
        { id: 'dirty_teddy', kind: 'quest_item' },
        { id: 'star_piece_1', kind: 'star_piece', hidden: true },
      ],
      secrets: [
        { id: 'secret01_bushes', kind: 'illusory_wall', revealsCollectibleIds: ['star_piece_1'] },
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
          killTarget: { enemyId: QUEST_FLOWER_BED_ENEMY_ID, count: QUEST_FLOWER_BED_ENEMY_COUNT },
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
      transitions: [
        { id: '05_to_06', targetRoomId: 'room_06', targetEntryId: 'from_room_05', lockedByFlag: 'forest01_vine_gate_open' },
        { id: '05_to_03', targetRoomId: 'room_03', targetEntryId: 'from_room_05' },
      ],
      colliders: [
        { id: 'puzzle_vine_gate', active: true, blocksMovement: false },
        { id: 'terrain_r05_water_top_l', active: true },
        { id: 'terrain_r05_water_top_r', active: true },
        { id: 'terrain_r05_water_uppermid_l', active: true },
        { id: 'terrain_r05_water_uppermid_r', active: true },
        { id: 'terrain_r05_water_lowermid_l', active: true },
        { id: 'terrain_r05_water_lowermid_r', active: true },
        { id: 'terrain_r05_water_bottom_l', active: true },
        { id: 'terrain_r05_water_bottom_r', active: true },
      ],
      combatZones: [
        { id: 'bridge_combat', gateColliderIds: [], waves: BRIDGE_COMBAT_WAVES, rewardGold: 30, rewardExp: 20 },
      ],
      puzzles: [
        {
          id: 'bridge_brazier_puzzle',
          kind: 'brazier_gate',
          braziers: [
            { id: 'brazier_01', hitsRequired: 3 },
            { id: 'brazier_02', hitsRequired: 3 },
            { id: 'brazier_03', hitsRequired: 3 },
          ],
          gateColliderId: 'puzzle_vine_gate',
          completeFlag: 'forest01_vine_gate_open',
        },
      ],
      collectibles: [
        { id: 'pc11', kind: 'purple_coin' },
        { id: 'pc12', kind: 'purple_coin' },
        { id: 'pc13', kind: 'purple_coin' },
      ],
    },
    {
      id: 'room_06',
      name: '森林遺跡廣場',
      background: '/assets/adventure/forest_1_1/rooms_v2/room06.webp',
      transitions: [
        { id: '06_to_07', targetRoomId: 'room_07', targetEntryId: 'from_room_06' },
        { id: '06_to_05', targetRoomId: 'room_05', targetEntryId: 'from_room_06' },
        { id: '06_to_06A', targetRoomId: 'room_06a', targetEntryId: 'from_room_06', lockedByFlag: 'secret02_wall' },
      ],
      colliders: [
        { id: 'secret02_wall', active: true, blocksMovement: false },
      ],
      collectibles: [
        { id: 'pc14', kind: 'purple_coin' },
        { id: 'pc15', kind: 'purple_coin' },
        { id: 'pc16', kind: 'purple_coin' },
        { id: 'star_piece_2', kind: 'star_piece', locked: true },
      ],
      secrets: [
        { id: 'secret02_wall', kind: 'breakable_wall', hp: 3, revealsCollectibleIds: ['pc17', 'pc18', 'treasure1'] },
      ],
    },
    {
      id: 'room_06a',
      name: '隱藏密室',
      background: '/assets/adventure/forest_1_1/rooms_v2/room06a.webp',
      transitions: [
        { id: '06A_to_06', targetRoomId: 'room_06', targetEntryId: 'from_room_06a' },
      ],
      collectibles: [
        { id: 'pc17', kind: 'purple_coin', hidden: true },
        { id: 'pc18', kind: 'purple_coin', hidden: true },
        { id: 'treasure1', kind: 'treasure', hidden: true, reward: { gold: 80, enhanceStones: 4 } },
        { id: 'star_piece_3', kind: 'star_piece', locked: true },
      ],
    },
    {
      id: 'room_07',
      name: '哥布林營地',
      background: '/assets/adventure/forest_1_1/rooms_v2/room07.webp',
      transitions: [
        { id: '07_to_08', targetRoomId: 'room_08', targetEntryId: 'from_room_07', lockedByFlag: 'goblin_camp_clear' },
        { id: '07_to_06', targetRoomId: 'room_06', targetEntryId: 'from_room_07' },
      ],
      colliders: [
        { id: 'terrain_r07_tent_topleft', active: true },
        { id: 'terrain_r07_tent_topright', active: true },
        { id: 'terrain_r07_tent_midleft', active: true },
        { id: 'terrain_r07_tent_bottomright', active: true },
      ],
      combatZones: [
        { id: 'goblin_camp_combat', gateColliderIds: [], waves: GOBLIN_CAMP_COMBAT_WAVES, rewardGold: 50, rewardExp: 40, setsFlag: 'goblin_camp_clear' },
      ],
      collectibles: [
        { id: 'pc19', kind: 'purple_coin' },
        { id: 'pc20', kind: 'purple_coin' },
      ],
    },
    {
      id: 'room_08',
      name: '古老祭壇',
      background: '/assets/adventure/forest_1_1/rooms_v2/room08.webp',
      transitions: [
        { id: '08_to_09', targetRoomId: 'room_09', targetEntryId: 'from_room_08', lockedByFlag: 'altar_cutscene_seen' },
        { id: '08_to_07', targetRoomId: 'room_07', targetEntryId: 'from_room_08' },
      ],
      colliders: [
        { id: 'terrain_r08_gate_post_l', active: true },
        { id: 'terrain_r08_gate_post_r', active: true },
        { id: 'terrain_r08_arch_pillar_l', active: true },
        { id: 'terrain_r08_arch_pillar_r', active: true },
      ],
      triggers: [
        { id: 't_altar_cutscene', mode: 'once', action: { type: 'start_cutscene', cutsceneId: 'altar_cutscene', setsFlag: 'altar_cutscene_seen' } },
      ],
    },
    {
      id: 'room_09',
      name: '森林深處出口',
      background: '/assets/adventure/forest_1_1/rooms_v2/room09.webp',
      transitions: [],
      exit: { radius: 90 },
    },
  ],
}

const FOREST_RUINS_01_TILED_ROOMS = {
  room_01: parseTiledRoomMap(room01Raw, 'room_01'),
  room_02: parseTiledRoomMap(room02Raw, 'room_02'),
  room_03: parseTiledRoomMap(room03Raw, 'room_03'),
  room_03a: parseTiledRoomMap(room03aRaw, 'room_03a'),
  room_05: parseTiledRoomMap(room05Raw, 'room_05'),
  room_06: parseTiledRoomMap(room06Raw, 'room_06'),
  room_06a: parseTiledRoomMap(room06aRaw, 'room_06a'),
  room_07: parseTiledRoomMap(room07Raw, 'room_07'),
  room_08: parseTiledRoomMap(room08Raw, 'room_08'),
  room_09: parseTiledRoomMap(room09Raw, 'room_09'),
}

export const FOREST_RUINS_01_MAP_SOURCE = buildTiledAdventureMapSource(
  FOREST_RUINS_01_GAMEPLAY,
  FOREST_RUINS_01_TILED_ROOMS,
)
