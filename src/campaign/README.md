# 固定式主線關卡系統（src/campaign/）

九個章節（三篇 × 三章，每章 10 關）的純資料層，執行期邏輯（波次生成、
Objective 判定、星星計算）在 `src/arena/objectives.ts` 跟 `ArenaGame.ts`
的 `initCampaignStage()`/`updateObjective()`，UI 在
`SagaSelectScreen.tsx`/`CampaignChapterSelectScreen.tsx`/
`CampaignMapScreen.tsx` 三層。完整架構說明見專案根目錄 `CLAUDE.md` 的
「即時制 ASTERVOW 大廳 + 固定式主線關卡系統」一節，這裡不重複寫一份避免
內容漂移。

## ⚠️ 章節旅程節點系統（Chapter Travel）——已停用，不是死碼但沒有接線

`chapterTravelTypes.ts`/`chapterTravelData.ts` + `../components/
CampaignTravelPreview.tsx` 曾經是森林遺跡舊版 20 關選關前的過場動畫，
**2026-08-16 森林遺跡從 20 關砍到 10 關重新設計後，`CampaignMapScreen.tsx`
已經不再呼叫 `hasTravelSegments()`/`CampaignTravelPreview`**——這批資料是
針對舊版 20 關的關卡順序/劇情手寫的，砍成 10 關後內容跟新關卡對不上，
與其顯示錯亂的過場劇情，選擇直接拔線，檔案保留但目前完全沒有任何畫面
引用。`docs/campaign-travel-system.md` 記錄的是這套系統停用前的完整設計，
當歷史文件看即可；如果之後要幫森林遺跡重做過場動畫，要對照*現在*的 10
關內容重寫，不能直接復用這批舊資料。
