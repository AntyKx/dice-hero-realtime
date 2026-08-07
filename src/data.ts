export type SpriteMeta = {
  sheet: string
  frameWidth: number
  frameHeight: number
  frameCount?: number  // defaults to 6; new chapter sheets use 5
  frameRow?: number    // row index in multi-row sheet (0-indexed)
  totalRows?: number   // total rows in the sheet
}

export type Hero = {
  id: string
  name: string
  title: string
  hp: number
  atk: number
  def: number
  role: 'slash' | 'fire' | 'holy' | 'shadow' | 'ice' | 'arrow' | 'hammer' | 'song' | 'beast' | 'gear' | 'fighter'
  school: 'physical' | 'magic'  // 攻擊流派：決定天賦樹裡哪些攻擊力節點對這個英雄有用
  skill: string
  desc: string
  sprite: SpriteMeta
  starSprites?: [SpriteMeta, SpriteMeta, SpriteMeta, SpriteMeta] // [0★, 1★, 2★, 3★]
  portrait?: string  // 高清立繪路徑，用於英雄詳情 modal
}

/** 根據星等取得對應 sprite，無星等圖則 fallback 到預設 sprite */
export function getHeroSprite(hero: Hero, stars: number): SpriteMeta {
  if (hero.starSprites && stars >= 0 && stars <= 3) {
    return hero.starSprites[stars]
  }
  return hero.sprite
}

export type Enemy = {
  id: string
  name: string
  hp: number
  atk: number
  def: number
  skill: string
  sprite: SpriteMeta
}

// frameWidth/frameHeight must stay in sync with public/assets/spritesheets/manifest.json
const H = (id: string, frameWidth: number, frameHeight: number): SpriteMeta => ({
  sheet: `/assets/spritesheets/heroes/${id}.png`,
  frameWidth,
  frameHeight,
})

const E = (id: string, frameWidth: number, frameHeight: number): SpriteMeta => ({
  sheet: `/assets/spritesheets/enemies/${id}.png`,
  frameWidth,
  frameHeight,
})

export const HEROES: Hero[] = [
  { id: 'knight', name: '聖騎士', title: '前排防禦', hp: 168, atk: 28, def: 14, role: 'slash', school: 'physical', skill: '聖盾破軍斬', desc: '三條以上時傷害提升，五條時獲得護盾並嘲諷降低敵人本回合傷害30%。', sprite: H('knight', 173, 178), portrait: '/assets/portraits/knight.png',
    starSprites: [
      H('knight_s0', 423, 320),
      H('knight_s1', 356, 320),
      H('knight_s2', 393, 320),
      H('knight_s3', 358, 320),
    ],
  },
  { id: 'mage', name: '火焰法師', title: '爆發法術', hp: 102, atk: 39, def: 5, role: 'fire', school: 'magic', skill: '烈焰隕星', desc: '順子以上時追加爆發傷害並施加 2 層燃燒。', sprite: H('mage', 173, 184), portrait: '/assets/portraits/mage.png',
    starSprites: [
      H('mage_s0', 374, 320),
      H('mage_s1', 345, 320),
      H('mage_s2', 315, 320),
      H('mage_s3', 347, 320),
    ],
  },
  { id: 'priest', name: '神官祭司', title: '治療輔助', hp: 122, atk: 18, def: 8, role: 'holy', school: 'magic', skill: '光輪祝禱', desc: '骰到 6 越多，回復量越高。', sprite: H('priest', 173, 184), portrait: '/assets/portraits/priest.png',
    starSprites: [
      H('priest_s0', 243, 320),
      H('priest_s1', 259, 320),
      H('priest_s2', 274, 320),
      H('priest_s3', 310, 320),
    ],
  },
  { id: 'rogue', name: '影刃刺客', title: '高速爆擊', hp: 108, atk: 31, def: 5, role: 'shadow', school: 'physical', skill: '暗影連襲', desc: '兩對以上觸發連擊加傷，有機率爆擊造成大量額外傷害。', sprite: H('rogue', 175, 167), portrait: '/assets/portraits/rogue.png',
    starSprites: [
      H('rogue_s0', 415, 320),
      H('rogue_s1', 425, 320),
      H('rogue_s2', 484, 320),
      H('rogue_s3', 347, 320),
    ],
  },
  { id: 'princess', name: '皇家公主', title: '冰痕控制', hp: 118, atk: 24, def: 8, role: 'ice', school: 'magic', skill: '皇家冰晶陣', desc: '技能施加護盾；兩對以上疊冰痕；順子以上凍結；對凍結敵人追加冰晶傷害。冰痕每層 +4% 傷害，5 層觸發碎冰爆發。', sprite: H('princess', 173, 174), portrait: '/assets/portraits/princess.png',
    starSprites: [
      H('princess_s0', 350, 320),
      H('princess_s1', 313, 320),
      H('princess_s2', 316, 320),
      H('princess_s3', 319, 320),
    ],
  },
  { id: 'archer', name: '遊俠獵人', title: '遠程輸出', hp: 114, atk: 26, def: 7, role: 'arrow', school: 'physical', skill: '疾風箭雨', desc: '順子以上時追加箭雨傷害。', sprite: H('archer', 177, 166), portrait: '/assets/portraits/archer.png',
    starSprites: [
      H('archer_s0', 361, 320),
      H('archer_s1', 483, 320),
      H('archer_s2', 349, 320),
      H('archer_s3', 388, 320),
    ],
  },
  { id: 'dwarf', name: '矮人戰士', title: '重擊破甲', hp: 148, atk: 27, def: 12, role: 'hammer', school: 'physical', skill: '震地戰錘', desc: '三條以上時破甲 -3，削減敵人防禦。', sprite: H('dwarf', 180, 183), portrait: '/assets/portraits/dwarf.png',
    starSprites: [H('dwarf_s0', 384, 320), H('dwarf_s1', 328, 320), H('dwarf_s2', 340, 320), H('dwarf_s3', 354, 320)] },
  { id: 'bard', name: '吟遊詩人', title: '團隊增益', hp: 108, atk: 19, def: 6, role: 'song', school: 'physical', skill: '戰歌奏鳴', desc: '可在造成傷害同時小幅回血。', sprite: H('bard', 169, 180), portrait: '/assets/portraits/bard.png',
    starSprites: [H('bard_s0', 355, 320), H('bard_s1', 342, 320), H('bard_s2', 315, 320), H('bard_s3', 317, 320)] },
  { id: 'beastmaster', name: '獸語馴獸師', title: '協同進攻', hp: 132, atk: 24, def: 9, role: 'beast', school: 'physical', skill: '狼魂突擊', desc: '技能傷害穩定，並有少量反擊保護。', sprite: H('beastmaster', 180, 161), portrait: '/assets/portraits/beastmaster.png',
    starSprites: [H('beastmaster_s0', 339, 320), H('beastmaster_s1', 300, 320), H('beastmaster_s2', 347, 320), H('beastmaster_s3', 332, 320)] },
  { id: 'engineer', name: '機關技師', title: '機械火力', hp: 120, atk: 23, def: 8, role: 'gear', school: 'physical', skill: '蒸氣砲擊', desc: '兩對以上時機關炮追加固定傷害。', sprite: H('engineer', 175, 175), portrait: '/assets/portraits/engineer.png',
    starSprites: [H('engineer_s0', 295, 320), H('engineer_s1', 313, 320), H('engineer_s2', 339, 320), H('engineer_s3', 324, 320)] },
  { id: 'fighter', name: '武鬥家', title: '連招拳勢', hp: 125, atk: 28, def: 9, role: 'fighter', school: 'physical', skill: '真氣運轉', desc: '連續技觸發時獲得拳勢（最多5層）；每層傷害+3%受傷-2%；拳勢滿進入無雙架式2回合。技能效果依最近連段類型強化。', sprite: H('fighter_s0', 262, 188), portrait: '/assets/portraits/fighter.png',
    starSprites: [H('fighter_s0', 262, 188), H('fighter_s1', 264, 192), H('fighter_s2', 272, 198), H('fighter_s3', 298, 238)] },
]

export const ENEMIES: Enemy[] = [
  // ── Chapter 1：森林遺跡（5 隻）──────────────────────────────────────────────
  { id: 'goblin',          name: '哥布林',   hp: 180, atk: 18, def: 4,  skill: '毒刃騷擾', sprite: E('goblin',   364, 300) },
  { id: 'orc',             name: '荊棘野豬', hp: 250, atk: 25, def: 8,  skill: '暴力重擊', sprite: E('orc',      261, 300) },
  { id: 'skeleton',        name: '骸骨兵士', hp: 210, atk: 19, def: 6,  skill: '亡骨火靈', sprite: E('skeleton', 339, 300) },
  { id: 'mimic',           name: '寶箱怪',   hp: 225, atk: 22, def: 8,  skill: '吞噬突襲', sprite: E('mimic',    347, 300) },
  { id: 'golem',           name: '石巨人',   hp: 340, atk: 30, def: 12, skill: '巨岩護壁', sprite: E('golem',    315, 300) },
  // ── Chapter 2：雪原地城（5 隻）──────────────────────────────────────────────
  { id: 'ice_wolf',        name: '冰霜狼',     hp: 253, atk: 27, def: 6,  skill: '極寒撕咬', sprite: E('ice_wolf',         385, 300) },
  { id: 'slimeking',       name: '冰晶史萊姆', hp: 275, atk: 22, def: 8,  skill: '冰核彈跳', sprite: E('slimeking',         358, 300) },
  { id: 'lightning_lancer',name: '冰甲騎士',   hp: 314, atk: 29, def: 11, skill: '落雷突槍', sprite: E('lightning_lancer',  366, 300) },
  { id: 'yeti',            name: '雪原巨怪',   hp: 380, atk: 29, def: 12, skill: '冰封猛擊', sprite: E('yeti',              307, 300) },
  { id: 'ice_witch',       name: '冰霜女巫',   hp: 360, atk: 30, def: 9,  skill: '冰封咒術', sprite: E('ice_witch',         341, 300) },
  // ── Chapter 3：魔王城（5 隻）────────────────────────────────────────────────
  { id: 'fire_hound',      name: '炎獄魔犬',   hp: 360, atk: 36, def: 9,  skill: '烈焰撕咬', sprite: E('fire_hound',     349, 300) },
  { id: 'bat_dragon',      name: '翼魔飛龍',   hp: 396, atk: 37, def: 11, skill: '暗翼俯衝', sprite: E('bat_dragon',     381, 300) },
  { id: 'dark_sorceress',  name: '魅魔女王',   hp: 372, atk: 40, def: 9,  skill: '惑心咒術', sprite: E('dark_sorceress', 277, 300) },
  { id: 'dark_knight',     name: '焰獄騎士',   hp: 438, atk: 37, def: 13, skill: '深淵斬擊', sprite: E('dark_knight',    321, 300) },
  { id: 'dragon',          name: '烈焰巨龍',   hp: 600, atk: 44, def: 14, skill: '焚天吐息', sprite: E('dragon',         342, 300) },

  // ── 星蝕裂隙専用 ──────────────────────────────────────────────────────────
  // ── 裂隙前兆篇：第一區 星砂邊境 ────────────────────────────────────────────
  { id: 'sand_rat',        name: '星砂鼠',           hp: 120, atk: 18, def: 2,  skill: '星砂干擾',   sprite: E('sand_rat',        362, 312) },
  { id: 'rift_goblin',     name: '裂縫哥布林',       hp: 150, atk: 22, def: 3,  skill: '裂縫激怒',   sprite: E('rift_goblin',     362, 341) },
  { id: 'star_slime',      name: '星塵史萊姆',       hp: 180, atk: 20, def: 5,  skill: '骨型反制',   sprite: E('star_slime',      362, 360) },
  { id: 'rift_scout',      name: '裂隙巡哨',         hp: 280, atk: 30, def: 8,  skill: '不穩定點數', sprite: E('rift_scout',      362, 477) },
  { id: 'sand_beast',      name: '星砂巨獸',         hp: 520, atk: 36, def: 10, skill: '星砂外殼',   sprite: E('sand_beast',      362, 378) },
  // ── 裂隙前兆篇：第二區 月影廢都 ────────────────────────────────────────────
  { id: 'moon_rogue',      name: '月影盜賊',         hp: 220, atk: 32, def: 5,  skill: '月影閃避',   sprite: E('moon_rogue',      362, 377) },
  { id: 'ruin_guard',      name: '廢都守衛',         hp: 280, atk: 28, def: 12, skill: '廢都護盾',   sprite: E('ruin_guard',      362, 387) },
  { id: 'moon_mage',       name: '月光術士',         hp: 200, atk: 26, def: 4,  skill: '月光詛咒',   sprite: E('moon_mage',       362, 395) },
  { id: 'mirror_assassin', name: '鏡月刺客',         hp: 360, atk: 42, def: 7,  skill: '鏡月追擊',   sprite: E('mirror_assassin', 362, 415) },
  { id: 'moon_executor',   name: '月影執行官',       hp: 680, atk: 46, def: 14, skill: '月影審判',   sprite: E('moon_executor',   362, 470) },
  // ── 裂隙前兆篇：第三區 暗月聖堂 ────────────────────────────────────────────
  { id: 'dark_devotee',    name: '暗月信徒',         hp: 280, atk: 34, def: 8,  skill: '禁忌回復',   sprite: E('dark_devotee',    362, 461) },
  { id: 'rift_praying',    name: '裂隙祈禱者',       hp: 240, atk: 32, def: 6,  skill: '祈禱護盾',   sprite: E('rift_praying',    362, 630) },
  { id: 'black_judge',     name: '黑月裁決者',       hp: 320, atk: 40, def: 10, skill: '裁決之眼',   sprite: E('black_judge',     362, 524) },
  { id: 'dark_shaman',     name: '暗月祭司',         hp: 440, atk: 50, def: 12, skill: '雙骰審判',   sprite: E('dark_shaman',     362, 459) },
  { id: 'bishop_vanguard', name: '暗月主教・前哨形態', hp: 760, atk: 48, def: 15, skill: '星蝕序章', sprite: E('bishop_vanguard', 362, 501) },
  { id: 'rift_imp',        name: '裂隙小鬼',   hp: 370, atk: 31, def: 5,  skill: '裂隙干擾', sprite: E('rift_imp',        320, 320) },
  { id: 'star_sand_golem', name: '星砂魔偶',   hp: 470, atk: 29, def: 12, skill: '星砂硬殼', sprite: E('star_sand_golem', 351, 320) },
  { id: 'mirror_thief',    name: '鏡像盜賊',   hp: 403, atk: 37, def: 6,  skill: '模仿骰型', sprite: E('mirror_thief',    358, 320) },
  { id: 'eclipse_nun',     name: '星蝕修女',   hp: 419, atk: 26, def: 7,  skill: '暗月禱告', sprite: E('eclipse_nun',     312, 320) },
  { id: 'rift_guardian',   name: '裂隙守衛',   hp: 612, atk: 37, def: 14, skill: '禁忌反擊', sprite: E('rift_guardian',   314, 320) },
  { id: 'star_reaper',     name: '星界收割者', hp: 580, atk: 41, def: 8,  skill: '收割倒數', sprite: E('star_reaper',     300, 320) },
  { id: 'eclipse_bishop',  name: '暗月主教',   hp: 801, atk: 41, def: 12, skill: '星蝕審判', sprite: E('eclipse_bishop',  308, 320) },

  // ── 深海遺城篇：第一章 珊瑚淺灘 ──────────────────────────────────────────
  { id: 'coral_crab',           name: '珊瑚寄生蟹',   hp: 190, atk: 22, def: 8,  skill: '共生護殼',   sprite: E('coral_crab',           251, 183) },
  { id: 'blue_jellyfish',       name: '幽藍水母',     hp: 170, atk: 18, def: 4,  skill: '幽光干擾',   sprite: E('blue_jellyfish',       251, 211) },
  { id: 'tide_piranha',         name: '潮汐食人魚',   hp: 140, atk: 28, def: 3,  skill: '迅猛撕咬',   sprite: E('tide_piranha',         251, 206) },
  { id: 'coral_colossus',       name: '珊瑚巨像',     hp: 320, atk: 26, def: 15, skill: '珊瑚護盾',   sprite: E('coral_colossus',       251, 215) },
  { id: 'abyss_anglerfish',     name: '深淵鮟鱇',     hp: 560, atk: 38, def: 11, skill: '深淵誘光',   sprite: E('abyss_anglerfish',     251, 214) },
  // ── 深海遺城篇：第二章 沉沒王城 ──────────────────────────────────────────
  { id: 'drowned_guard',        name: '溺亡衛兵',     hp: 250, atk: 28, def: 10, skill: '殞落突擊',   sprite: E('drowned_guard',        251, 209) },
  { id: 'deep_lancer',          name: '深海槍兵',     hp: 220, atk: 34, def: 7,  skill: '退潮長刺',   sprite: E('deep_lancer',   1254, 772) },
  { id: 'heavy_drowned',        name: '重甲溺兵',     hp: 290, atk: 26, def: 14, skill: '深壓甲盾',   sprite: E('heavy_drowned', 1254, 848) },
  { id: 'sea_priestess',        name: '海淵女祭司',   hp: 430, atk: 40, def: 10, skill: '溺亡詛咒',   sprite: E('sea_priestess',        251, 256) },
  { id: 'sea_emperor_guard',    name: '海皇禁衛',     hp: 740, atk: 48, def: 13, skill: '潮汐審判',   sprite: E('sea_emperor_guard',    251, 255) },
  // ── 深海遺城篇：第三章 海皇深淵 ──────────────────────────────────────────
  { id: 'abyss_siren',          name: '深淵歌姬',     hp: 330, atk: 36, def: 8,  skill: '海妖之歌',   sprite: E('abyss_siren',          251, 203) },
  { id: 'ancient_shell_knight', name: '古殼騎士',     hp: 380, atk: 34, def: 16, skill: '殼甲反彈',   sprite: E('ancient_shell_knight', 251, 215) },
  { id: 'leviathan_pup',        name: '利維坦幼獸',   hp: 360, atk: 44, def: 9,  skill: '深淵衝撞',   sprite: E('leviathan_pup',        251, 211) },
  { id: 'sea_queen',            name: '海淵王后',     hp: 540, atk: 48, def: 13, skill: '海皇賜福',   sprite: E('sea_queen',            251, 251) },
  { id: 'sleeping_emperor',     name: '沉眠海皇',     hp: 980, atk: 54, def: 15, skill: '沉眠甦醒',   sprite: E('sleeping_emperor',     251, 234) },

  // ── 燃燒王座 ──────────────────────────────────────────────────────────────
  { id: 'flame_imp',          name: '魔焰小鬼',     hp: 266, atk: 29, def: 3,  skill: '添柴',     sprite: E('flame_imp',          312, 320) },
  { id: 'molten_guard',       name: '熔甲衛兵',     hp: 392, atk: 31, def: 14, skill: '熔甲',     sprite: E('molten_guard',        312, 320) },
  { id: 'ash_mage',           name: '灰燼術士',     hp: 322, atk: 36, def: 6,  skill: '灰燼詛咒', sprite: E('ash_mage',            285, 320) },
  { id: 'inferno_hound',      name: '煉獄魔犬',     hp: 350, atk: 40, def: 5,  skill: '聞火追獵', sprite: E('inferno_hound',       423, 320) },
  { id: 'black_flame_knight', name: '黑焰騎士',     hp: 644, atk: 32, def: 16, skill: '黑焰反擊', sprite: E('black_flame_knight',  309, 320) },
  { id: 'fallen_fire_priest', name: '墮落炎祭司',   hp: 728, atk: 36, def: 10, skill: '火祭儀式', sprite: E('fallen_fire_priest',  313, 320) },
  { id: 'throne_demon_king',  name: '焰獄魔王殘影', hp: 952, atk: 40, def: 14, skill: '王座餘火', sprite: E('throne_demon_king',   317, 320) },

  // ── 灰燼王國篇・第二章：王城餘燼 ─────────────────────────────────────────
  { id: 'ash_soldier',       name: '灰燼殘兵',     hp: 280, atk: 32, def: 7,  skill: '餘火傷口',   sprite: E('ash_soldier',      300, 337) },
  { id: 'charred_archer',    name: '焦黑弓手',     hp: 240, atk: 38, def: 4,  skill: '穿煙狙擊',   sprite: E('charred_archer',   300, 341) },
  { id: 'molten_shieldman',  name: '熔甲盾兵',     hp: 320, atk: 28, def: 18, skill: '熔甲反燙',   sprite: E('molten_shieldman', 300, 288) },
  { id: 'ember_commander',   name: '焚旗軍官',     hp: 260, atk: 34, def: 6,  skill: '焚旗號令',   sprite: E('ember_commander',  300, 348) },
  { id: 'levok',             name: '灰燼守城官・雷沃克', hp: 820, atk: 46, def: 12, skill: '灰燼城盾', sprite: E('levok',            300, 292) },
  // ── 灰燼王國篇・第二章：亡國迴廊 ─────────────────────────────────────────
  { id: 'castle_remnant',    name: '王城殘兵',     hp: 300, atk: 34, def: 8,  skill: '守護記憶',   sprite: E('castle_remnant',  300, 320) },
  { id: 'ash_guard',         name: '灰燼侍衛',     hp: 340, atk: 30, def: 14, skill: '王宮護衛',   sprite: E('ash_guard',       300, 283) },
  { id: 'broken_knight',     name: '斷劍騎士',     hp: 310, atk: 40, def: 9,  skill: '背誓突刺',   sprite: E('broken_knight',   300, 324) },
  { id: 'lost_court_mage',   name: '失魂宮廷法師', hp: 270, atk: 36, def: 5,  skill: '記憶錯位',   sprite: E('lost_court_mage', 300, 315) },
  { id: 'laon',              name: '殘影禁衛長・羅恩', hp: 900, atk: 50, def: 14, skill: '最後守令', sprite: E('laon',            300, 287) },
  // ── 灰燼王國篇・第二章：灰燼王陵 ─────────────────────────────────────────
  { id: 'tomb_keeper',       name: '王陵守墓人',   hp: 320, atk: 36, def: 10, skill: '封墓灰塵',   sprite: E('tomb_keeper',      300, 325) },
  { id: 'soul_knight',       name: '鎖魂騎士',     hp: 350, atk: 42, def: 12, skill: '鎖魂斬',     sprite: E('soul_knight',      300, 309) },
  { id: 'royal_soul',        name: '灰燼王族魂',   hp: 290, atk: 38, def: 6,  skill: '王血繼承',   sprite: E('royal_soul',       300, 316) },
  { id: 'forbidden_priest',  name: '禁咒祭司',     hp: 300, atk: 40, def: 7,  skill: '六芒反噬',   sprite: E('forbidden_priest', 300, 312) },
  { id: 'elysia',            name: '殘王妃・艾莉西亞', hp: 980, atk: 48, def: 10, skill: '王血反轉', sprite: E('elysia',           300, 306) },

  // ── 灰燼聖約副本 ─────────────────────────────────────────────────────────
  { id: 'covenant_ember',       name: '聖約殘焰',         hp: 180,  atk: 30, def: 5,  skill: '餘火撲擊',   sprite: E('covenant_ember',          222, 320) },
  { id: 'royal_blood_disciple', name: '王血祭徒',         hp: 310,  atk: 38, def: 8,  skill: '王血烙印',   sprite: E('royal_blood_disciple',    261, 320) },
  { id: 'ash_judge',            name: '灰燼審判者',       hp: 420,  atk: 52, def: 12, skill: '審判重斬',   sprite: E('ash_judge',               320, 320) },
  { id: 'mass_resentment',      name: '萬民怨魂',         hp: 260,  atk: 32, def: 4,  skill: '怨火低語',   sprite: E('mass_resentment',         291, 320) },
  { id: 'covenant_guard',       name: '聖約守衛',         hp: 380,  atk: 28, def: 20, skill: '封印護盾',   sprite: E('covenant_guard',          333, 320) },
  { id: 'crown_priest_seron',   name: '王冠祭司・塞羅恩', hp: 800,  atk: 45, def: 14, skill: '祭火召喚',   sprite: E('crown_priest_seron',      306, 320) },
  { id: 'ash_fallen_king_aldrek',name:'灰燼殘王・奧爾德雷克', hp: 3000, atk: 58, def: 18, skill: '王權斷罪', sprite: E('ash_fallen_king_aldrek', 323, 320) },

  // ── 黑潮王座 ──────────────────────────────────────────────────────────────
  { id: 'tidal_shell_guard',    name: '潮殼侍衛',         hp: 320,  atk: 28, def: 16, skill: '漲潮守勢',  sprite: E('tidal_shell_guard',    251, 235) },
  { id: 'azure_jellyfish_envoy',name: '幽藍水母使',       hp: 260,  atk: 25, def: 5,  skill: '幽藍迷光',  sprite: E('azure_jellyfish_envoy',251, 215) },
  { id: 'drowned_court_soldier',name: '溺亡王庭士兵',     hp: 290,  atk: 30, def: 8,  skill: '溺水詛咒',  sprite: E('drowned_court_soldier',251, 253) },
  { id: 'coral_guard_captain',  name: '珊瑚禁衛長',       hp: 480,  atk: 32, def: 20, skill: '珊瑚巨盾',  sprite: E('coral_guard_captain',  251, 249) },
  { id: 'deep_pressure_eel',    name: '深壓巨鰻',         hp: 420,  atk: 38, def: 10, skill: '深壓電擊',  sprite: E('deep_pressure_eel',    251, 241) },
  { id: 'sunken_crown_witch',   name: '沉冠海巫',         hp: 680,  atk: 42, def: 12, skill: '破冠回響',  sprite: E('sunken_crown_witch',   251, 251) },
  { id: 'tide_king_ausrein',    name: '潮汐王・奧瑟雷恩', hp: 2100, atk: 48, def: 14, skill: '沉睡王威',  sprite: E('tide_king_ausrein',    251, 254) },
]
