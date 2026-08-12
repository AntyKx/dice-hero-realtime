/**
 * 敵人 AI 型態定義與各型態的可調參數。純資料，不含任何執行期狀態
 * （執行期狀態機在 ArenaGame.ts 的 EnemyInstance.state/stateTimer 等欄位）。
 * 見 REALTIME_PIVOT_PLAN.md 附近的敵人 AI 重做規劃。
 */

export type EnemyAiType =
  | 'chase' | 'charge' | 'ranged' | 'aoe' | 'summoner' | 'heavy'
  // 森林遺跡固定關卡新增（2026-08，見 src/campaign/）：
  | 'support'     // 森林薩滿：優先治療/Buff 血量不滿的友軍，保持後排不主動進攻
  | 'skirmisher'  // 骷髏斥候：攻擊→拉開距離→重新逼近，不會像 chase 一直黏著
  | 'totem'       // 圖騰/古樹守衛的 Root Core：完全靜止，只有週期技能（召喚/治療/Buff），沒有移動狀態機

/** Chase：靠近到攻擊距離內才停下蓄力揮砍，取代原本的無腦接觸傷害。 */
export const CHASE_CONFIG = {
  attackRange: 40,     // 略大於 ENEMY_CONTACT_RADIUS，讓停下的距離感覺自然
  windupSec: 0.3,
  attackSec: 0.2,      // 攻擊判定幀持續時間（攻擊動作本身）
  cooldownSec: 0.5,
}

/** Charge：荊棘野豬——遠距離鎖定衝鋒，衝完硬直。 */
export const CHARGE_CONFIG = {
  triggerRange: 300,
  windupMin: 0.6,
  windupMax: 0.8,
  dashSpeed: 620,
  dashMaxDurationSec: 1.2, // 保底：撞不到邊界也會在這麼久後自動結束衝刺
  stunSec: 1.0,
  hitRadius: 40,
}

/** Ranged：冰甲騎士——保持距離放箭。 */
export const RANGED_CONFIG = {
  minRange: 220,
  maxRange: 300,
  windupSec: 0.5,
  cooldownSec: 1.6,
  projectileSpeed: 420,
  projectileRadius: 8,
}

/** AoE：史萊姆王——鎖定玩家腳下畫圈，圈內才傷。 */
export const AOE_CONFIG = {
  triggerRange: 260,
  telegraphSec: 1.0,
  cooldownSec: 1.8,
  radius: 90,
}

/** Summoner：冰霜女巫——保持距離＋定期召喚小怪。 */
export const SUMMONER_CONFIG = {
  minRange: 240,
  maxRange: 340,
  summonWindupSec: 0.5,
  summonIntervalSec: 6,
  summonMinCount: 2,
  summonMaxCount: 4,
  summonCap: 6, // 場上同時存在的「被召喚」敵人上限
}

/** Heavy：黑暗騎士（也是 Dragon/Golem 兩隻 Boss 的基礎移動）——慢速追擊+重擊。 */
export const HEAVY_CONFIG = {
  attackRange: 55,
  windupSec: 0.7,
  slamSec: 0.25,
  cooldownSec: 2.2,
  slamRadius: 70,
}

/** Support：森林薩滿——保持跟玩家的距離，優先治療血量不滿的友軍，沒有目標時才考慮攻擊。 */
export const SUPPORT_CONFIG = {
  minRange: 200,
  maxRange: 320,
  healRange: 260,       // 友軍要在這個範圍內才能被治療到
  healWindupSec: 0.6,
  healCooldownSec: 3.0,
  healAmount: 20,        // 每次治療的固定量（低血友軍優先）
  healAllyHpThreshold: 0.9, // 友軍 HP% 低於這個值才算「需要治療」
}

/** Skirmisher：骷髏斥候——比 Chase 快、攻擊後主動拉開距離重新調位，不會一直黏著玩家。 */
export const SKIRMISHER_CONFIG = {
  attackRange: 45,
  windupSec: 0.2,
  attackSec: 0.15,
  cooldownSec: 0.4,
  repositionDistance: 140, // 攻擊後往反方向退開的距離
  repositionSpeedMult: 1.3, // 拉開距離時的移速加成，體現「敏捷」感
}

/** Totem：圖騰/Root Core——完全靜止，只有週期技能，沒有移動/追擊狀態機。 */
export const TOTEM_CONFIG = {
  actionIntervalSec: 4, // 每隔幾秒觸發一次（召喚/治療/Buff，依個別敵人 id 決定行為）
}
