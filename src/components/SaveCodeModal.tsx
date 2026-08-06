import { useState } from 'react'

const META_KEY = 'dice_hero_meta_v2'
const RUN_KEY  = 'dice_hero_run_v1'

type Bundle = { v: number; meta: string | null; run: string | null }

function encode(obj: Bundle): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)))
}

function decode(code: string): Bundle {
  return JSON.parse(decodeURIComponent(atob(code.trim()))) as Bundle
}

export default function SaveCodeModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab]             = useState<'export' | 'import'>('export')
  const [importCode, setImportCode] = useState('')
  const [status, setStatus]       = useState<'idle' | 'ok' | 'err'>('idle')
  const [copied, setCopied]       = useState(false)

  const exportCode = encode({
    v: 1,
    meta: localStorage.getItem(META_KEY),
    run:  localStorage.getItem(RUN_KEY),
  })

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportCode)
    } catch {
      // fallback: select the textarea
      const el = document.querySelector<HTMLTextAreaElement>('.save-code-area')
      el?.select()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleImport = () => {
    try {
      const bundle = decode(importCode)
      if (!bundle || bundle.v !== 1) throw new Error('bad version')
      if (bundle.meta) localStorage.setItem(META_KEY, bundle.meta)
      if (bundle.run)  localStorage.setItem(RUN_KEY, bundle.run)
      else             localStorage.removeItem(RUN_KEY)
      setStatus('ok')
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      setStatus('err')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2>📦 存檔備份</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p className="modal-desc">
          存檔僅儲存在本機瀏覽器，換裝置或清除瀏覽器資料後會消失。<br />
          請將存檔碼複製保存；換裝置時貼回即可還原進度。
        </p>

        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'export' ? 'active' : ''}`} onClick={() => setTab('export')}>匯出存檔</button>
          <button className={`modal-tab ${tab === 'import' ? 'active' : ''}`} onClick={() => setTab('import')}>還原存檔</button>
        </div>

        {tab === 'export' && (
          <div className="modal-section">
            <p className="modal-hint">複製以下存檔碼，貼到記事本或雲端筆記保存：</p>
            <textarea
              className="save-code-area"
              readOnly
              value={exportCode}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
            />
            <button className="primary modal-action-btn" onClick={handleCopy}>
              {copied ? '✓ 已複製！' : '複製存檔碼'}
            </button>
          </div>
        )}

        {tab === 'import' && (
          <div className="modal-section">
            <p className="modal-hint">貼入之前匯出的存檔碼，然後按「還原」：</p>
            <textarea
              className="save-code-area"
              placeholder="貼入存檔碼..."
              value={importCode}
              onChange={e => { setImportCode(e.target.value); setStatus('idle') }}
            />
            {status === 'ok'  && <p className="import-status ok">✓ 還原成功，重新載入中…</p>}
            {status === 'err' && <p className="import-status err">✕ 存檔碼格式錯誤，請確認是否完整複製</p>}
            <button
              className="primary modal-action-btn"
              onClick={handleImport}
              disabled={!importCode.trim() || status === 'ok'}
            >
              還原存檔
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
