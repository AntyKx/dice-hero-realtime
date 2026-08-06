import { useState } from 'react'

interface Props {
  onConfirm: (name: string) => void
}

export default function PlayerNameModal({ onConfirm }: Props) {
  const [input, setInput] = useState('')

  const confirm = () => {
    const name = input.trim() || '勇者'
    onConfirm(name)
  }

  return (
    <div className="pnm-overlay">
      <div className="pnm-card">
        <div className="pnm-title">👑 設定玩家名稱</div>
        <div className="pnm-desc">此名稱將顯示在全服排行榜上，之後可在通關畫面修改。</div>
        <input
          className="pnm-input"
          placeholder="輸入名稱（最多 12 字）"
          maxLength={12}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirm()}
          autoFocus
        />
        <div className="pnm-hint">不填則預設為「勇者」</div>
        <button className="pnm-btn" onClick={confirm}>確認</button>
      </div>
    </div>
  )
}
