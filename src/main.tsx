import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { useRegisterSW } from 'virtual:pwa-register/react'
import App from './App'
import './styles.css'
import './styles/astralLegacyRebuild.css'
import './styles/campaignMapNodeStarsV2.css'

const APP_BUILD   = __APP_BUILD__    // e.g. "v1.7.5 (2026-06-15)"
const APP_VERSION = __APP_VERSION__  // e.g. "1.7.5"
const BUILD_KEY   = 'dh_build'

const UPDATE_DURATION = 2200

function UpdateBanner() {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)',
      borderTop: '2px solid #4a8fe8',
      padding: '14px 20px 10px',
      display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.6)',
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🔄</span>
        <span style={{ color: '#a8d4ff', fontWeight: 700, fontSize: 15 }}>偵測到新版本，正在更新遊戲…</span>
        <span style={{ color: '#6a9fd8', fontSize: 12, marginLeft: 'auto' }}>請勿關閉頁面</span>
      </div>
      <div style={{ height: 6, background: '#0a1228', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #4a8fe8, #7bc8ff)',
          borderRadius: 4,
          animation: `dh-update-bar ${UPDATE_DURATION}ms linear forwards`,
        }} />
      </div>
      <style>{`@keyframes dh-update-bar { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  )
}

function Root() {
  const [updating, setUpdating] = useState(false)

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setUpdating(true)
      // 先掛上 controllerchange 監聽，等 SW 真正接管後再 reload
      // （避免 updateServiceWorker(true) 的 race condition：send SKIP_WAITING 後立刻 reload
      //   可能在新 SW 尚未接管時就 reload，導致舊 bundle 再次被載入）
      navigator.serviceWorker?.addEventListener('controllerchange', () => {
        window.location.reload()
      }, { once: true })
      setTimeout(() => updateServiceWorker(false), UPDATE_DURATION)
    },
    onOfflineReady() {},
  })

  useEffect(() => {
    // 補上 controllerchange→reload（autoUpdate 模式的核心機制）
    // 若 SW 已在背景 skipWaiting 且接管，確保頁面一定會 reload
    const onControllerChange = () => window.location.reload()
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange)

    // 每次 app 開啟強制讓 SW 立刻去比對新版本（不等瀏覽器的週期檢查）
    navigator.serviceWorker?.getRegistration().then(reg => {
      reg?.update().catch(() => {})
    })

    // localStorage 版本 fallback：新 bundle 載入時版號字串不同就 reload
    const prev = localStorage.getItem(BUILD_KEY)
    localStorage.setItem(BUILD_KEY, APP_BUILD)
    if (prev !== null && prev !== APP_BUILD) {
      setUpdating(true)
      setTimeout(() => window.location.reload(), UPDATE_DURATION)
      return () => navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)
    }

    // version.json 網路比對（第二道保險）
    // SW 對 /version.json 使用 NetworkOnly，即使舊 SW 也會走網路
    fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((data: { v: string }) => {
        if (data.v && data.v !== APP_VERSION) {
          setUpdating(true)
          navigator.serviceWorker?.getRegistration().then(reg => {
            if (reg) {
              reg.update().catch(() => {}).finally(() => {
                setTimeout(() => window.location.reload(), UPDATE_DURATION)
              })
            } else {
              setTimeout(() => window.location.reload(), UPDATE_DURATION)
            }
          }) ?? setTimeout(() => window.location.reload(), UPDATE_DURATION)
        }
      })
      .catch(() => {})

    return () => navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)
  }, [])

  return (
    <>
      <App />
      {updating && <UpdateBanner />}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
