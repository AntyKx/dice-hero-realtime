# 章節旅程節點系統（Chapter Travel）

森林遺跡 1–20 關選關前的過場動畫（`chapterTravelTypes.ts`/`chapterTravelData.ts`
+ `../components/CampaignTravelPreview.tsx`）。跟 `campaignTypes.ts`/
`chapters/forestRuins.ts`（關卡戰鬥資料）完全分開——這一套只負責「玩家
點選關卡後、進入戰鬥前的走位畫面」，不含任何戰鬥/勝負邏輯。

完整說明（四篇章 24 段對照表、美術替換對照表、接地感實作方式、已知限制）
見 **`docs/campaign-travel-system.md`**（專案根目錄的 `docs/` 資料夾），
這裡不重複寫一份避免內容漂移。

快速摘要：`CampaignMapScreen.tsx` 點選關卡時先呼叫
`hasTravelSegments(stageId)` 判斷要不要攔截，有資料就開
`CampaignTravelPreview`，播完或按「略過」都會呼叫同一個 `onFinish` →
原本的 `onSelectStage(stageId)`；沒有旅程資料的關卡維持原本直接跳轉的
行為（目前森林遺跡 1–20 關全部都有資料，其他篇章/副本/Roguelite Run
不受影響）。
