import { useEffect, useMemo, useState } from 'react'
import type { SpriteMeta } from '../data'

type AnimState = 'idle' | 'attack' | 'skill' | 'hurt'

type Props = {
  sprite: SpriteMeta
  state: AnimState
  scale?: number
  flip?: boolean
  glow?: boolean
  singleFrame?: number  // freeze on this frame index (no animation, all states)
  idleFrame?: number    // freeze idle on this frame index; attack/skill/hurt still animate
}

const DEFAULT_FRAME_COUNT = 6

export default function SpriteAnimator({ sprite, state, scale = 1.8, flip = false, glow = false, singleFrame, idleFrame }: Props) {
  const [frame, setFrame] = useState(singleFrame ?? idleFrame ?? 0)

  const actualFrameCount = sprite.frameCount ?? DEFAULT_FRAME_COUNT
  const frameRow  = sprite.frameRow  ?? 0
  const totalRows = sprite.totalRows ?? 1

  const sequence = useMemo(() => {
    if (singleFrame !== undefined) return { frames: [singleFrame], speed: 999 }
    const last = actualFrameCount - 1
    if (state === 'attack') return { frames: [2, Math.min(3, last)], speed: 150 }
    if (state === 'skill')  return { frames: [actualFrameCount === 5 ? 3 : Math.min(4, last)], speed: 220 }
    if (state === 'hurt')   return { frames: [last], speed: 250 }
    if (idleFrame !== undefined) return { frames: [idleFrame], speed: 999 }
    return { frames: [0, Math.min(1, last)], speed: 420 }
  }, [state, actualFrameCount, singleFrame, idleFrame])

  useEffect(() => {
    let tick = 0
    setFrame(sequence.frames[0])
    if (sequence.frames.length === 1) return
    const timer = window.setInterval(() => {
      tick = (tick + 1) % sequence.frames.length
      setFrame(sequence.frames[tick])
    }, sequence.speed)
    return () => window.clearInterval(timer)
  }, [sequence])

  const scaledW = Math.floor(sprite.frameWidth  * scale)
  const scaledH = Math.floor(sprite.frameHeight * scale)

  return (
    <div className={glow ? 'sprite-shell glow' : 'sprite-shell'} style={{ flexShrink: 0 }}>
      <div style={{ width: scaledW, height: scaledH, overflow: 'hidden' }}>
        <div
          className="sprite-viewport"
          style={{
            width: scaledW,
            height: scaledH,
            // Cloudflare 對 /assets/ 底下的靜態檔案套用長天期 edge cache，只認
            // URL 有沒有命中過，跟部署版本無關——sheet 檔名在角色動畫模組重做
            // 時不會變但內容會變，一定要帶版號 query string 才能確保拿到新內容
            // （之前這裡是手動維護的固定數字 27，不會隨部署自動更新，換成
            // __APP_VERSION__ 每次改版號就自動失效，見 arena/frameLoader.ts
            // 的 versioned() 同款修法）。
            backgroundImage: `url(${sprite.sheet}?v=${__APP_VERSION__})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${scaledW * actualFrameCount}px ${scaledH * totalRows}px`,
            backgroundPosition: `${-frame * scaledW}px ${-frameRow * scaledH}px`,
            imageRendering: 'auto',
            transform: flip ? 'scaleX(-1)' : undefined,
          }}
        />
      </div>
    </div>
  )
}
