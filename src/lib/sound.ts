let _ctx: AudioContext | null = null
let _muted: boolean = localStorage.getItem('dh_muted') === '1'

function getCtx(): AudioContext | null {
  if (_muted) return null
  if (!_ctx) _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

interface OscDef {
  f: number
  f2?: number
  t: OscillatorType
  dur: number
  vol: number
  delay?: number
  attack?: number
}

function tone(oscs: OscDef[]) {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  for (const o of oscs) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    const start = now + (o.delay ?? 0)
    const att   = o.attack ?? 0.005
    osc.type = o.t
    osc.frequency.setValueAtTime(o.f, start)
    if (o.f2 != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), start + o.dur)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(o.vol, start + att)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + o.dur)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(start)
    osc.stop(start + o.dur + 0.01)
  }
}

const _sfxRefs: HTMLAudioElement[] = []

function playSfx(src: string, volume = 1.0) {
  if (_muted) return
  const a = new Audio(src)
  a.volume = volume
  _sfxRefs.push(a)
  a.addEventListener('ended', () => {
    const idx = _sfxRefs.indexOf(a)
    if (idx >= 0) _sfxRefs.splice(idx, 1)
  })
  a.play().catch(() => {
    const idx = _sfxRefs.indexOf(a)
    if (idx >= 0) _sfxRefs.splice(idx, 1)
  })
}

export type SoundId = 'dice_roll' | 'swing' | 'hit' | 'skill' | 'enemy_swing' | 'hurt' | 'heal' | 'victory' | 'defeat'

export function playSound(id: SoundId): void {
  switch (id) {
    case 'dice_roll':
      tone([
        { f: 480, f2: 140, t: 'sawtooth', dur: 0.07, vol: 0.10 },
        { f: 620, f2: 200, t: 'sawtooth', dur: 0.05, vol: 0.07, delay: 0.025 },
        { f: 360, f2: 110, t: 'square',   dur: 0.06, vol: 0.06, delay: 0.048 },
      ])
      break
    case 'swing':
      tone([
        { f: 220, f2: 80,  t: 'sine',     dur: 0.14, vol: 0.20 },
        { f: 880, f2: 220, t: 'sawtooth', dur: 0.08, vol: 0.07, delay: 0.06 },
      ])
      break
    case 'hit':
      tone([
        { f: 180, f2: 45,  t: 'square',   dur: 0.13, vol: 0.24 },
        { f: 340, f2: 85,  t: 'sawtooth', dur: 0.08, vol: 0.13 },
        { f: 900, f2: 200, t: 'sine',     dur: 0.04, vol: 0.08, delay: 0.01 },
      ])
      break
    case 'skill':
      tone([
        { f: 110, f2: 440, t: 'sine',     dur: 0.13, vol: 0.22 },
        { f: 660, f2: 160, t: 'sawtooth', dur: 0.20, vol: 0.15, delay: 0.10 },
        { f: 80,  f2: 30,  t: 'sine',     dur: 0.38, vol: 0.28, delay: 0.08 },
        { f: 880, f2: 330, t: 'sine',     dur: 0.14, vol: 0.14, delay: 0.12 },
      ])
      break
    case 'enemy_swing':
      tone([
        { f: 140, f2: 55,  t: 'sawtooth', dur: 0.16, vol: 0.18 },
        { f: 720, f2: 160, t: 'square',   dur: 0.07, vol: 0.09, delay: 0.08 },
      ])
      break
    case 'hurt':
      tone([
        { f: 110, f2: 40,  t: 'sawtooth', dur: 0.18, vol: 0.26 },
        { f: 220, f2: 75,  t: 'square',   dur: 0.11, vol: 0.12, delay: 0.03 },
      ])
      break
    case 'heal':
      tone([
        { f: 523, t: 'sine', f2: 523, dur: 0.16, vol: 0.20, delay: 0.00, attack: 0.01 },
        { f: 659, t: 'sine', f2: 659, dur: 0.16, vol: 0.20, delay: 0.13, attack: 0.01 },
        { f: 784, t: 'sine', f2: 784, dur: 0.22, vol: 0.24, delay: 0.26, attack: 0.01 },
      ])
      break
    case 'victory':
      playSfx('/assets/bgm/sfx_victory.mp3', 0.8)
      break
    case 'defeat':
      playSfx('/assets/bgm/sfx_defeat.wav', 0.8)
      break
  }
}

export function isMuted(): boolean { return _muted }
export function setMuted(v: boolean): void {
  _muted = v
  localStorage.setItem('dh_muted', v ? '1' : '0')
  if (v) stopBgm()
}

// ── BGM ────────────────────────────────────────────────────────────────────
let _bgm: HTMLAudioElement | null = null
let _bgmSrc = ''

export function playBgm(src: string, volume = 0.5, crossfadeMs = 1500): void {
  if (_muted) return
  if (_bgmSrc === src && _bgm && !_bgm.paused) return   // 已在播放相同曲目

  _bgmSrc = src

  // 新音樂立即開始，從 0 淡入
  const newAudio = new Audio(src)
  newAudio.loop = true
  newAudio.volume = 0
  newAudio.play().catch(() => {})

  const old = _bgm
  _bgm = newAudio

  const start = performance.now()

  // 新音樂淡入
  const fadeIn = (now: number) => {
    if (_bgm !== newAudio) return   // 被更新的呼叫取代了
    const t = Math.min(1, (now - start) / crossfadeMs)
    newAudio.volume = volume * t
    if (t < 1) requestAnimationFrame(fadeIn)
    else newAudio.volume = volume
  }
  requestAnimationFrame(fadeIn)

  // 舊音樂同步淡出
  if (old && !old.paused) {
    const startVol = old.volume
    const fadeOut = (now: number) => {
      const t = Math.min(1, (now - start) / crossfadeMs)
      old.volume = startVol * (1 - t)
      if (t < 1) requestAnimationFrame(fadeOut)
      else { old.pause(); old.src = '' }
    }
    requestAnimationFrame(fadeOut)
  }
}

export function stopBgm(fadeMs = 800): void {
  const audio = _bgm
  if (!audio) return
  _bgm = null
  _bgmSrc = ''
  const start = performance.now()
  const startVol = audio.volume
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / fadeMs)
    audio.volume = startVol * (1 - t)
    if (t < 1) requestAnimationFrame(tick)
    else { audio.pause(); audio.src = '' }
  }
  requestAnimationFrame(tick)
}
