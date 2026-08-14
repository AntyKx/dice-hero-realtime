# ASTERVOW 品牌重製（2026-08）

DiceHero 從「骰子英雄」重新命名／改視覺為 **ASTERVOW**（星界航海聖殿主題）。
這份文件記錄品牌重製涉及的畫面（首頁／大廳）與過程中踩過的坑，特別是
首頁背景「滿版」問題繞了好幾輪才定案，之後改動前先看這份，避免重複踩坑。

## 視覺系統

`src/styles.css` `:root` 內的 `--av-*` token：

| Token | 值 | 用途 |
|---|---|---|
| `--av-midnight` | `#080f24` | 最深底色 |
| `--av-navy` | `#101c3c` | 面板/卡片底色 |
| `--av-gold` | `#e9b85c` | 唯一互動強調色（Astral Gold） |
| `--av-gold-soft` | `rgba(233,184,92,.34)` | 邊框/次要強調 |
| `--av-ink` | `#f8e8c7` | 金色系文字上的淺色前景 |
| `--av-font-display` | `Cinzel, "Noto Sans TC", serif` | 標題字體 |

共用 class：`.av-wordmark`（ASTERVOW 文字 logo）、`.av-sigil`（CSS 手繪星羅盤徽記，
不是圖片）、`.av-glass-btn`（玻璃質感次要按鈕）、`.av-cta-btn`（實心金色主要 CTA）。
只套用在首頁／大廳兩個入口畫面，戰鬥內 UI 不套用。

主視覺素材：`public/assets/astervow-home-bg.png`（941×1672 PNG，靜態圖/影片
poster）、`public/assets/astervow-home-motion-pingpong.mp4`（720×1280，16 秒
無聲「前進→倒放」循環影片，同一張構圖）。

## 首頁（MainMenuScreen.tsx / `.main-menu.av-home`）

### 目前定案版面

單層 `object-fit: cover` 滿版鋪底圖／影片，CTA 用 `position:absolute` 疊在
圖片下緣。**不要**再改成「不裁切正片＋模糊底圖延伸」的雙層做法——那個
方向試過，使用者實機比對後明確選擇滿版優先、文字裁一點點可以接受，回頭
改成單層 cover。

```
.main-menu.av-home        ← position:relative, height:100dvh, overflow:hidden
├─ <video>/<img> .av-home-art   ← position:absolute inset 0, object-fit:cover
└─ .av-home-safe                ← position:absolute bottom:max(...), CTA 疊圖上
```

### 踩過的坑（照時間順序，改動前務必看完）

1. **`.main-menu` 跟 `.av-home` 是同一個 `<div>` 上的兩個 class**
   （JSX 寫 `className="main-menu av-home"`）。如果把同一個 CSS 屬性
   （例如 `height`）分別寫在 `.main-menu {}` 和 `.av-home {}` 兩條規則裡，
   後面那條會贏，且贏的那條如果用了 `height:100%` 又找不到有高度的父層可以
   依附，畫面會直接塌成 0（首頁全黑，實際發生過一次）。**同一個屬性只能
   出現在其中一條規則，或乾脆寫成 `.main-menu.av-home { ... }` 合併選擇器。**

2. **`vh` vs `dvh`**：Safari 的 `100vh` 是「網址列收起來」那個較高的值，
   網址列還顯示著時畫面實際可視高度比 `100vh` 矮。全部改用 `100dvh`
   （必要時 `100svh` 當保底，寫在 `100dvh` 前面，讓不支援 dvh 的瀏覽器
   還有一個合理值）。這個問題不只首頁有，`AdventureReadyScreen` 的
   `.ar-screen` 也踩過同一個坑（見下方大廳章節）。

3. **`position:absolute` 元素不要同時寫 `inset` 又寫明確 `width`/`height`**。
   `<img>`/`<video>` 是 replaced element，規格書規定 `width`/`height` 為
   `auto` 時要改用圖片自己的原始尺寸而不是撐滿容器；如果同時又給了明確
   `width`/`height`（例如 `inset:-24px` 搭配 `width:calc(100% + 48px)`），
   兩者互相衝突（over-constrained），不同瀏覽器引擎解法不保證一致——
   桌面 Chrome 測試正常，但真機 Safari 曾經把這個衝突解成尺寸塌陷成 0，
   模糊背景完全沒畫出來，畫面看起來像「還是空一塊」，桌面測試卻看不出
   問題。**要嘛只寫 `inset`，要嘛 `top/left/width/height` 全部寫明確值，
   不要兩者混用。**「出血」（overflow 一點點蓋掉邊緣瑕疵）改用
   `transform: scale()`，那是繪製後的視覺變形，不參與版面尺寸計算。

4. **`.page` 外層包裝的 padding 會跟畫面自己的 `100dvh` 版面疊加**。
   `AdventureReadyScreen`（`.ar-screen`）自己管理 `height:100dvh` 的整頁
   版面（含底部固定導覽），但外層 `<div className="page">` 預設有
   `padding: max(20px, safe-area) 20px 20px`，兩者疊加後整個畫面比視窗
   高 40px，底部導覽會被切到看不見。修法：`.page:has(.ar-screen) { padding:
   0; }`，改由 `.ar-screen` 自己補 `padding-top: env(safe-area-inset-top)`。
   **這個修法本身又製造了一個新 bug**：`.topbar`（地城副本分頁用的品牌列
   +返回鍵）沒有自己的左右 padding，一直是靠 `.page` 的兩側內距頂開螢幕
   邊緣，`.page` 內距清空後標題跟返回鍵貼到螢幕邊緣。最終修法是
   `.ar-screen > .topbar { padding: 0 20px; }`，只在這個情境下補回，不影響
   `.topbar` 在其他仍被 `.page` 正常包住的畫面。**如果之後還有其他畫面也
   想比照 `.ar-screen` 自己管理 `height:100dvh`，記得同時檢查該畫面內有
   沒有元件依賴外層 `.page` 的 padding 才能正確顯示。**

5. **`blur()` + `brightness()` 疊太重會把有內容的區域變成看起來像沒渲染**。
   試過模糊底圖方案時，`filter: blur(60px) brightness(.4)` 套在裁切到圖片
   最上面（本來就最空、星星最稀疏）的區域，色彩細節被抹平到肉眼看起來
   就是一塊純色，跟真的沒渲染分不出來——這不是渲染失敗，是參數選得太
   激進。如果之後又想做類似的模糊延伸效果，強度不要一次跳到 `blur(60px)`
   這種量級，先從 20~30px 量級開始，並且裁切位置優先選圖片中段（有實際
   內容的區域）而不是最空的邊緣。

6. **真機除錯技巧**：這次調不出問題時，臨時在畫面上加了一段
   `position:fixed` 的除錯文字（印 `getBoundingClientRect()`／
   `getComputedStyle()`／`naturalWidth`／`complete` 等），請使用者截圖回傳，
   比隔空猜 CSS 快很多——沒辦法連真機除錯（沒有 Mac / Safari Remote
   Inspector）時，這是最快的替代方案。改完記得把除錯區塊整段移除
   （不要留在正式版本裡）。

### 首頁動畫

`useHomeMotionEnabled()` 掛載條件：尊重 `prefers-reduced-motion`、
`navigator.connection.saveData`／`effectiveType` 為 `2g`/`slow-2g` 時不载入
影片，延遲 900ms 才掛載（避免搶首屏繪製資源）。影片本身是「前進→倒放」
pingpong 版（`astervow-home-motion-pingpong.mp4`），取代原本 8 秒版直接
循環——8 秒版即使已經用 Blob 預先載入避免網路緩衝造成的頓感，播完硬切回
第一幀的視覺跳動還是在；pingpong 版倒放回去，循環點完全無感。

## 大廳（AdventureReadyScreen.tsx，`modeTab === 'main'`）

首頁 CTA「進入星界大廳」點下去之後的畫面，改造成類似遊戲大廳的版面
（原始需求來自使用者提供的一個 Manus 設計轉移包 mockup，用現有的長方形
立繪/CUT IN 圖重新排版，不是去背全身立繪站台）：

- **`.av-lobby-topbar`**：左上玩家資訊（頭像+暱稱+總星數，`totalStars` 是
  全英雄星數加總的真實資料，不是假造的帳號等級）、右上金幣/星塵資源
  +選單按鈕。只在 `modeTab==='main'` 顯示，取代原本共用的 `.topbar`
  品牌列；`modeTab==='dungeon'` 維持原本的 `.topbar`。
- **英雄站台**：`.av-lobby-stage` 顯示目前選中英雄的立繪，下方
  `.av-lobby-stage-switcher` 是全部 11 位英雄的快速切換列。
- **章節輪播**：`.av-lobby-chapter`，森林遺跡有真實固定關卡星數進度
  （`getChapterTotalStars`/`getChapterMaxStars`），裂隙前兆篇/深海遺城篇
  是即時制 Roguelite 隨機章節、沒有逐關進度，卡片上只給類型說明，不假造
  星數。
- **`.av-lobby-dock`**：底部固定導覽（大廳/地城/開始/英雄/裝備），是大廳
  唯一的跨功能導覽入口——原本另外有一列功能磚跟這裡重複，使用者反映
  「入口重複」後拿掉了。
- **右側抽屜選單**（`.av-drawer`）：星界圖鑑、雲端存檔是真實功能；禮物與
  郵件、遊戲設定目前沒有對應系統，比照 `MainMenuScreen` 既有的「成就
  （即將推出）」慣例標示即將推出，不假造內容。回到首頁在抽屜底部。

`modeTab==='dungeon'`（地城副本分頁）版面完全沒動，維持原本的清單式
左右兩欄（`.ar-body`/`.ar-options`/`.ar-hero-panel`）。

## 已知取捨（不是 bug，是刻意決定）

- 首頁背景滿版會裁到 ASTERVOW 文字左右邊緣一點點——圖片本身文字幾乎頂到
  邊緣，沒有安全邊界，這是「滿版優先」跟「文字不裁切」兩個目標互斥時
  使用者明確選邊的結果，不要因為看到文字被裁就當成 bug 去改。
- 大廳的「地城/英雄/裝備」在底部導覽跟其他地方不會重複出現第二次入口，
  新增大廳功能時比照這個原則，避免同一功能兩個地方都能點。
