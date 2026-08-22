import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js'
import { loadCharacterFrames, type AnimState } from '../arena/frameLoader'
import { setSpriteHeight, getFrameDurationSec, getStateTotalDurationSec } from '../arena/heroSpriteRig'
import { ALL_CAMPAIGN_STAGE_ENEMIES, type EnemyTypeDef } from '../arena/enemies'
import type {
  AdventureStageDef, AdventureGameState, AdventureHudState, AdventureStageProgress,
  AdventureStageResult, CollectibleDef, ColliderDef, RoomDef,
} from './adventureTypes'
import { defaultAdventureStageProgress } from './adventureTypes'
import { getAdventureStageDef } from './stages'
import { versionedAsset } from '../data'
import { MovementSystem } from './systems/MovementSystem'
import { CollisionSystem } from './systems/CollisionSystem'
import { CameraSystem } from './systems/CameraSystem'
import { RoomSystem } from './systems/RoomSystem'
import { computeRoomFitScale } from './systems/CameraSystem'
import { InteractionSystem } from './systems/InteractionSystem'
import { TriggerSystem } from './systems/TriggerSystem'
import { StoryTriggerSystem } from './systems/StoryTriggerSystem'
import { HazardSystem } from './systems/HazardSystem'
import { CollectibleSystem } from './systems/CollectibleSystem'
import { PuzzleSystem } from './systems/PuzzleSystem'
import { SecretSystem } from './systems/SecretSystem'
import { QuestSystem } from './systems/QuestSystem'
import { AdventureCombatController } from './combat/AdventureCombatController'
import { NpcController } from './npc/NpcController'
import { DialogueController } from './npc/DialogueController'
import { createExitGraphic, getStageExitPrompt, updateExitCheck } from './objects/StageExit'
import { pointInRect } from './geometry'
import type { ArenaCard } from '../arena/cards'
import type { HazardKind, HazardZoneDef } from './adventureTypes'
import type { StarCondition } from '../campaign/campaignTypes'

const BUILD_EXP_PER_KILL = 12
import {
  FOREST01_NPC_ART, FOREST01_COLLECTIBLE_ART,
  FOREST01_ENEMY_STATIC_ART, FOREST01_INTERACTIVE_ART, FOREST01_DISPLAY_HEIGHT,
} from './art/forestRuins01Art'
import {
  FOREST01_V2_ART, FOREST01_ADVENTURE_DISPLAY, getAdventureHeroRenderHeight,
  ADVENTURE_PLAYER_HITBOX_RADIUS,
} from './art/forestRuins01VisualTuning'

export interface AdventureConfig {
  heroId: string
  heroName: string
  heroLevel: number
  stars?: number
  maxHp: number
  heroAtk: number
  partyHeroIds: string[]
  stageId: string
  /** 上次挑戰這關留下的進度（meta.adventureStageProgress[stageId]）——重玩
   * 時已收集的紫幣/星星碎片/已開寶箱/已完成謎題與秘密/已清戰鬤區都要
   * 直接套用，不能整關重生，見 constructor 內的還原邏輯。undefined＝第一次玩。 */
  initialProgress?: AdventureStageProgress
}

const PLAYER_RADIUS = ADVENTURE_PLAYER_HITBOX_RADIUS
const DEBUG_LAYER_Z = 2_000_000

const COLOR_COLLIDER_DEBUG = 0xff4040
const COLOR_TRIGGER_DEBUG = 0xffa030
const COLOR_COMBATZONE_DEBUG = 0xff4040
const COLOR_SECRET_DEBUG = 0xb060ff
const COLOR_NPC_RANGE_DEBUG = 0xffe066
const COLOR_PUZZLE_DEBUG = 0x5090ff
const COLOR_COLLECTIBLE_DEBUG = 0x50e070
const COLOR_ROOM_WALKABLE_DEBUG = 0x30ff90
const COLOR_ROOM_TRANSITION_DEBUG = 0x30d0ff
const COLOR_TERRAIN_COLLIDER_DEBUG = 0xff9020
const COLOR_PLAYER_FOOT_DEBUG = 0xffffff
const COLOR_PLAYER_COLLISION_DEBUG = 0xfacc15
const COLOR_PLAYER_SHADOW_DEBUG = 0x60a5fa
const COLOR_PLAYER_ANCHOR_DEBUG = 0xef4444
const COLOR_PLAYER_YSORT_DEBUG = 0xc084fc
const TOAST_DURATION_SEC = 2.6

// 目前 forest_1_1 是唯一有正式美術的關卡，這份路徑清單只服務它——之後其他
// 關卡若也做正式美術，這裡要改成依 stageId 動態決定要載入哪一包
// art manifest，不是繼續往同一份清單塞。2026-08-19 Room Transition 改版：
// 不再載入單一大 Ground/Foreground/Props（已經被 9 張房間背景取代，見
// stage.rooms[].background——那批圖已經把裝飾道具直接畫進場景裡，不用再
// 另外疊 props sprite），也不再載入 altarObelisk/altarFlame/sealedDoor/
// exitGlow（房間美術本身就有這些視覺，另外疊只會重複）。
function collectForest01ArtPaths(stage: AdventureStageDef): string[] {
  const paths: string[] = [FOREST01_V2_ART.contactShadow]
  // 2026-08-21：房間背景/前景檔名會被同一個關卡的美術重繪覆蓋（例如雪原篇
  // 2-1~2-10 整批換圖，檔名完全不變、只是內容變了）——不像 forest_1_1 那樣
  // 每次改圖都換資料夾名稱（rooms_v2/foreground_v13）。跟先前修過的
  // frame 圖 Cloudflare 邊緣快取問題（feedback_dicehero_cdn_edge_cache_frames）
  // 同一個成因，這裡一律加 versionedAsset() 的 ?v= 版號，換版時保證繞過
  // CDN 快取讀到新圖。buildScene() 裡實際查表時要用同一個
  // versionedAsset() 包過的字串當 key，兩邊不一致會找不到材質。
  paths.push(...(stage.rooms ?? []).map(r => versionedAsset(r.background)))
  paths.push(...(stage.rooms ?? []).map(r => r.foreground).filter((v): v is string => !!v).map(versionedAsset))
  paths.push(...Object.values(FOREST01_NPC_ART))
  paths.push(...Object.values(FOREST01_COLLECTIBLE_ART))
  paths.push(...Object.values(FOREST01_ENEMY_STATIC_ART).filter((v): v is string => !!v))
  const ia = FOREST01_INTERACTIVE_ART
  paths.push(
    ...Object.values(ia.brazierLit), ia.brazierUnlit,
    ia.vineGateClosed, ia.vineGateOpen, ia.wallIntact, ia.wallBroken,
    ia.treasureOpen, ia.treasureClosed,
  )
  return paths
}

interface FloatingSprite {
  sprite: Sprite
  baseX: number
  baseY: number
  baseScale: number
  seed: number
  speed: number
  amplitude: number
}

interface TimedFx {
  sprite: Sprite
  life: number
  maxLife: number
}

/** 藤蔓門系 colliderId——Room Transition 改版後兩場戰鬤都不再用實體閘門
 * （見 forestRuins01.ts combatZones 的 gateColliderIds:[] 註解），目前只剩
 * 三火盆謎題這一道，用 Set 保留擴充彈性（以後真的多一道也不用改判斷邏輯）。 */
const VINE_GATE_COLLIDER_IDS = new Set(['puzzle_vine_gate'])

/**
 * Adventure Stage 探索引擎（2026-08-19 建立，2026-08-19 稍晚換上正式美術）。
 * 跟 ArenaGame.ts 平行、獨立的 PixiJS Application——不共用 class，但同樣是
 * 「單一 worldLayer + camera，探索/戰鬤/劇情/謎題全部在同一張畫布切換狀態」
 * 的架構，不會有跳頁弄丟場景狀態的問題。
 *
 * 這個類別本身是協調者：實際規則邏輯分散在 systems/combat/npc 底下的各個
 * System/Controller，這裡只負責建立 Pixi 場景（Ground/Foreground/Y-sort
 * 物件全部是 worldLayer 底下 sortableChildren 的子物件，靠 zIndex=y 排序，
 * ground 維持預設 zIndex 永遠墊底，foreground/debug 疊層給極大 zIndex 永遠
 * 蓋在最上面）、跑主迴圈、把各 System 串起來、彙整 HUD 狀態丟給 React 層
 * （AdventureStageScreen.tsx）。
 */
export class AdventureGame {
  app: Application | null = null
  worldLayer!: Container
  private debugLayer!: Container
  private debugPlayerFootRect?: Graphics
  private debugPlayerCollisionCircle?: Graphics
  private debugPlayerShadowBounds?: Graphics
  private debugPlayerAnchor?: Graphics
  private debugPlayerYSortLine?: Graphics
  debugArtMode = false
  stage: AdventureStageDef
  destroyed = false

  player = { x: 0, y: 0, hp: 0, maxHp: 0, radius: PLAYER_RADIUS }
  playerSprite: Sprite | null = null
  private shadowSprite: Sprite | null = null
  private fadeOverlay: Graphics | null = null
  private roomMask: Graphics | null = null
  private containerResizeObserver: ResizeObserver | null = null
  private containerEl: HTMLElement | null = null
  private roomBackgroundSprite = new Map<string, Sprite>()
  /** 2026-08-19：之前只在 init() 建立玩家 sprite 時用了一次 heroFrames.idle[0]，
   * 之後從來沒有切換過 texture——玩家移動/攻擊時角色貼圖完全靜止，是真的
   * bug，不是美術限制。存起來給 updatePlayerAnim() 依 moveDir/攻擊狀態逐幀
   * 切換，跟 ArenaGame.ts 同一套 heroSpriteRig.ts 的 frame duration 資料。 */
  private heroFrames: Record<AnimState, Texture[]> | null = null
  private playerAnimState: AnimState = 'idle'
  private playerAnimFrame = 0
  private playerAnimTimer = 0
  private playerAttackAnimTimer = 0
  moveDir = { x: 0, y: 0 }
  facing: 'left' | 'right' = 'right'
  camera = { x: 0, y: 0 }
  state: AdventureGameState = 'explore'
  elapsed = 0

  heroId: string
  heroName: string
  heroLevel: number
  heroAtk: number
  partyHeroIds: string[]

  enemyTypeDefs: Record<string, EnemyTypeDef> = ALL_CAMPAIGN_STAGE_ENEMIES
  enemyFrames: Record<string, Record<AnimState, Texture[]>> = {}
  private art: Record<string, Texture> = {}

  colliderActive = new Map<string, boolean>()
  private colliderSprite = new Map<string, Sprite>()

  areasDiscovered = new Set<string>()
  secretsDiscovered = new Set<string>()
  puzzlesCompleted = new Set<string>()
  questsCompleted = new Set<string>()
  clearedCombatZones = new Set<string>()
  revealedCollectibles = new Set<string>()

  private collectedIds = new Set<string>()
  private purpleCoinIds = new Set<string>()
  private starPieceIds = new Set<string>()
  private treasureIds = new Set<string>()
  private collectibleSprite = new Map<string, Sprite>()
  private brazierSprite = new Map<string, Sprite>()
  private npcSprite = new Map<string, Sprite>()
  private floatingSprites: FloatingSprite[] = []
  private activeFx: TimedFx[] = []
  private shakeTimers = new Map<string, { baseX: number; timer: number }>()

  flags: Record<string, boolean> = {}
  pendingGold = 0
  pendingEnhanceStones = 0
  pendingHeroExp = 0
  pendingPurpleCoinBonus = 0

  // ── 關卡內 Build（2026-08-21，雪原篇 2-1 起，stage.inStageBuild） ────────
  /** 累計擊殺 EXP／目前等級，只有 stage.inStageBuild 的關卡會累積。 */
  buildExp = 0
  buildLevel = 1
  private buildPickPreviousState: AdventureGameState = 'explore'
  /** ArenaCard 疊加的即時屬性加成，套用點見 applyBuildCard()——跟
   * ArenaGame.ts 的 applyCard() 是同一套 ArenaCardEffect，直接共用
   * src/arena/cards.ts 不重新設計一份卡池。 */
  bonusDamage = 0
  atkCooldownMult = 1
  moveSpeedMult = 1
  /** Boss 技能命中次數統計（例如 frost_wolf_leap），給 avoid_skill 星星
   * 條件用，見 commitStageFinish() 的 checkStarCondition()。 */
  skillHitCounts: Record<string, number> = {}

  private toastText: string | null = null
  private toastTimer = 0
  private lastInteractionKey: string | null = null
  private lastStageExitPrompt: string | null = null
  private finalResult: AdventureHudState['stageResult'] = null
  // 2026-08-20：出口不再「踩到當下瞬間切結算畫面」，改成先鎖輸入淡出，
  // 淡出播完才真的呼叫 commitStageFinish() 建立結果——pendingFinishWon 記
  // 這段淡出期間「已經確定要結算、但還沒真的結算」的中繼狀態。
  private pendingFinishWon: boolean | null = null
  private stageFinishFadeTimer = 0
  private readonly stageFinishFadeSec = 0.28

  get isFinalizingStage(): boolean {
    return this.pendingFinishWon !== null && this.finalResult === null
  }

  // ── Systems / Controllers ──────────────────────────────────────────────
  movement = new MovementSystem(this)
  collision = new CollisionSystem(this)
  cameraSystem = new CameraSystem(this)
  /** stage.rooms[0] 才知道要從哪個房間開始，這個 stage 要等 constructor
   * 內文才會賦值，所以 roomSystem 沒辦法跟其他 system 一樣用欄位預設值
   * 建立，改成 constructor 內文手動 new（見下方）。 */
  roomSystem!: RoomSystem
  interaction = new InteractionSystem(this)
  trigger = new TriggerSystem(this)
  storyTrigger = new StoryTriggerSystem(this)
  hazard = new HazardSystem(this)
  collectible = new CollectibleSystem(this)
  puzzle = new PuzzleSystem(this)
  secret = new SecretSystem(this)
  quest = new QuestSystem(this)
  combat = new AdventureCombatController(this)
  npc = new NpcController(this)
  dialogue = new DialogueController(this)

  constructor(private cfg: AdventureConfig, private onHudChange: (s: AdventureHudState) => void) {
    const stage = getAdventureStageDef(cfg.stageId)
    if (!stage) throw new Error(`Adventure Stage 資料找不到：${cfg.stageId}`)
    this.stage = stage
    this.heroId = cfg.heroId
    this.heroName = cfg.heroName
    this.heroLevel = cfg.heroLevel
    this.heroAtk = cfg.heroAtk
    this.partyHeroIds = cfg.partyHeroIds.length > 0 ? cfg.partyHeroIds : [cfg.heroId]
    this.player.hp = cfg.maxHp
    this.player.maxHp = cfg.maxHp
    this.roomSystem = new RoomSystem(this, stage.rooms?.[0]?.id ?? '')
    for (const c of stage.colliders) this.colliderActive.set(c.id, c.active ?? true)

    const p = cfg.initialProgress
    if (p) {
      this.areasDiscovered = new Set(p.discoveredAreas)
      this.secretsDiscovered = new Set(p.discoveredSecrets)
      this.puzzlesCompleted = new Set(p.completedPuzzles)
      this.questsCompleted = new Set(p.completedQuests)
      this.clearedCombatZones = new Set(p.clearedCombatZones)
      this.flags = { ...p.flags }
      this.purpleCoinIds = new Set(p.collectedPurpleCoins)
      this.starPieceIds = new Set(p.collectedStarPieces)
      this.treasureIds = new Set(p.openedTreasures)
      this.collectedIds = new Set([...this.purpleCoinIds, ...this.starPieceIds, ...this.treasureIds])
      // 已完成的任務代表任務道具（例如遺失的小熊）也一定已經撿過，
      // AdventureStageProgress 沒有另外存一份「已撿收集品」清單給任務道具用。
      for (const quest of stage.quests) {
        if (this.questsCompleted.has(quest.id)) this.collectedIds.add(quest.requiredCollectibleId)
      }
      // 已解開的秘密要讓它藏著的收集品直接可見/可撿，不用再打一次假牆/裂牆。
      for (const secret of stage.secrets) {
        if (this.secretsDiscovered.has(secret.id)) {
          for (const cid of secret.revealsCollectibleIds) this.revealedCollectibles.add(cid)
        }
      }
      // 已清空的戰鬤區跟已完成的謎題，藤蔓門/裂牆/柵欄要維持開啟狀態。
      for (const zone of stage.combatZones) {
        if (this.clearedCombatZones.has(zone.id)) {
          for (const id of zone.gateColliderIds) this.colliderActive.set(id, false)
        }
      }
      for (const puzzle of stage.puzzles) {
        if (this.puzzlesCompleted.has(puzzle.id)) {
          this.colliderActive.set(puzzle.gateColliderId, false)
          this.puzzle.markPuzzleAlreadyComplete(puzzle.id)
        }
      }
      for (const quest of stage.quests) {
        if (this.questsCompleted.has(quest.id)) this.quest.markAlreadyCompleted(quest.id)
      }
    }
  }

  async init(container: HTMLElement): Promise<void> {
    this.containerEl = container
    // 2026-08-19 最終版：實機除錯數字證實 container/canvas/renderer 三個
    // 已經可以對齊（上一版手動 resize 那段做對了），真正剩下的落差是
    // .adv-screen 的 CSS 高度沒有把 iOS standalone 狀態列的
    // env(safe-area-inset-top) 加回去（100dvh 本身是「扣掉安全區」的保守
    // 值，Ground 卻設計成要畫到狀態列後面）——這個已經在 styles.css 的
    // .adv-screen 修正。CSS 決定「container 實際應該多大」，這裡不再自己
    // 用 visualViewport／innerWidth 猜尺寸，改成 ResizeObserver 直接看
    // container 被 CSS 排版完之後的真實 boundingClientRect，天然就會在
    // safe-area-inset-top 這種要等一輪 layout 才 settle 的 CSS 值算出來後
    // 自動觸發一次，不用自己猜要補幾次 rAF。
    const resizeRenderer = () => {
      const rect = container.getBoundingClientRect()
      const w = Math.round(rect.width)
      const h = Math.round(rect.height)
      if (w > 0 && h > 0) this.app?.renderer.resize(w, h)
    }
    const resizeObserver = new ResizeObserver(resizeRenderer)
    resizeObserver.observe(container)
    this.containerResizeObserver = resizeObserver

    const app = new Application()
    const initialRect = container.getBoundingClientRect()
    await app.init({
      // resizeTo 交給上面的 ResizeObserver 手動處理，這裡只給 init 當下的
      // 初始值（避免量到 0）。
      width: initialRect.width || window.innerWidth,
      height: initialRect.height || window.innerHeight,
      backgroundColor: this.stage.groundColor,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })
    if (this.destroyed) { app.destroy(true, { children: true, texture: false }); return }
    this.app = app
    container.appendChild(app.canvas)
    resizeRenderer() // app 剛建立完，立刻照 container 當下的真實尺寸校正一次

    this.worldLayer = new Container()
    this.worldLayer.sortableChildren = true
    app.stage.addChild(this.worldLayer)

    // Room Transition 遮罩：9 個房間背景全部常駐在同一個 worldLayer 裡
    // （不同 atlasOrigin，互不重疊），但畫面比例跟房間 1280x720 對不上時
    // （例如直向手機），contain-fit 縮放後房間上下會留白，若不裁切，那塊
    // 留白會直接透出 atlas 上下相鄰的其他房間背景——這是實測抓到的真的
    // bug（螢幕同時看到兩個房間疊在一起），不是我算錯 scale。加一個永遠
    // 跟著目前房間世界座標範圍畫的矩形遮罩，裁掉不屬於目前房間的部分，
    // 留白處就會乖乖露出畫布 backgroundColor，不會看到別間房間。
    // 2026-08-19 修正：上一版這裡多加了 roomMask.renderable = false，結果
    // 變成整個畫面全綠（只剩 app 的 groundColor 背景色）——Pixi 對「子節點
    // 同時是自己的 mask」這個常見寫法，本來就會自動跳過該子節點的一般
    // render pass，不需要另外關 renderable；關了反而連 mask 該畫的
    // stencil 幾何一起被跳過，等於整塊 worldLayer 被裁成空的。加進
    // worldLayer 純粹是為了讓它的 transform 自動跟著父層更新，不用手動同步。
    const roomMask = new Graphics()
    this.worldLayer.addChild(roomMask)
    this.worldLayer.mask = roomMask
    this.roomMask = roomMask
    this.updateRoomMask()

    const heroStars = Math.min(3, Math.max(0, this.cfg.stars ?? 0))
    const enemyIds = this.collectUsedEnemyIds()
    const artPaths = collectForest01ArtPaths(this.stage)
    const [heroFrames, enemyFrameList, artTextures] = await Promise.all([
      loadCharacterFrames(`/assets/frames/heroes/${this.heroId}/s${heroStars}`),
      Promise.all(enemyIds.map(id => loadCharacterFrames(`/assets/frames/enemies/${this.enemyTypeDefs[id]?.placeholderSpriteId ?? id}`))),
      Assets.load<Texture>(artPaths) as Promise<Record<string, Texture>>,
    ])
    if (this.destroyed) return
    enemyIds.forEach((id, i) => { this.enemyFrames[id] = enemyFrameList[i] })
    this.art = artTextures
    this.heroFrames = heroFrames

    this.buildScene()

    this.player.x = this.stage.spawn.x
    this.player.y = this.stage.spawn.y

    // 探索畫面的英雄顯示尺寸跟 Arena 戰鬤特寫（60px）分開算，見
    // forestRuins01VisualTuning.ts 開頭註解——不要改回 getHeroRenderHeight()。
    const shadow = new Sprite(this.tex(FOREST01_V2_ART.contactShadow))
    shadow.anchor.set(0.5)
    shadow.width = FOREST01_ADVENTURE_DISPLAY.contactShadowWidth
    shadow.height = FOREST01_ADVENTURE_DISPLAY.contactShadowHeight
    shadow.alpha = FOREST01_ADVENTURE_DISPLAY.contactShadowAlpha
    shadow.x = this.player.x
    shadow.y = this.player.y + FOREST01_ADVENTURE_DISPLAY.contactShadowOffsetY
    shadow.zIndex = this.player.y - 1
    this.worldLayer.addChild(shadow)
    this.shadowSprite = shadow

    const playerSprite = new Sprite(heroFrames.idle[0])
    playerSprite.anchor.set(0.5, heroFrames.idle.length > 1 ? 1 : 0.5)
    setSpriteHeight(playerSprite, getAdventureHeroRenderHeight(this.heroId))
    playerSprite.x = this.player.x
    playerSprite.y = this.player.y
    playerSprite.zIndex = this.player.y
    this.worldLayer.addChild(playerSprite)
    this.playerSprite = playerSprite

    // Room Transition 用的黑幕：故意加在 app.stage（不是 worldLayer），這樣
    // 才不會被 CameraSystem 的 scale/position 影響，永遠原封不動蓋滿畫面。
    // 尺寸給很大一塊固定值，不用每幀依螢幕大小重畫。
    const fadeOverlay = new Graphics().rect(-4000, -4000, 8000, 8000).fill({ color: 0x000000 })
    fadeOverlay.alpha = 0
    fadeOverlay.eventMode = 'none'
    app.stage.addChild(fadeOverlay)
    this.fadeOverlay = fadeOverlay

    this.onRoomEntered(this.roomSystem.activeRoom)
    this.cameraSystem.update()
    this.emitHud()

    app.ticker.add(ticker => this.update(ticker.deltaMS / 1000))
  }

  /** 收集這關實際會用到的敵人 id（正式戰鬤區＋任務擊殺目標），預先載入貼圖。 */
  private collectUsedEnemyIds(): string[] {
    const ids = new Set<string>()
    for (const zone of this.stage.combatZones) for (const wave of zone.waves) for (const w of wave) ids.add(w.enemyId)
    for (const q of this.stage.quests) ids.add(q.killTarget.enemyId)
    return [...ids]
  }

  private tex(path: string): Texture {
    const t = this.art[path]
    if (!t) throw new Error(`Adventure art texture 沒載入到：${path}`)
    return t
  }

  /** 給 AdventureCombatController 查詢：這個敵人 typeId 有沒有專屬的靜態
   * 立繪（例如花圃小怪的可愛史萊姆插畫）。有的話戰鬤生成時改用這張單張圖
   * 取代 frameLoader 逐幀動畫——這批圖只有單張插畫，沒有走路/攻擊/受擊幀。 */
  getEnemyStaticTexture(typeId: string): Texture | undefined {
    const path = FOREST01_ENEMY_STATIC_ART[typeId]
    return path ? this.art[path] : undefined
  }

  private makeSprite(path: string, targetHeight: number, anchor: { x: number; y: number } = { x: 0.5, y: 1 }): Sprite {
    const sprite = new Sprite(this.tex(path))
    sprite.anchor.set(anchor.x, anchor.y)
    setSpriteHeight(sprite, targetHeight)
    return sprite
  }

  // ── 場景建置：9 個房間背景（各自 atlasOrigin 定位，原生尺寸不縮放）→
  //    互動物件/NPC/玩家/敵人（同一個 sortableChildren worldLayer，zIndex=y
  //    做 Y-sort）→ Debug。房間背景圖本身已經把帳篷/營火/柱子/花圃這些裝飾
  //    畫進場景了，不用再另外疊 props sprite（那是連續世界版本的做法）。 ──

  private buildScene() {
    for (const room of this.stage.rooms ?? []) {
      const tex = this.tex(versionedAsset(room.background))
      // 2026-08-19 抓到的真的 bug：這批房間圖實際檔案是 941x1672，不是
      // room.size 寫的 1080x1920（差了約 14.8%）。Sprite 沒有另外指定
      // width/height 時預設用「材質原始像素尺寸」，等於背景實際只蓋住
      // 世界座標 0~941/0~1672 這一塊，右下角還有一截 1080/1920 的範圍是
      // 空的——但可走範圍/出口/收集品/鏡頭 cover-fit 全部是照 1080x1920
      // 這個「邏輯房間尺寸」算的。結果就是：CameraSystem 算出來的 scale
      // 數字完全正確，套用到 worldLayer 上也完全正確，但背景圖本身沒有
      // 撐滿它應該代表的範圍，畫面看起來就是「填不滿」——問題不在鏡頭，
      // 在背景 sprite 沒有明確拉到 room.size。這裡明確指定 width/height，
      // 不管來源檔案實際幾 px，永遠強制對齊邏輯房間尺寸。
      if (import.meta.env.DEV && (tex.width !== room.size.width || tex.height !== room.size.height)) {
        console.warn(`[AdventureGame] 房間「${room.id}」背景材質尺寸(${tex.width}x${tex.height})跟 room.size(${room.size.width}x${room.size.height})不符，已強制拉到 room.size——來源圖建議之後補正確尺寸，這裡只是保底。`)
      }
      const bg = new Sprite(tex)
      bg.position.set(room.atlasOrigin.x, room.atlasOrigin.y)
      bg.width = room.size.width
      bg.height = room.size.height
      bg.zIndex = -1 // 永遠墊底，房間內容 y 座標最小也是 room.atlasOrigin.y(>=0)，-1 保證比任何內容都低
      this.worldLayer.addChild(bg)
      this.roomBackgroundSprite.set(room.id, bg)

      // 2026-08-20 修正：真正的前景遮擋層，改成依每個獨立物件切塊、各自用
      // 自己的 zIndex=底部 y 座標排序（見 adventureTypes.ts RoomDef.
      // foregroundPiecesLocal 註解）——上一版整張圖用固定 zIndex 蓋在角色
      // 上面，玩家不管站在物件前面還後面都被蓋住，變成「角色被切一半」的
      // bug，這裡改用跟其他 actor 一致的 y-sort 規則。
      if (room.foreground && room.foregroundPiecesLocal) {
        const fgBaseTex = this.tex(versionedAsset(room.foreground))
        for (const piece of room.foregroundPiecesLocal) {
          const pieceTex = new Texture({
            source: fgBaseTex.source,
            frame: new Rectangle(piece.x, piece.y, piece.width, piece.height),
          })
          const fg = new Sprite(pieceTex)
          fg.position.set(room.atlasOrigin.x + piece.x, room.atlasOrigin.y + piece.y)
          fg.zIndex = room.atlasOrigin.y + piece.y + piece.height
          this.worldLayer.addChild(fg)
        }
      }
    }

    const H = FOREST01_DISPLAY_HEIGHT
    this.buildInteractiveObjects(H)
    for (const npc of this.stage.npcs) this.buildNpcSprite(npc, FOREST01_ADVENTURE_DISPLAY.npcHeight)
    for (const c of this.stage.collectibles) this.buildCollectibleSprite(c, H)

    this.buildDebugLayer()
  }

  private buildInteractiveObjects(H: typeof FOREST01_DISPLAY_HEIGHT) {
    const IA = FOREST01_INTERACTIVE_ART

    // 三火盆謎題：已完成的謎題直接顯示點燃狀態，不用重新打一次。
    for (const puzzle of this.stage.puzzles) {
      const alreadyLit = this.puzzlesCompleted.has(puzzle.id)
      for (const b of puzzle.braziers) {
        const litTex = IA.brazierLit[b.id] ?? IA.brazierLit.brazier_01
        const path = alreadyLit ? litTex : IA.brazierUnlit
        const sprite = this.makeSprite(path, H.brazier)
        sprite.x = b.x; sprite.y = b.y; sprite.zIndex = b.y
        this.worldLayer.addChild(sprite)
        this.brazierSprite.set(`${puzzle.id}:${b.id}`, sprite)
      }
    }

    // 藤蔓門／裂牆類 collider：依目前 active 狀態決定要顯示關閉還開啟的貼圖。
    for (const c of this.stage.colliders) {
      const sprite = this.buildColliderSprite(c, H)
      if (!sprite) continue
      this.worldLayer.addChild(sprite)
      this.colliderSprite.set(c.id, sprite)
    }
  }

  /** breakable_wall／vine_gate 兩種 collider 對應到各自的貼圖；其餘（例如
   * 未來新增、沒有對應美術的 collider）回傳 null，不畫東西。 */
  private buildColliderSprite(c: ColliderDef, H: typeof FOREST01_DISPLAY_HEIGHT): Sprite | null {
    const IA = FOREST01_INTERACTIVE_ART
    const active = this.colliderActive.get(c.id) ?? true
    const cx = c.rect.x + c.rect.width / 2
    const cy = c.rect.y + c.rect.height / 2

    let sprite: Sprite | null = null
    if (this.secretsDiscoveredWall(c.id)) {
      sprite = this.makeSprite(IA.wallBroken, H.wall, { x: 0.5, y: 0.5 })
    } else if (this.stage.secrets.some(s => s.id === c.id && s.kind === 'breakable_wall')) {
      sprite = this.makeSprite(IA.wallIntact, H.wall, { x: 0.5, y: 0.5 })
    } else if (VINE_GATE_COLLIDER_IDS.has(c.id)) {
      sprite = this.makeSprite(active ? IA.vineGateClosed : IA.vineGateOpen, H.vineGate, { x: 0.5, y: 0.5 })
    }
    if (!sprite) return null
    sprite.x = cx; sprite.y = cy; sprite.zIndex = cy
    return sprite
  }

  private secretsDiscoveredWall(colliderId: string): boolean {
    return this.stage.secrets.some(s => s.id === colliderId && s.kind === 'breakable_wall') && this.secretsDiscovered.has(colliderId)
  }

  private buildNpcSprite(npcDef: AdventureStageDef['npcs'][number], height: number) {
    const state = this.questsCompleted.size > 0 && this.stage.quests.some(q => q.npcId === npcDef.id && this.questsCompleted.has(q.id))
      ? 'happy' : 'idle'
    const sprite = this.makeSprite(FOREST01_NPC_ART[state], height)
    sprite.x = npcDef.x; sprite.y = npcDef.y; sprite.zIndex = npcDef.y
    this.worldLayer.addChild(sprite)
    this.npcSprite.set(npcDef.id, sprite)
  }

  private buildCollectibleSprite(c: CollectibleDef, H: typeof FOREST01_DISPLAY_HEIGHT) {
    const CA = FOREST01_COLLECTIBLE_ART
    let path: string
    let height: number
    if (c.kind === 'purple_coin') { path = CA.purpleCoin; height = H.purpleCoin }
    else if (c.kind === 'star_piece') { path = CA.starPiece; height = H.starPiece }
    else if (c.kind === 'quest_item') { path = CA.dirtyTeddy; height = H.dirtyTeddy }
    else { path = this.treasureIds.has(c.id) ? FOREST01_INTERACTIVE_ART.treasureOpen : FOREST01_INTERACTIVE_ART.treasureClosed; height = H.treasure }

    const sprite = this.makeSprite(path, height)
    sprite.x = c.x; sprite.y = c.y; sprite.zIndex = c.y
    const alreadyGone = this.isCollected(c.id)
    const isHiddenAndNotRevealed = !!c.hidden && !this.revealedCollectibles.has(c.id)
    sprite.visible = !c.locked && !alreadyGone && !isHiddenAndNotRevealed
    this.worldLayer.addChild(sprite)
    this.collectibleSprite.set(c.id, sprite)

    if (!alreadyGone && (c.kind === 'purple_coin' || c.kind === 'star_piece')) {
      this.floatingSprites.push({
        sprite, baseX: c.x, baseY: c.y, baseScale: sprite.scale.y,
        seed: (c.x + c.y) * 0.01, speed: c.kind === 'star_piece' ? 1.4 : 2,
        amplitude: c.kind === 'star_piece' ? 5 : 4,
      })
    }
  }

  private buildDebugLayer() {
    const layer = new Container()
    layer.zIndex = DEBUG_LAYER_Z
    layer.visible = this.debugArtMode
    this.debugLayer = layer
    this.worldLayer.addChild(layer)

    for (const c of this.stage.colliders) {
      const g = new Graphics().rect(0, 0, c.rect.width, c.rect.height).stroke({ color: COLOR_COLLIDER_DEBUG, width: 2 })
      g.x = c.rect.x; g.y = c.rect.y
      layer.addChild(g)
    }
    for (const t of this.stage.triggers) {
      const g = new Graphics().rect(0, 0, t.area.width, t.area.height).stroke({ color: COLOR_TRIGGER_DEBUG, width: 2 })
      g.x = t.area.x; g.y = t.area.y
      layer.addChild(g)
    }
    for (const zone of this.stage.combatZones) {
      const g = new Graphics().rect(0, 0, zone.area.width, zone.area.height).fill({ color: COLOR_COMBATZONE_DEBUG, alpha: 0.12 }).stroke({ color: COLOR_COMBATZONE_DEBUG, width: 2 })
      g.x = zone.area.x; g.y = zone.area.y
      layer.addChild(g)
    }
    for (const secret of this.stage.secrets) {
      const g = new Graphics().rect(0, 0, secret.area.width, secret.area.height).stroke({ color: COLOR_SECRET_DEBUG, width: 2 })
      g.x = secret.area.x; g.y = secret.area.y
      layer.addChild(g)
    }
    for (const npcDef of this.stage.npcs) {
      const g = new Graphics().circle(0, 0, npcDef.interactRadius ?? 46).stroke({ color: COLOR_NPC_RANGE_DEBUG, width: 2 })
      g.x = npcDef.x; g.y = npcDef.y
      layer.addChild(g)
    }
    for (const puzzle of this.stage.puzzles) {
      for (const b of puzzle.braziers) {
        const g = new Graphics().circle(0, 0, 46).stroke({ color: COLOR_PUZZLE_DEBUG, width: 2 })
        g.x = b.x; g.y = b.y
        layer.addChild(g)
      }
    }
    for (const c of this.stage.collectibles) {
      const g = new Graphics().circle(0, 0, 26).stroke({ color: COLOR_COLLECTIBLE_DEBUG, width: 1.5 })
      g.x = c.x; g.y = c.y
      layer.addChild(g)
    }
    const exitDebug = createExitGraphic(this.stage.exit.radius)
    exitDebug.x = this.stage.exit.x; exitDebug.y = this.stage.exit.y
    layer.addChild(exitDebug)

    // 2026-08-19 Room Transition：綠色＝每個房間的 walkableBounds，
    // 藍色＝房間的 transition zone（踩進去會 fade 換房）。
    for (const room of this.stage.rooms ?? []) {
      const wb = room.walkableBoundsLocal
      const wg = new Graphics().rect(0, 0, wb.width, wb.height)
        .fill({ color: COLOR_ROOM_WALKABLE_DEBUG, alpha: 0.06 }).stroke({ color: COLOR_ROOM_WALKABLE_DEBUG, width: 2 })
      wg.x = room.atlasOrigin.x + wb.x; wg.y = room.atlasOrigin.y + wb.y
      layer.addChild(wg)
      for (const t of room.transitions) {
        const zg = new Graphics().rect(0, 0, t.zone.width, t.zone.height)
          .fill({ color: COLOR_ROOM_TRANSITION_DEBUG, alpha: 0.25 }).stroke({ color: COLOR_ROOM_TRANSITION_DEBUG, width: 2 })
        zg.x = room.atlasOrigin.x + t.zone.x; zg.y = room.atlasOrigin.y + t.zone.y
        layer.addChild(zg)
      }
      // 橘框＝這個房間的靜態地形碰撞（terrainCollidersLocal），跟現有的
      // 紅框（stage.colliders，藤蔓門/裂牆這類動態機關）分開顏色，手機
      // 逐房驗收時一眼就能分出「這塊擋路是美術地形還是可開關的機關」。
      for (const tc of room.terrainCollidersLocal ?? []) {
        const cg = new Graphics().rect(0, 0, tc.rect.width, tc.rect.height)
          .fill({ color: COLOR_TERRAIN_COLLIDER_DEBUG, alpha: 0.18 }).stroke({ color: COLOR_TERRAIN_COLLIDER_DEBUG, width: 2 })
        cg.x = room.atlasOrigin.x + tc.rect.x; cg.y = room.atlasOrigin.y + tc.rect.y
        layer.addChild(cg)
      }
      // 青色＝環境危害區（目前只有 ice_floor），跟橘色地形碰撞分開顏色——
      // 危害不擋路，只改變移動手感，混在一起容易誤判成「這裡會卡住」。
      for (const hz of (this.stage.hazards ?? []).filter(h => h.roomId === room.id)) {
        const hg = new Graphics().rect(0, 0, hz.area.width, hz.area.height)
          .fill({ color: 0x40e0ff, alpha: 0.14 }).stroke({ color: 0x40e0ff, width: 2 })
        hg.x = room.atlasOrigin.x + hz.area.x; hg.y = room.atlasOrigin.y + hz.area.y
        layer.addChild(hg)
      }
    }

    // 角色接地校準 overlay：全部圖形都以玩家 world position（腳底錨點）為
    // 基準，每幀一起跟著移動。白色方框才是 CollisionSystem 實際用的判定
    // 形狀（正方形，不是圓）——黃色圓只是給一個好認的視覺參考半徑，兩者
    // 同時畫出來，對角線角落請以白色方框為準，圓形範圍比實際判定小一圈。
    const footRect = new Graphics()
      .rect(-PLAYER_RADIUS, -PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)
      .stroke({ color: COLOR_PLAYER_FOOT_DEBUG, width: 1, alpha: 0.45 })
    const collisionCircle = new Graphics()
      .circle(0, 0, PLAYER_RADIUS)
      .stroke({ color: COLOR_PLAYER_COLLISION_DEBUG, width: 2 })
    const shadowBounds = new Graphics()
      .ellipse(0, 4, Math.max(18, PLAYER_RADIUS * 1.65), Math.max(6, PLAYER_RADIUS * 0.42))
      .fill({ color: COLOR_PLAYER_SHADOW_DEBUG, alpha: 0.16 })
      .stroke({ color: COLOR_PLAYER_SHADOW_DEBUG, width: 1, alpha: 0.9 })
    const anchor = new Graphics()
      .moveTo(-7, 0).lineTo(7, 0)
      .moveTo(0, -7).lineTo(0, 7)
      .stroke({ color: COLOR_PLAYER_ANCHOR_DEBUG, width: 2 })
      .circle(0, 0, 3).fill({ color: COLOR_PLAYER_ANCHOR_DEBUG })
    const ySortLine = new Graphics()
      .moveTo(-34, 0).lineTo(34, 0)
      .stroke({ color: COLOR_PLAYER_YSORT_DEBUG, width: 2, alpha: 0.95 })
    layer.addChild(shadowBounds)
    layer.addChild(collisionCircle)
    layer.addChild(ySortLine)
    layer.addChild(footRect)
    layer.addChild(anchor)
    this.debugPlayerFootRect = footRect
    this.debugPlayerCollisionCircle = collisionCircle
    this.debugPlayerShadowBounds = shadowBounds
    this.debugPlayerAnchor = anchor
    this.debugPlayerYSortLine = ySortLine
  }

  toggleDebugArtMode() {
    this.debugArtMode = !this.debugArtMode
    if (this.debugLayer) this.debugLayer.visible = this.debugArtMode
    this.emitHud() // 立刻刷新 debugScreenText，不用等下一次自然觸發
  }

  /** 玩家回報「畫面沒填滿」但沒辦法遠端裝置除錯，用這組數字讓截圖直接把
   * app.screen／window/room 尺寸帶回來——不用再繼續猜 CSS。 */
  private buildDebugScreenText(): string | null {
    if (!this.debugArtMode || !this.app) return null
    const room = this.roomSystem.activeRoom
    // 2026-08-19：光印「算出來的 scale」騙過自己兩次了——公式對、但套用
    // 過程中有別的地方（這次抓到是背景 sprite 沒有明確拉伸到 room.size，
    // 用材質原始像素尺寸在畫）沒對齊，數字看起來對但畫面不對。這次改印
    // 每一層「實際套用後」量到的真實值，不是只印計算結果：container 的
    // CSS 尺寸、canvas 的實際渲染尺寸、Pixi renderer 的內部尺寸、
    // worldLayer 真的套上去的 scale、背景 sprite 套用 width/height 後的
    // 實際渲染尺寸——每一層都印出來，哪一層兜不起來一眼就看得出來。
    const scale = computeRoomFitScale(this.app.screen.width, this.app.screen.height, room.size)
    const bg = this.roomBackgroundSprite.get(room.id)
    const canvasEl = this.app.canvas
    const advScreenEl = this.containerEl?.parentElement // .adv-canvas-wrap 的父層就是 .adv-screen
    const advScreenRect = advScreenEl?.getBoundingClientRect()
    const wrapRect = this.containerEl?.getBoundingClientRect()
    const canvasRect = canvasEl.getBoundingClientRect()
    const renderedW = room.size.width * this.worldLayer.scale.x
    const renderedH = room.size.height * this.worldLayer.scale.y
    // safeAreaTop：沒有直接的 JS API 能讀 env(safe-area-inset-top) 的 px
    // 值，用 .adv-screen 實際量到的高度減掉 window.innerHeight（約等於
    // 100dvh）反推——跟這次抓 bug 用的推論方式一樣，兩者差額就是安全區。
    const safeAreaTop = advScreenRect ? Math.round(advScreenRect.height - window.innerHeight) : null
    const vv = window.visualViewport
    const fmtRect = (r: DOMRect | undefined) =>
      r ? `top ${r.top.toFixed(0)} bottom ${r.bottom.toFixed(0)} height ${r.height.toFixed(0)}` : '?'
    const lines = [
      `screen ${this.app.screen.width.toFixed(0)}x${this.app.screen.height.toFixed(0)} win ${window.innerWidth}x${window.innerHeight}`,
      `100dvh~=${window.innerHeight} safeAreaTop~=${safeAreaTop ?? '?'}`,
      `vv.offsetTop ${vv ? vv.offsetTop.toFixed(0) : '?'} vv.height ${vv ? vv.height.toFixed(0) : '?'}`,
      `adv: ${fmtRect(advScreenRect)}`,
      `wrap: ${fmtRect(wrapRect)}`,
      `canvas: ${fmtRect(canvasRect)}`,
      `container ${this.containerEl?.clientWidth ?? '?'}x${this.containerEl?.clientHeight ?? '?'} canvas(css) ${canvasEl.clientWidth}x${canvasEl.clientHeight} renderer ${this.app.renderer.width}x${this.app.renderer.height}`,
      `room texture ${bg?.texture.width ?? '?'}x${bg?.texture.height ?? '?'} logical room ${room.size.width}x${room.size.height}`,
      `coverScale ${scale.toFixed(3)} worldLayer.scale ${this.worldLayer.scale.x.toFixed(3)}x${this.worldLayer.scale.y.toFixed(3)}`,
      `rendered room ${renderedW.toFixed(0)}x${renderedH.toFixed(0)} worldLayer.position ${this.worldLayer.position.x.toFixed(0)},${this.worldLayer.position.y.toFixed(0)}`,
    ]
    return lines.join('\n')
  }

  // ── 主迴圈 ───────────────────────────────────────────────────────────

  private update(dt: number) {
    if (this.destroyed || !this.app) return
    this.elapsed += dt
    if (this.toastTimer > 0) {
      this.toastTimer -= dt
      if (this.toastTimer <= 0) { this.toastText = null; this.emitHud() }
    }

    // 2026-08-20：Stage exit 結算淡出優先於一般探索——玩家踩到結算圈的
    // 瞬間不再直接跳結算畫面（走一步忽然整個畫面切換，體感很突兀），改成
    // 先進這段淡出，播完才真的呼叫 commitStageFinish() 建立結果。
    if (this.pendingFinishWon !== null) {
      this.stageFinishFadeTimer += dt
      if (this.stageFinishFadeTimer >= this.stageFinishFadeSec) {
        this.commitStageFinish(this.pendingFinishWon)
      }
    }

    // Room Transition fade／結算淡出期間鎖輸入：玩家看不到自己還在移動/
    // 戰鬤，roomSystem.update() 會在 fade out 走到底時把玩家傳送到下一個
    // 房間。
    const locked = this.roomSystem.fading || this.isFinalizingStage
    if (!locked && (this.state === 'explore' || this.state === 'combat')) {
      this.movement.update(dt)
      this.trigger.update()
      this.storyTrigger.update()
      this.hazard.update(dt)
      this.collectible.update()
      this.secret.update()
      this.quest.update()
      this.combat.update(dt)
      updateExitCheck(this)
    }

    this.roomSystem.update(dt) // 可能在這裡把玩家傳送到下一個房間、推進 fade 進度

    if (this.playerSprite) {
      this.playerSprite.x = this.player.x
      this.playerSprite.y = this.player.y
      this.playerSprite.zIndex = this.player.y
      this.playerSprite.scale.x = Math.abs(this.playerSprite.scale.x) * (this.facing === 'left' ? -1 : 1)
    }
    this.updatePlayerAnim(dt)
    if (this.shadowSprite) {
      this.shadowSprite.x = this.player.x
      this.shadowSprite.y = this.player.y + FOREST01_ADVENTURE_DISPLAY.contactShadowOffsetY
      this.shadowSprite.zIndex = this.player.y - 1
    }
    if (this.fadeOverlay) {
      const stageFadeAlpha = this.isFinalizingStage ? Math.min(1, this.stageFinishFadeTimer / this.stageFinishFadeSec) : 0
      this.fadeOverlay.alpha = Math.max(this.roomSystem.fadeAlpha, stageFadeAlpha)
    }
    if (this.debugPlayerFootRect) {
      this.debugPlayerFootRect.x = this.player.x
      this.debugPlayerFootRect.y = this.player.y
    }
    if (this.debugPlayerCollisionCircle) {
      this.debugPlayerCollisionCircle.x = this.player.x
      this.debugPlayerCollisionCircle.y = this.player.y
    }
    if (this.debugPlayerShadowBounds) {
      this.debugPlayerShadowBounds.x = this.player.x
      this.debugPlayerShadowBounds.y = this.player.y
    }
    if (this.debugPlayerAnchor) {
      this.debugPlayerAnchor.x = this.player.x
      this.debugPlayerAnchor.y = this.player.y
    }
    if (this.debugPlayerYSortLine) {
      this.debugPlayerYSortLine.x = this.player.x
      this.debugPlayerYSortLine.y = this.player.y
    }

    // 2026-08-19：互動提示原本只在 init/收集/對話開始結束等少數時機才
    // emitHud()，玩家移動時完全不會刷新——導致「明明走近 NPC 但提示沒出現」
    // （系統內部其實抓得到目標，只是 React 端沒被通知）。這裡改成每幀比對
    // 目前最近的互動目標有沒有變，變了才 emitHud()，不是每幀都醒 React。
    if (!locked && this.state === 'explore') {
      const key = this.interactionKeyOf(this.interaction.findNearest())
      const exitPrompt = getStageExitPrompt(this)
      if (key !== this.lastInteractionKey || exitPrompt !== this.lastStageExitPrompt) {
        this.lastInteractionKey = key
        this.lastStageExitPrompt = exitPrompt
        this.emitHud()
      }
    } else if (this.lastInteractionKey !== null || this.lastStageExitPrompt !== null) {
      this.lastInteractionKey = null
      this.lastStageExitPrompt = null
      this.emitHud()
    }
    this.updateFloatingSprites()
    this.updateFx(dt)
    this.updateShakes(dt)
    this.cameraSystem.update()
  }

  /** 玩家逐幀動畫：走路播 walk、攻擊命中時播 attack（見 triggerPlayerAttackAnim，
   * AdventureCombatController 命中敵人時呼叫）、都沒有就 idle。跟
   * ArenaGame.ts 共用 heroSpriteRig.ts 的 getFrameDurationSec/
   * getStateTotalDurationSec，不等速的幀也會照設計表跑，不是簡單等速迴圈。
   * 沒有真的 walk/attack 幀的角色（frameLoader 沒美術時 fallback 回 idle
   * 陣列）frames.length<=1，直接跳過切幀，維持原本「至少顯示得出來」的
   * 行為，不會因為缺幀而報錯。 */
  private updatePlayerAnim(dt: number) {
    if (!this.playerSprite || !this.heroFrames) return
    if (this.playerAttackAnimTimer > 0) this.playerAttackAnimTimer = Math.max(0, this.playerAttackAnimTimer - dt)

    const moving = this.moveDir.x !== 0 || this.moveDir.y !== 0
    const nextState: AnimState = this.playerAttackAnimTimer > 0 ? 'attack' : moving ? 'walk' : 'idle'
    if (nextState !== this.playerAnimState) {
      this.playerAnimState = nextState
      this.playerAnimFrame = 0
      this.playerAnimTimer = 0
    }

    const frames = this.heroFrames[nextState]
    if (frames.length <= 1) {
      if (frames.length === 1) this.playerSprite.texture = frames[0]
      return
    }
    this.playerAnimTimer += dt
    while (this.playerAnimTimer >= getFrameDurationSec(nextState, this.playerAnimFrame, frames.length)) {
      this.playerAnimTimer -= getFrameDurationSec(nextState, this.playerAnimFrame, frames.length)
      this.playerAnimFrame = (this.playerAnimFrame + 1) % frames.length
    }
    this.playerSprite.texture = frames[this.playerAnimFrame]
  }

  /** AdventureCombatController 的自動攻擊真的命中敵人時呼叫，觸發一次
   * attack 動畫（播完整組 attack 幀的時長，比照 ArenaGame.ts 的
   * playerAnim.attackTimer 用法）。沒有真的 attack 美術時 heroFrames.attack
   * 會 fallback 成 idle 陣列，updatePlayerAnim 會直接跳過切幀，不會出錯。 */
  triggerPlayerAttackAnim() {
    if (!this.heroFrames) return
    this.playerAttackAnimTimer = getStateTotalDurationSec('attack', this.heroFrames.attack.length)
  }

  /** RoomSystem 換房成功時呼叫：第一次進某個房間顯示「發現：xxx」並記錄進
   * areasDiscovered（沿用舊架構的欄位名，語意從「發現區域」變成「進入房間」，
   * 存檔格式不用跟著改）；換房一定要重畫遮罩，不然裁切範圍還停在舊房間。
   * 進新房間時如果上一個房間的 toast 還沒消失，會讓玩家看著新房間卻讀到
   * 舊提示文字，一併清掉。 */
  onRoomEntered(room: RoomDef) {
    this.updateRoomMask()
    this.toastText = null
    this.toastTimer = 0
    if (!this.areasDiscovered.has(room.id)) {
      this.areasDiscovered.add(room.id)
      this.showToast(`發現：${room.name}`) // showToast() 內部會呼叫 emitHud()
    } else {
      // 2026-08-20 修正：回到已經探索過的房間時，上面那個 showToast 分支
      // 不會執行，emitHud() 就完全沒被呼叫——迷你地圖的 activeRoomId 停在
      // 上一個房間，玩家回報「換房間沒精準顯示在哪個房間」。這裡補一個
      // 無條件呼叫，不管是不是第一次進來，換房當下都要刷新 HUD。
      this.emitHud()
    }
  }

  private updateRoomMask() {
    if (!this.roomMask) return
    const room = this.roomSystem.activeRoom
    this.roomMask.clear()
    this.roomMask.rect(room.atlasOrigin.x, room.atlasOrigin.y, room.size.width, room.size.height).fill(0xffffff)
  }

  private interactionKeyOf(target: ReturnType<InteractionSystem['findNearest']>): string | null {
    if (!target) return null
    if (target.kind === 'npc') return `npc:${target.id}`
    if (target.kind === 'brazier') return `brazier:${target.puzzleId}:${target.brazierId}`
    return `wall:${target.secretId}`
  }

  private updateShakes(dt: number) {
    for (const [id, s] of this.shakeTimers) {
      const sprite = this.colliderSprite.get(id)
      if (!sprite) { this.shakeTimers.delete(id); continue }
      s.timer -= dt
      if (s.timer <= 0) { sprite.x = s.baseX; this.shakeTimers.delete(id); continue }
      sprite.x = s.baseX + (Math.random() - 0.5) * 6
    }
  }

  private updateFloatingSprites() {
    for (const f of this.floatingSprites) {
      f.sprite.y = f.baseY + Math.sin(this.elapsed * f.speed + f.seed) * f.amplitude
      const pulse = 1 + Math.sin(this.elapsed * f.speed * 1.3 + f.seed) * 0.05
      f.sprite.scale.set(Math.abs(f.baseScale) * pulse)
    }
  }

  private updateFx(dt: number) {
    for (let i = this.activeFx.length - 1; i >= 0; i--) {
      const fx = this.activeFx[i]
      fx.life -= dt
      fx.sprite.alpha = Math.max(0, fx.life / fx.maxLife)
      if (fx.life <= 0) {
        fx.sprite.destroy()
        this.activeFx.splice(i, 1)
      }
    }
  }

  // ── 互動輸入（AdventureStageScreen 呼叫） ───────────────────────────────

  setMoveDir(dx: number, dy: number) {
    this.moveDir = { x: dx, y: dy }
  }

  tryInteract() {
    if (this.dialogue.active) { this.dialogue.advance(); return }
    if (this.state !== 'explore') return
    const target = this.interaction.findNearest()
    if (!target) return
    if (target.kind === 'npc') this.npc.interact(target.id)
    else if (target.kind === 'brazier') this.puzzle.hitBrazier(target.puzzleId, target.brazierId)
    else if (target.kind === 'breakable_wall') this.secret.hitBreakableWall(target.secretId)
  }

  // ── 給各 System 呼叫的共用方法 ───────────────────────────────────────

  showToast(text: string) {
    this.toastText = text
    this.toastTimer = TOAST_DURATION_SEC
    this.emitHud()
  }

  setColliderActive(id: string, active: boolean) {
    this.colliderActive.set(id, active)
    const sprite = this.colliderSprite.get(id)
    if (!sprite) return
    if (VINE_GATE_COLLIDER_IDS.has(id)) {
      sprite.texture = this.tex(active ? FOREST01_INTERACTIVE_ART.vineGateClosed : FOREST01_INTERACTIVE_ART.vineGateOpen)
      sprite.visible = true
    } else {
      // 石門（altar_gate）：解鎖後直接消失，沒有另一張「開門」貼圖。
      sprite.visible = active
    }
  }

  setBrazierLit(puzzleId: string, brazierId: string) {
    const sprite = this.brazierSprite.get(`${puzzleId}:${brazierId}`)
    const litPath = FOREST01_INTERACTIVE_ART.brazierLit[brazierId] ?? FOREST01_INTERACTIVE_ART.brazierLit.brazier_01
    if (sprite) sprite.texture = this.tex(litPath)
    this.spawnFx(sprite?.x ?? 0, sprite?.y ?? 0, FOREST01_COLLECTIBLE_ART.pickupSparkle, FOREST01_DISPLAY_HEIGHT.pickupSparkle)
  }

  updateBreakableWallVisual(secretId: string, hpPct: number) {
    const sprite = this.colliderSprite.get(secretId)
    if (!sprite) return
    sprite.alpha = 0.55 + 0.45 * hpPct
    // HP 剩 1（doc 的「damaged + shake」狀態）另外加一次短暫震動，不只是
    // 變透明——最後一下要打破前給玩家更明確的回饋。
    if (hpPct <= 0.4 && !this.shakeTimers.has(secretId)) {
      this.shakeTimers.set(secretId, { baseX: sprite.x, timer: 0.25 })
    }
  }

  startCutscene(cutsceneId: string) {
    this.dialogue.start(cutsceneId, null, 'cutscene')
  }

  isCollected(id: string): boolean {
    return this.collectedIds.has(id)
  }

  markCollected(c: CollectibleDef) {
    this.collectedIds.add(c.id)
    if (c.kind === 'purple_coin') this.purpleCoinIds.add(c.id)
    else if (c.kind === 'star_piece') this.starPieceIds.add(c.id)
    else if (c.kind === 'treasure') this.treasureIds.add(c.id)

    const sprite = this.collectibleSprite.get(c.id)
    if (sprite) {
      this.spawnFx(sprite.x, sprite.y, FOREST01_COLLECTIBLE_ART.pickupSparkle, c.kind === 'star_piece' ? 40 : 26)
      if (c.kind === 'treasure') sprite.texture = this.tex(FOREST01_INTERACTIVE_ART.treasureOpen)
      else sprite.visible = false
    }
    this.floatingSprites = this.floatingSprites.filter(f => f.sprite !== sprite)
    this.emitHud()
  }

  revealCollectible(id: string) {
    this.revealedCollectibles.add(id)
    const sprite = this.collectibleSprite.get(id)
    if (sprite && !this.isCollected(id)) sprite.visible = true
  }

  private spawnFx(x: number, y: number, path: string, height: number) {
    const sprite = this.makeSprite(path, height, { x: 0.5, y: 0.5 })
    sprite.x = x; sprite.y = y; sprite.zIndex = y + 1
    this.worldLayer.addChild(sprite)
    this.activeFx.push({ sprite, life: 0.4, maxLife: 0.4 })
  }

  /** 對話中把 NPC 立繪切成「talking」，對話結束後呼叫 restoreNpcIdleState()
   * 切回 idle 或（任務已完成）happy——見 NpcController.interact()。 */
  setNpcTalking(npcId: string) {
    const sprite = this.npcSprite.get(npcId)
    if (sprite) sprite.texture = this.tex(FOREST01_NPC_ART.talking)
  }

  restoreNpcIdleState(npcId: string) {
    const sprite = this.npcSprite.get(npcId)
    if (!sprite) return
    const questDone = this.stage.quests.some(q => q.npcId === npcId && this.questsCompleted.has(q.id))
    sprite.texture = this.tex(questDone ? FOREST01_NPC_ART.happy : FOREST01_NPC_ART.idle)
  }

  damagePlayer(amount: number) {
    this.player.hp = Math.max(0, this.player.hp - amount)
    if (this.player.hp <= 0) this.finishStage(false)
    else this.emitHud() // HP 條要即時反應，不能等下一次剛好觸發 emitHud 的時機
  }

  onEnemyKilled(typeId: string) {
    this.quest.onEnemyKilled(typeId)
    if (this.stage.inStageBuild) this.gainBuildExp(BUILD_EXP_PER_KILL)
  }

  /** 目前房間裡玩家腳下有沒有踩在指定 kind 的環境危害區（room local 座標，
   * 只在這裡加一次 atlasOrigin，見 adventureTypes.ts HazardZoneDef 註解）。
   * MovementSystem 用來判斷要不要套用 ice_floor 滑動。 */
  getActiveHazardZone(kind: HazardKind): HazardZoneDef | null {
    const room = this.roomSystem.activeRoom
    for (const hz of this.stage.hazards ?? []) {
      if (hz.roomId !== room.id || hz.kind !== kind) continue
      const worldArea = {
        x: room.atlasOrigin.x + hz.area.x, y: room.atlasOrigin.y + hz.area.y,
        width: hz.area.width, height: hz.area.height,
      }
      if (pointInRect(this.player.x, this.player.y, worldArea)) return hz
    }
    return null
  }

  /** AdventureCombatController 的精英技能（目前只有 frost_wolf_leap）命中
   * 玩家時呼叫，給 avoid_skill 星星條件統計用。 */
  recordSkillHit(skillId: string) {
    this.skillHitCounts[skillId] = (this.skillHitCounts[skillId] ?? 0) + 1
  }

  private buildExpToNext(): number {
    return 30 + (this.buildLevel - 1) * 22
  }

  gainBuildExp(amount: number) {
    this.buildExp += amount
    this.tryTriggerLevelUp()
  }

  private tryTriggerLevelUp() {
    if (this.state !== 'explore' && this.state !== 'combat') return // 對話/劇情/結算中不打斷，下次滿足條件的呼叫會再檢查一次
    if (this.buildExp < this.buildExpToNext()) return
    this.buildExp -= this.buildExpToNext()
    this.buildLevel++
    this.buildPickPreviousState = this.state
    this.state = 'build_pick'
    this.moveDir = { x: 0, y: 0 }
    this.emitHud()
  }

  /** AdventureStageScreen 的 DiceUpgradeOverlay 選完卡呼叫（那個元件自己
   * 擲骰＋生三張卡，這裡只負責套用效果＋恢復遊戲狀態）。 */
  chooseBuildCard(card: ArenaCard) {
    if (this.state !== 'build_pick') return
    this.applyBuildCard(card)
    this.state = this.buildPickPreviousState
    this.emitHud()
    this.tryTriggerLevelUp() // 這次擊殺的 EXP 可能一次跨兩級，接著檢查有沒有下一次要選
  }

  /** 跟 ArenaGame.ts 的 applyCard() 是同一套 ArenaCardEffect 語意，直接
   * common 邏輯搬過來——Adventure 目前沒有拾取範圍機制，pickupRangeBonus
   * 這個效果欄位對這裡沒有意義，静默忽略（卡池共用，不為了 Adventure 特地
   * 拆一份子集）。 */
  private applyBuildCard(card: ArenaCard) {
    const e = card.effect
    if (e.flatDamage) this.bonusDamage += e.flatDamage
    if (e.atkCooldownMult) this.atkCooldownMult *= e.atkCooldownMult
    if (e.moveSpeedBonus) this.moveSpeedMult *= 1 + e.moveSpeedBonus
    if (e.maxHpBonus) {
      this.player.maxHp += e.maxHpBonus
      this.player.hp += e.maxHpBonus
    }
    this.showToast(`升級：${card.name}`)
  }

  /** 開始 stage 結算淡出；實際建立結果延後到 update() 裡淡出播完那一刻
   * （見 commitStageFinish）——不再是踩到出口/死亡當下瞬間切結算畫面。 */
  finishStage(won: boolean) {
    if (this.finalResult || this.pendingFinishWon !== null) return // 已經結算過/正在淡出中，避免重複觸發（例如玩家死亡瞬間又踩到出口）
    this.pendingFinishWon = won
    this.stageFinishFadeTimer = 0
    this.state = 'cutscene' // 鎖住移動/互動/戰鬤，但保留 explore 以外狀態機沿用的既有輸入鎖定路徑
    this.lastStageExitPrompt = null
    this.emitHud()
  }

  /** 新制關卡（stage.starConditions，見 adventureTypes.ts 註解）依序檢查
   * 三個條件，第一個不過就停——跟 CampaignStage 的星星「後面幾顆建立在前面
   * 已達成」慣例一致，不是三個各自獨立判定。 */
  private checkStarCondition(c: StarCondition): boolean {
    if (c.type === 'clear') return true // 呼叫端已經確認 won===true 才會走到這裡
    if (c.type === 'hp_above') return (this.player.hp / this.player.maxHp) * 100 >= (c.value ?? 0)
    // 2026-08-21（雪原篇 2-7）：hits_under 沒有給 skillId 時，就是跟
    // avoid_skill 完全一樣的語意（「被某個 Boss 技能命中幾次」），差別只在
    // campaignTypes.ts 的描述文字習慣用哪個 type name，判定邏輯共用。
    if (c.type === 'avoid_skill' || c.type === 'hits_under') return (this.skillHitCounts[c.skillId ?? ''] ?? 0) <= (c.value ?? 0)
    if (c.type === 'time_under') return this.elapsed <= (c.value ?? Infinity)
    // 2026-08-21（雪原篇 2-6/2-8）：avoid_hazard 統計「被指定 hazardId 命中/
    // 破壞幾次」，key 是 `${hazardId}_hazard_hit`（見 MovementSystem.ts 的
    // thin_ice、HazardSystem.ts 的 frost_tower）。
    if (c.type === 'avoid_hazard') return (this.skillHitCounts[`${c.hazardId ?? ''}_hazard_hit`] ?? 0) <= (c.value ?? Infinity)
    // 2026-08-21（雪原篇 2-2）：借用既有 'custom' type + targetId 存房間 id，
    // 給「找到隱藏房間」這種條件用（areasDiscovered 本來就是「進過的房間 id
    // 清單」，不用另外新增一個 StarConditionType 成員）。
    if (c.type === 'custom') return this.areasDiscovered.has(c.targetId ?? '')
    // 2026-08-21（雪原篇 2-3/2-4）：frozen_zone 定身次數／snow_gust 陣風
    // 干擾次數共用 MovementSystem.ts 的 'hazard_control_count' 計數 key
    // （兩種星星條件描述文字不同，但語意都是「行動被環境打斷幾次」），跟
    // ice_shaman 自我治療次數（見 AdventureCombatController.ts 的
    // `${typeId}_heal_cast`）一樣借用同一份 skillHitCounts 記帳，不用另外
    // 開欄位。
    if (c.type === 'control_count_under') return (this.skillHitCounts['hazard_control_count'] ?? 0) <= (c.value ?? Infinity)
    if (c.type === 'heal_count_under') return (this.skillHitCounts[`${c.targetId ?? ''}_heal_cast`] ?? 0) <= (c.value ?? Infinity)
    return true // 其餘 type 一律視為通過，不會反而卡關
  }

  private commitStageFinish(won: boolean) {
    if (this.finalResult) return
    const purpleCoinCount = this.purpleCoinIds.size + this.pendingPurpleCoinBonus
    const starPieceCount = this.starPieceIds.size
    let stars: 0 | 1 | 2 | 3 = 0
    if (won) {
      if (this.stage.starConditions) {
        for (const c of this.stage.starConditions) {
          if (!this.checkStarCondition(c)) break
          stars = (stars + 1) as 0 | 1 | 2 | 3
        }
      } else {
        stars = 1
        if (purpleCoinCount >= (this.stage.starThresholds?.purpleCoinCount ?? Infinity)) stars = (stars + 1) as 1 | 2
        if (starPieceCount >= (this.stage.starThresholds?.starPieceCount ?? Infinity)) stars = (stars + 1) as 1 | 2 | 3
      }
    }
    const questCompleted = this.stage.quests.every(q => this.questsCompleted.has(q.id))
    this.finalResult = {
      won, stars, purpleCoinCount, starPieceCount, questCompleted,
      pendingGold: this.pendingGold, pendingEnhanceStones: this.pendingEnhanceStones, pendingHeroExp: this.pendingHeroExp,
    }
    this.pendingFinishWon = null
    this.state = 'stage_clear'
    this.emitHud()
    this.app?.ticker.stop()
  }

  /** 給 AdventureStageScreen 在收到 stageResult 之後組完整 AdventureStageResult
   * 呼叫 onAdventureStageEnd 用（App.tsx 寫回 meta.adventureStageProgress）。 */
  buildStageResult(): AdventureStageResult | null {
    if (!this.finalResult) return null
    // cleared/bestStars 只能變好不能變差——死亡重進再死一次不能把先前已經
    // 通關/拿過的星數洗掉，跟 campaignProgress.ts 的 recordStageResult() 是
    // 同一個「只升不降」原則。
    const prev = this.cfg.initialProgress
    const progress: AdventureStageProgress = {
      ...defaultAdventureStageProgress(),
      cleared: this.finalResult.won || (prev?.cleared ?? false),
      bestStars: Math.max(this.finalResult.stars, prev?.bestStars ?? 0) as 0 | 1 | 2 | 3,
      discoveredAreas: [...this.areasDiscovered],
      collectedPurpleCoins: [...this.purpleCoinIds],
      collectedStarPieces: [...this.starPieceIds],
      openedTreasures: [...this.treasureIds],
      completedQuests: [...this.questsCompleted],
      completedPuzzles: [...this.puzzlesCompleted],
      discoveredSecrets: [...this.secretsDiscovered],
      clearedCombatZones: [...this.clearedCombatZones],
      flags: { ...this.flags },
    }
    return {
      won: this.finalResult.won, stars: this.finalResult.stars, progress,
      pendingGold: this.pendingGold, pendingEnhanceStones: this.pendingEnhanceStones, pendingHeroExp: this.pendingHeroExp,
    }
  }

  /** 2026-08-20 補上迷你地圖：只有走進過的房間（this.areasDiscovered）才會
   * 在地圖上亮起，跟「探索到才開」的需求一致。這裡只丟最基本的遊戲狀態，
   * 房間形狀/走廊連線怎麼畫交給 MiniMapHud.tsx 自己讀 stage.rooms 動態算
   * ——不在 AdventureGame 這層重複維護一份幾何資料，單一資料來源。沒有
   * rooms 資料的舊架構關卡回傳 null，AdventureStageScreen 就不畫地圖。 */
  private buildMinimap(): AdventureHudState['minimap'] {
    const rooms = this.stage.rooms
    if (!rooms || rooms.length === 0) return null
    return {
      activeRoomId: this.roomSystem.activeRoomId,
      discoveredRoomIds: [...this.areasDiscovered],
    }
  }

  emitHud() {
    const activeDialogue = this.dialogue.current()
    const target = this.state === 'explore' ? this.interaction.findNearest() : null
    const activeQuest = this.stage.quests.find(q => this.quest.getState(q.id) === 'accepted' || this.quest.getState(q.id) === 'ready_to_complete')
    const hud: AdventureHudState = {
      state: this.state,
      purpleCoinCount: this.purpleCoinIds.size + this.pendingPurpleCoinBonus,
      purpleCoinTotal: this.stage.collectibles.filter(c => c.kind === 'purple_coin').length,
      starPieceCount: this.starPieceIds.size,
      starPieceTotal: this.stage.collectibles.filter(c => c.kind === 'star_piece').length,
      activeDialogue,
      interactionPrompt: target?.prompt ?? null,
      stageExitPrompt: this.lastStageExitPrompt,
      activeQuestTitle: activeQuest?.title ?? null,
      toast: this.toastText,
      debugScreenText: this.buildDebugScreenText(),
      stageResult: this.finalResult,
      minimap: this.buildMinimap(),
      heroId: this.heroId,
      heroName: this.heroName,
      heroLevel: this.heroLevel,
      partyHeroIds: this.partyHeroIds,
      playerHp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      buildLevel: this.stage.inStageBuild ? this.buildLevel : 0,
    }
    this.onHudChange(hud)
  }

  destroy(): void {
    this.destroyed = true
    if (this.containerResizeObserver) {
      this.containerResizeObserver.disconnect()
      this.containerResizeObserver = null
    }
    if (this.app) {
      this.app.destroy(true, { children: true, texture: false })
      this.app = null
    }
  }
}
