import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SRC_DIR = 'D:/CLAUDE專案/三選一/關卡設計/灰燼王國/雪原/ASTERVOW_SNOW_MAPS_FINAL_DELIVERY';
const manifest = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'manifest.json'), 'utf8'));

let count = 0;
const tasks = manifest.rooms.map(async (r) => {
  const chapterNum = r.chapter.replace('2-', ''); // "2-1" -> "1"
  const roomSuffix = r.room_id.replace('room_', ''); // "room_01" -> "01", "room_04a" -> "04a"
  const srcPath = path.join(SRC_DIR, r.filename);
  const destDir = `public/assets/adventure/snowfield_2_${chapterNum}/rooms`;
  const destPath = path.join(destDir, `room${roomSuffix}.webp`);

  if (!fs.existsSync(destDir)) {
    console.error('MISSING TARGET DIR', destDir, 'for', r.chapter, r.room_id);
    return;
  }
  if (!fs.existsSync(destPath)) {
    console.error('NO EXISTING FILE TO REPLACE AT', destPath, 'for', r.chapter, r.room_id);
    return;
  }

  await sharp(srcPath).webp({ quality: 84 }).toFile(destPath + '.tmp');
  fs.renameSync(destPath + '.tmp', destPath);
  count++;
});

await Promise.all(tasks);
console.log('Converted', count, '/', manifest.rooms.length, 'rooms');
