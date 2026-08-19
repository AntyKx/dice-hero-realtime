import { Application, Container, Graphics, Sprite, type Texture } from 'pixi.js'
import { loadCharacterFrames, type AnimState } from '../arena/frameLoader'
import { getHeroRenderHeight, setSpriteHeight } from '../arena/heroSpriteRig'
import { ALL_CAMPAIGN_STAGE_ENEMIES, type EnemyTypeDef } from '../arena/enemies'
import type {
  AdventureStageDef, AdventureGameState, AdventureHudState, AdventureStageProgress,
  AdventureStageResult, CollectibleDef,
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
import { createTreasureChestGraphic, markChestOpened } from './objects/TreasureChest'
import { createBreakableWallGraphic, updateBreakableWallDamageVisual } from './objects/BreakableObject'
import { createExitGraphic, updateExitCheck } from './objects/StageExit'

export interface AdventureConfig {
  heroId: string
  stars?: number
  maxHp: number
  heroAtk: number
  partyHeroIds: string[]
  stageId: string
}

const PLAYER_RADIUS = 14
const TOAST_DURATION_SEC = 2.6

const COLOR_PURPLE_COIN = 0xb27bff
const COLOR_STAR_PIECE = 0xffe066
const COLOR_QUEST_ITEM = 0x8fd0ff
const COLOR_NPC = 0xffd39a
const COLOR_BRAZIER_UNLIT = 0x8a4a2a
const COLOR_BRAZIER_LIT = 0xff9a3c
const COLOR_COLLIDER = 0x4a3f2e

/**
 * Adventure Stage 探索引擎（2026-08-19）。跟 ArenaGame.ts 平行、獨立的
 * PixiJS Application——不共用 class，但同樣是「單一 worldLayer + camera，
 * 探索/戰鬤/劇情/謎題全部在同一張畫布切換狀態」的架構，不會有跳頁弄丟
 * 場景狀態的問題（見任務規劃文件的架構決策說明）。
 *
 * 這個類別本身是協調者：實際規則邏輯分散在 systems/combat/npc 底下的各個
 * System/Controller，這裡只負責建立 Pixi 場景、跑主迴圈、把各 System 串起來、
 * 彙整 HUD 狀態丟給 React 層（AdventureStageScreen.tsx）。
 */
export class AdventureGame {
  app: Application | null = null
  worldLayer!: Container
  stage: AdventureStageDef
  destroyed = false

  player = { x: 0, y: 0, hp: 0, maxHp: 0, radius: PLAYER_RADIUS }
  playerSprite: Sprite | null = null
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

  colliderActive = new Map<string, boolean>()
  private colliderGfx = new Map<string, Graphics>()

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
  private collectibleGfx = new Map<string, Container>()
  private brazierGfx = new Map<string, Graphics>()

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
    app.stage.addChild(this.worldLayer)

    const heroStars = Math.min(3, Math.max(0, this.cfg.stars ?? 0))
    const enemyIds = this.collectUsedEnemyIds()
    const [heroFrames, ...enemyFrameList] = await Promise.all([
      loadCharacterFrames(`/assets/frames/heroes/${this.heroId}/s${heroStars}`),
      ...enemyIds.map(id => loadCharacterFrames(`/assets/frames/enemies/${this.enemyTypeDefs[id]?.placeholderSpriteId ?? id}`)),
    ])
    if (this.destroyed) return
    enemyIds.forEach((id, i) => { this.enemyFrames[id] = enemyFrameList[i] })

    this.buildGreyboxScene()

    this.player.x = this.stage.spawn.x
    this.player.y = this.stage.spawn.y

    const playerSprite = new Sprite(heroFrames.idle[0])
    playerSprite.anchor.set(0.5, heroFrames.idle.length > 1 ? 1 : 0.5)
    setSpriteHeight(playerSprite, getHeroRenderHeight(this.heroId))
    playerSprite.x = this.player.x
    playerSprite.y = this.player.y
    playerSprite.zIndex = 500
    this.worldLayer.addChild(playerSprite)
    this.playerSprite = playerSprite
    this.worldLayer.sortableChildren = true

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

  // ── 場景建置（Greybox：色塊/圖形代替正式美術） ─────────────────────────

  private buildGreyboxScene() {
    const { world } = this.stage
    const ground = new Graphics().rect(0, 0, world.width, world.height).fill({ color: this.stage.groundColor })
    this.worldLayer.addChild(ground)

    for (const c of this.stage.colliders) {
      const gfx = new Graphics()
        .rect(0, 0, c.rect.width, c.rect.height)
        .fill({ color: COLOR_COLLIDER, alpha: 0.85 })
      gfx.x = c.rect.x; gfx.y = c.rect.y
      gfx.visible = this.colliderActive.get(c.id) ?? true
      this.worldLayer.addChild(gfx)
      this.colliderGfx.set(c.id, gfx)
    }

    for (const npc of this.stage.npcs) {
      const gfx = new Graphics().circle(0, 0, 16).fill({ color: COLOR_NPC })
      gfx.x = npc.x; gfx.y = npc.y
      this.worldLayer.addChild(gfx)
    }

    for (const puzzle of this.stage.puzzles) {
      for (const b of puzzle.braziers) {
        const gfx = new Graphics().circle(0, 0, 12).fill({ color: COLOR_BRAZIER_UNLIT })
        gfx.x = b.x; gfx.y = b.y
        this.worldLayer.addChild(gfx)
        this.brazierGfx.set(`${puzzle.id}:${b.id}`, gfx)
      }
    }

    for (const secret of this.stage.secrets) {
      if (secret.kind === 'breakable_wall') {
        const gfx = createBreakableWallGraphic(secret.area.width, secret.area.height)
        gfx.x = secret.area.x; gfx.y = secret.area.y
        this.worldLayer.addChild(gfx)
        this.colliderGfx.set(secret.id, gfx) // 跟同 id 的 collider 共用一個視覺物件
      } else {
        const gfx = new Graphics().rect(0, 0, secret.area.width, secret.area.height).fill({ color: 0x3a5a2a, alpha: 0.4 })
        gfx.x = secret.area.x; gfx.y = secret.area.y
        this.worldLayer.addChild(gfx)
      }
    }

    for (const c of this.stage.collectibles) this.buildCollectibleGfx(c)

    const exitGfx = createExitGraphic(this.stage.exit.radius)
    exitGfx.x = this.stage.exit.x; exitGfx.y = this.stage.exit.y
    this.worldLayer.addChild(exitGfx)
  }

  private buildCollectibleGfx(c: CollectibleDef) {
    const container = new Container()
    container.x = c.x; container.y = c.y
    if (c.kind === 'purple_coin') {
      container.addChild(new Graphics().circle(0, 0, 6).fill({ color: COLOR_PURPLE_COIN }))
    } else if (c.kind === 'star_piece') {
      const star = new Graphics().star(0, 0, 5, 9, 4).fill({ color: c.locked ? 0x555555 : COLOR_STAR_PIECE })
      container.addChild(star)
    } else if (c.kind === 'treasure') {
      container.addChild(createTreasureChestGraphic())
    } else {
      container.addChild(new Graphics().circle(0, 0, 8).fill({ color: COLOR_QUEST_ITEM }))
    }
    container.visible = !c.hidden
    this.worldLayer.addChild(container)
    this.collectibleGfx.set(c.id, container)
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
        this.playerSprite.scale.x = Math.abs(this.playerSprite.scale.x) * (this.facing === 'left' ? -1 : 1)
      }
      this.trigger.update()
      this.collectible.update()
      this.secret.update()
      this.quest.update()
      this.combat.update(dt)
      updateExitCheck(this)
    }
    this.cameraSystem.update()
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
    const gfx = this.colliderGfx.get(id)
    if (gfx) gfx.visible = active
  }

  setBrazierLit(puzzleId: string, brazierId: string) {
    const gfx = this.brazierGfx.get(`${puzzleId}:${brazierId}`)
    if (gfx) gfx.clear().circle(0, 0, 14).fill({ color: COLOR_BRAZIER_LIT })
  }

  updateBreakableWallVisual(secretId: string, hpPct: number) {
    const gfx = this.colliderGfx.get(secretId)
    if (gfx) updateBreakableWallDamageVisual(gfx, hpPct)
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
    const gfx = this.collectibleGfx.get(c.id)
    if (gfx) {
      if (c.kind === 'treasure' && gfx.children[0] instanceof Graphics) markChestOpened(gfx.children[0])
      else gfx.visible = false
    }
    this.emitHud()
  }

  revealCollectible(id: string) {
    this.revealedCollectibles.add(id)
    const gfx = this.collectibleGfx.get(id)
    if (gfx) gfx.visible = true
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
    const progress: AdventureStageProgress = {
      ...defaultAdventureStageProgress(),
      cleared: this.finalResult.won,
      bestStars: this.finalResult.stars,
      discoveredAreas: [...this.areasDiscovered],
      collectedPurpleCoins: [...this.purpleCoinIds],
      collectedStarPieces: [...this.starPieceIds],
      openedTreasures: [...this.treasureIds],
      completedQuests: [...this.questsCompleted],
      completedPuzzles: [...this.puzzlesCompleted],
      discoveredSecrets: [...this.secretsDiscovered],
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
