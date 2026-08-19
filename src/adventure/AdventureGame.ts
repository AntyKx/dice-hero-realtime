import { Application, Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { loadCharacterFrames, type AnimState } from '../arena/frameLoader'
import { setSpriteHeight } from '../arena/heroSpriteRig'
import { ALL_CAMPAIGN_STAGE_ENEMIES, type EnemyTypeDef } from '../arena/enemies'
import type {
  AdventureStageDef, AdventureGameState, AdventureHudState, AdventureStageProgress,
  AdventureStageResult, CollectibleDef, ColliderDef,
} from './adventureTypes'
import { defaultAdventureStageProgress } from './adventureTypes'
import { getAdventureStageDef } from './stages'
import { MovementSystem } from './systems/MovementSystem'
import { CollisionSystem } from './systems/CollisionSystem'
import { CameraSystem } from './systems/CameraSystem'
import { InteractionSystem } from './systems/InteractionSystem'
import { TriggerSystem } from './systems/TriggerSystem'
import { CollectibleSystem } from './systems/CollectibleSystem'
import { PuzzleSystem } from './systems/PuzzleSystem'
import { SecretSystem } from './systems/SecretSystem'
import { QuestSystem } from './systems/QuestSystem'
import { AdventureCombatController } from './combat/AdventureCombatController'
import { NpcController } from './npc/NpcController'
import { DialogueController } from './npc/DialogueController'
import { createExitGraphic, updateExitCheck } from './objects/StageExit'
import {
  FOREST01_GROUND, FOREST01_FOREGROUND, FOREST01_NPC_ART, FOREST01_COLLECTIBLE_ART,
  FOREST01_ENEMY_STATIC_ART, FOREST01_INTERACTIVE_ART, FOREST01_PROPS_ART, FOREST01_DISPLAY_HEIGHT,
} from './art/forestRuins01Art'
import {
  FOREST01_V2_ART, FOREST01_ADVENTURE_DISPLAY, getAdventureHeroRenderHeight,
} from './art/forestRuins01VisualTuning'

export interface AdventureConfig {
  heroId: string
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

const PLAYER_RADIUS = 14
const TOAST_DURATION_SEC = 2.6
const FOREGROUND_Z = 1_000_000
const DEBUG_LAYER_Z = 2_000_000

const COLOR_COLLIDER_DEBUG = 0xff4040
const COLOR_TRIGGER_DEBUG = 0xffa030
const COLOR_COMBATZONE_DEBUG = 0xff4040
const COLOR_SECRET_DEBUG = 0xb060ff
const COLOR_NPC_RANGE_DEBUG = 0xffe066
const COLOR_PUZZLE_DEBUG = 0x5090ff
const COLOR_COLLECTIBLE_DEBUG = 0x50e070

// 目前 forest_1_1 是唯一有正式美術的關卡，這份路徑清單只服務它——之後其他
// 關卡若也做正式美術，這裡要改成依 stageId 動態決定要載入哪一包
// art manifest，不是繼續往同一份清單塞。
function collectForest01ArtPaths(): string[] {
  const paths: string[] = [FOREST01_GROUND, FOREST01_FOREGROUND, FOREST01_V2_ART.contactShadow]
  paths.push(...Object.values(FOREST01_NPC_ART))
  paths.push(...Object.values(FOREST01_COLLECTIBLE_ART))
  paths.push(...Object.values(FOREST01_ENEMY_STATIC_ART).filter((v): v is string => !!v))
  const ia = FOREST01_INTERACTIVE_ART
  paths.push(
    ia.altarObelisk, ...ia.altarFlame, ...Object.values(ia.brazierLit), ia.brazierUnlit,
    ia.vineGateClosed, ia.vineGateOpen, ia.wallIntact, ia.wallBroken,
    ia.sealedDoor, ia.exitGlow, ia.treasureOpen, ia.treasureClosed,
  )
  paths.push(...Object.values(FOREST01_PROPS_ART))
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

/** 藤蔓門系用的 colliderId 集合——目前石橋/哥布林營地的戰鬤前後藤蔓沒有
 * 專屬美術，沿用謎題藤蔓門同一張圖（森林裡的藤蔓意象通用，見任務回報）。 */
const VINE_GATE_COLLIDER_IDS = new Set(['bridge_gate_south', 'bridge_gate_north', 'goblin_gate_south', 'goblin_gate_north', 'puzzle_vine_gate'])

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
  debugArtMode = false
  stage: AdventureStageDef
  destroyed = false

  player = { x: 0, y: 0, hp: 0, maxHp: 0, radius: PLAYER_RADIUS }
  playerSprite: Sprite | null = null
  private shadowSprite: Sprite | null = null
  moveDir = { x: 0, y: 0 }
  facing: 'left' | 'right' = 'right'
  camera = { x: 0, y: 0 }
  state: AdventureGameState = 'explore'
  elapsed = 0

  heroId: string
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

  private toastText: string | null = null
  private toastTimer = 0
  private finalResult: AdventureHudState['stageResult'] = null

  // ── Systems / Controllers ──────────────────────────────────────────────
  movement = new MovementSystem(this)
  collision = new CollisionSystem(this)
  cameraSystem = new CameraSystem(this)
  interaction = new InteractionSystem(this)
  trigger = new TriggerSystem(this)
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
    this.heroAtk = cfg.heroAtk
    this.partyHeroIds = cfg.partyHeroIds.length > 0 ? cfg.partyHeroIds : [cfg.heroId]
    this.player.hp = cfg.maxHp
    this.player.maxHp = cfg.maxHp
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
    const app = new Application()
    await app.init({
      resizeTo: container,
      backgroundColor: this.stage.groundColor,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })
    if (this.destroyed) { app.destroy(true, { children: true, texture: false }); return }
    this.app = app
    container.appendChild(app.canvas)

    this.worldLayer = new Container()
    this.worldLayer.sortableChildren = true
    app.stage.addChild(this.worldLayer)

    const heroStars = Math.min(3, Math.max(0, this.cfg.stars ?? 0))
    const enemyIds = this.collectUsedEnemyIds()
    const artPaths = collectForest01ArtPaths()
    const [heroFrames, enemyFrameList, artTextures] = await Promise.all([
      loadCharacterFrames(`/assets/frames/heroes/${this.heroId}/s${heroStars}`),
      Promise.all(enemyIds.map(id => loadCharacterFrames(`/assets/frames/enemies/${this.enemyTypeDefs[id]?.placeholderSpriteId ?? id}`))),
      Assets.load<Texture>(artPaths) as Promise<Record<string, Texture>>,
    ])
    if (this.destroyed) return
    enemyIds.forEach((id, i) => { this.enemyFrames[id] = enemyFrameList[i] })
    this.art = artTextures

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

  // ── 場景建置：Ground → 裝飾道具/互動物件/NPC/玩家/敵人（同一個
  //    sortableChildren worldLayer，zIndex=y 做 Y-sort）→ Foreground → Debug ──

  private buildScene() {
    const { world } = this.stage
    const H = FOREST01_DISPLAY_HEIGHT

    // Ground：V2 素材在 build 階段（scripts/build-forest01-art-v2.mjs）就
    // 已經做成跟 world 同尺寸的 2400x3600 master，這裡不再 runtime 拉伸
    // （之前 1024x1536 硬拉 2.34x 是模糊感主因）。尺寸不符時只 warn，不靜默拉伸。
    const groundTex = this.tex(FOREST01_GROUND)
    if (import.meta.env.DEV && (groundTex.width !== world.width || groundTex.height !== world.height)) {
      console.warn(`[AdventureGame] Ground 材質尺寸(${groundTex.width}x${groundTex.height})跟 world(${world.width}x${world.height})不符，可能又混入沒有跑過 build-forest01-art-v2.mjs 的舊圖。`)
    }
    const ground = new Sprite(groundTex)
    ground.position.set(0, 0)
    this.worldLayer.addChild(ground)

    this.buildDecorationProps()
    this.buildInteractiveObjects(H)
    for (const npc of this.stage.npcs) this.buildNpcSprite(npc, FOREST01_ADVENTURE_DISPLAY.npcHeight)
    for (const c of this.stage.collectibles) this.buildCollectibleSprite(c, H)

    // Foreground：跟 Ground 同樣是 build 階段就做好 2400x3600，不做 runtime
    // 拉伸；alpha 固定 0.96（不是 1）讓邊框跟底圖融合感更自然，先不做「玩家
    // 走到樹冠下淡出」的局部遮蔽（目前素材只有邊框構圖，做了也沒意義，見
    // 任務回報的已知限制）。
    const foregroundTex = this.tex(FOREST01_FOREGROUND)
    if (import.meta.env.DEV && (foregroundTex.width !== world.width || foregroundTex.height !== world.height)) {
      console.warn(`[AdventureGame] Foreground 材質尺寸(${foregroundTex.width}x${foregroundTex.height})跟 world(${world.width}x${world.height})不符。`)
    }
    const foreground = new Sprite(foregroundTex)
    foreground.position.set(0, 0)
    foreground.alpha = FOREST01_ADVENTURE_DISPLAY.foregroundNormalAlpha
    foreground.zIndex = FOREGROUND_Z
    foreground.eventMode = 'none'
    this.worldLayer.addChild(foreground)

    this.buildDebugLayer()
  }

  private buildDecorationProps() {
    const P = FOREST01_PROPS_ART
    const H = FOREST01_DISPLAY_HEIGHT
    const place = (path: string, x: number, y: number, height: number) => {
      const s = this.makeSprite(path, height)
      s.x = x; s.y = y; s.zIndex = y
      this.worldLayer.addChild(s)
    }
    // 哥布林營地（area6, x:1500-2100 y:750-1100）：帳篷/營火/柵欄/木箱沿邊緣
    // 擺，中間留空給 Combat #2 的敵人 spawn（見 forestRuins01.ts 的
    // goblin_camp_combat.area），不要蓋住敵人生成範圍。
    place(P.goblinTent1, 1580, 800, H.propLarge)
    place(P.goblinTent2, 2000, 800, H.propLarge)
    place(P.campfire, 1790, 1040, H.propMedium)
    place(P.fenceStraight1, 1560, 1080, H.propSmall)
    place(P.fenceStraight2, 2020, 1080, H.propSmall)
    place(P.crateStack, 1540, 1000, H.propSmall)
    place(P.barrel1, 2040, 970, H.propSmall)

    // 古老祭壇（area7, x:350-900 y:750-1100）：遺跡拱門/柱子點綴，紫色調
    // 由 interactive 的 altar 素材負責，這裡只補周邊環境。
    place(P.ruinArchCluster, 420, 800, H.propLarge)
    place(P.ruinPillar1, 830, 1020, H.propMedium)

    // 森林遺跡廣場（area5, x:900-1500 y:1500-1850）：石柱/長牆/碎石沿邊緣。
    place(P.ruinPillar2, 940, 1560, H.propMedium)
    place(P.ruinWallLong, 1420, 1820, H.propMedium)
    place(P.rubbleCluster, 950, 1800, H.propSmall)

    // 被遺忘的花圃（area3A, x:450-950 y:2400-2750）：花圃柵欄圍邊。
    place(P.flowerFencePurple, 500, 2420, H.propMedium)
    place(P.flowerFenceYellow, 880, 2720, H.propMedium)
    place(P.flowerFencePost1, 480, 2700, H.propSmall)
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

    // 藤蔓門／石門類 collider：依目前 active 狀態決定要顯示關閉還開啟的貼圖。
    for (const c of this.stage.colliders) {
      const sprite = this.buildColliderSprite(c, H)
      if (!sprite) continue
      this.worldLayer.addChild(sprite)
      this.colliderSprite.set(c.id, sprite)
    }

    // 古老祭壇：obelisk + 4 個紫焰基座圍繞。
    const altarArea = this.stage.areas.find(a => a.id === 'area7')?.area
    if (altarArea) {
      const cx = altarArea.x + altarArea.width / 2
      const cy = altarArea.y + altarArea.height * 0.55
      const obelisk = this.makeSprite(IA.altarObelisk, H.altarObelisk)
      obelisk.x = cx; obelisk.y = cy; obelisk.zIndex = cy
      this.worldLayer.addChild(obelisk)
      const offsets = [[-70, 30], [70, 30], [-100, -30], [100, -30]]
      IA.altarFlame.forEach((path, i) => {
        const [ox, oy] = offsets[i]
        const flame = this.makeSprite(path, H.altarFlame)
        flame.x = cx + ox; flame.y = cy + oy; flame.zIndex = flame.y
        this.worldLayer.addChild(flame)
        this.floatingSprites.push({ sprite: flame, baseX: flame.x, baseY: flame.y, baseScale: flame.scale.y, seed: i * 1.7, speed: 2.2, amplitude: 2 })
      })
    }

    // Exit：發光法陣貼圖取代原本的圓形 Graphics。
    const exitSprite = this.makeSprite(IA.exitGlow, H.exitGlow, { x: 0.5, y: 0.7 })
    exitSprite.x = this.stage.exit.x; exitSprite.y = this.stage.exit.y
    exitSprite.zIndex = this.stage.exit.y
    this.worldLayer.addChild(exitSprite)
    this.floatingSprites.push({ sprite: exitSprite, baseX: exitSprite.x, baseY: exitSprite.y, baseScale: exitSprite.scale.y, seed: 0, speed: 1.6, amplitude: 0 })
  }

  /** breakable_wall／vine_gate／sealed_door 三種 collider 對應到各自的貼圖；
   * 其餘（例如未來新增、沒有對應美術的 collider）回傳 null，不畫東西。 */
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
    } else if (c.id === 'altar_gate') {
      sprite = this.makeSprite(active ? IA.sealedDoor : IA.sealedDoor, H.sealedDoor, { x: 0.5, y: 0.5 })
      sprite.visible = active // 石門打開後直接消失（doc：解鎖用既有 collider active=false 語意，沒有另外的「開門」貼圖）
    } else if (VINE_GATE_COLLIDER_IDS.has(c.id)) {
      sprite = this.makeSprite(active ? IA.vineGateClosed : IA.vineGateOpen, H.vineGate, { x: 0.5, y: 0.5 })
    }
    if (!sprite) return null
    sprite.x = cx; sprite.y = cy; sprite.zIndex = cy
    sprite.visible = sprite.visible && (active || VINE_GATE_COLLIDER_IDS.has(c.id) || this.stage.secrets.some(s => s.id === c.id))
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
  }

  toggleDebugArtMode() {
    this.debugArtMode = !this.debugArtMode
    if (this.debugLayer) this.debugLayer.visible = this.debugArtMode
  }

  // ── 主迴圈 ───────────────────────────────────────────────────────────

  private update(dt: number) {
    if (this.destroyed || !this.app) return
    this.elapsed += dt
    if (this.toastTimer > 0) {
      this.toastTimer -= dt
      if (this.toastTimer <= 0) { this.toastText = null; this.emitHud() }
    }

    if (this.state === 'explore' || this.state === 'combat') {
      this.movement.update(dt)
      if (this.playerSprite) {
        this.playerSprite.x = this.player.x
        this.playerSprite.y = this.player.y
        this.playerSprite.zIndex = this.player.y
        this.playerSprite.scale.x = Math.abs(this.playerSprite.scale.x) * (this.facing === 'left' ? -1 : 1)
      }
      if (this.shadowSprite) {
        this.shadowSprite.x = this.player.x
        this.shadowSprite.y = this.player.y + FOREST01_ADVENTURE_DISPLAY.contactShadowOffsetY
        this.shadowSprite.zIndex = this.player.y - 1
      }
      this.trigger.update()
      this.collectible.update()
      this.secret.update()
      this.quest.update()
      this.combat.update(dt)
      updateExitCheck(this)
    }
    this.updateFloatingSprites()
    this.updateFx(dt)
    this.updateShakes(dt)
    this.cameraSystem.update()
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
  }

  onEnemyKilled(typeId: string) {
    this.quest.onEnemyKilled(typeId)
  }

  finishStage(won: boolean) {
    if (this.finalResult) return // 已經結算過，避免重複觸發（例如玩家死亡瞬間又踩到出口）
    const purpleCoinCount = this.purpleCoinIds.size + this.pendingPurpleCoinBonus
    const starPieceCount = this.starPieceIds.size
    let stars: 0 | 1 | 2 | 3 = 0
    if (won) {
      stars = 1
      if (purpleCoinCount >= this.stage.starThresholds.purpleCoinCount) stars = (stars + 1) as 1 | 2
      if (starPieceCount >= this.stage.starThresholds.starPieceCount) stars = (stars + 1) as 1 | 2 | 3
    }
    const questCompleted = this.stage.quests.every(q => this.questsCompleted.has(q.id))
    this.finalResult = { won, stars, purpleCoinCount, starPieceCount, questCompleted }
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
      activeQuestTitle: activeQuest?.title ?? null,
      toast: this.toastText,
      stageResult: this.finalResult,
    }
    this.onHudChange(hud)
  }

  destroy(): void {
    this.destroyed = true
    if (this.app) {
      this.app.destroy(true, { children: true, texture: false })
      this.app = null
    }
  }
}
