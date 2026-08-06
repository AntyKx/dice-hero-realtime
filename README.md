# Dice Hero RPG - 像素角色模組整合版

這一版已把新版像素角色風格正式整合到遊戲原型：

- 10 名英雄已全部改用新的 JRPG 像素 sprite sheet
- 10 名敵人已全部改用新的 JRPG 像素 sprite sheet
- 每個角色都具備 6 格動畫狀態：
  - idle_0
  - idle_1
  - attack_0
  - attack_1
  - skill_0
  - hurt_0
- 戰鬥畫面會依行為自動切換動畫狀態
- 可以切換英雄、切換敵人、重置戰鬥、擲骰攻擊

## 啟動方式

```bash
npm install
npm run dev
```

預設會開在類似：

```bash
http://localhost:5173
```

## 建置正式版

```bash
npm run build
```

## 資源位置

- 英雄 sprite sheets：`public/assets/spritesheets/heroes/`
- 敵人 sprite sheets：`public/assets/spritesheets/enemies/`
- 單格 frame：`public/assets/frames/`
- 對應資訊：`public/assets/spritesheets/manifest.json`

## 備註

這版重點是先把你確認過的「新角色風格」真正帶入遊戲模組中，
不再使用先前那套醜的暫時人物圖。
