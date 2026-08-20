import type { AdventureGame } from '../AdventureGame'

// 2026-08-19：Room Transition 架構——鏡頭不再跟著玩家在連續世界裡捲動，
// 而是「鎖」在玩家目前所在的房間，房間本身固定不動，玩家在房間「畫面內」
// 自己走。
//
// 2026-08-19 稍晚修正：原本用純 contain-fit（等比縮放到完整塞進畫面，兩邊
// 一定留白），玩家實測回報「畫面沒填滿」——用新增的除錯讀數（🐞 開啟後的
// screen/window/room/scale 那行文字）拿到實際數字才真的定位到根因：
// screen 402x874、room 1080x1920，算出來 scale 是被寬度卡住的
// （402/1080=0.372 < 874/1920=0.455）。這不是量錯尺寸的 bug——手機螢幕比例
// （402:874≈1:2.17）比房間圖（1080:1920=1:1.78）還要細長，只要用
// contain-fit，不管尺寸量得多準，上下都一定會留白，這是這個 fit 模式數學
// 上保證的結果，之前兩輪一直在修「量尺寸」是找錯方向。
//
// 改成「有安全上限的 cover-fit」：儘量裁切填滿螢幕，但裁切量不會超過
// MAX_CROP_PER_SIDE_WU（世界單位）——這個值小於目前 10 個房間裡最窄的
// 出口留白，量過所有房間的可走範圍／出口 zone 得出的最小值），保證不管
// 哪個裝置的螢幕比例多極端，都不會把任何出口或可走範圍真的裁到畫面外面。
//
// 2026-08-19 再修一次：原本最窄的是 room_06 的 06_to_06A 出口（只有 50），
// 把那個出口往房間中心挪寬到 90 之後，全關卡最窄變成 70（room_03 的
// 03_to_03A），這裡的安全上限跟著從 45 拉高到 65，畫面能填得更滿。
//
// 2026-08-19 再修一次（bug）：AdventureGame.ts 的 🐞 除錯讀數當初是照舊版
// 純 contain-fit 公式寫的，後來這裡改成 cover-fit 卻忘記同步過去——玩家照
// 這個讀數判斷「換版本了沒」，結果讀數本身是死的（永遠算 contain-fit，跟
// 畫面實際用的縮放公式脫鉤），来回好幾輪都在查一個不存在的快取問題。把
// 公式抽成這裡 export 的 computeRoomFitScale()，CameraSystem 跟除錯讀數
// 兩邊改成呼叫同一份，兩邊就不可能再算出不同的數字。
//
// 2026-08-19 再修一次：原本怕裁到出口，加了 MAX_CROP_PER_SIDE_WU 上限，
// 結果留白還是不夠小，玩家明確要求「全滿」——拿掉上限，直接用完整
// cover-fit（哪一軸留白就放大到那一軸也填滿，兩軸都不留白）。裁掉的部分
// 純粹是「螢幕外看不到」，不影響任何邏輯：collision／transition zone 判定
// 都是比較世界座標，跟鏡頭目前顯示範圍完全無關，出口被裁到螢幕外一樣走
// 得進去，只是玩家看不到自己正要走進去的那一小塊，不是功能性的 bug。
export function computeRoomFitScale(screenW: number, screenH: number, roomSize: { width: number; height: number }): number {
  return Math.max(screenW / roomSize.width, screenH / roomSize.height)
}

export class CameraSystem {
  constructor(private game: AdventureGame) {}

  update() {
    const g = this.game
    if (!g.app || !g.stage.rooms) return
    const room = g.roomSystem.activeRoom
    const screenW = g.app.screen.width
    const screenH = g.app.screen.height
    const scale = computeRoomFitScale(screenW, screenH, room.size)

    const roomCenterX = room.atlasOrigin.x + room.size.width / 2
    const roomCenterY = room.atlasOrigin.y + room.size.height / 2

    g.worldLayer.scale.set(scale)
    g.worldLayer.position.set(
      screenW / 2 - roomCenterX * scale,
      screenH / 2 - roomCenterY * scale,
    )
  }
}
