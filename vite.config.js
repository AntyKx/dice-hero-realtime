import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { writeFileSync } from 'fs';
import pkg from './package.json';
var APP_VERSION = pkg.version;
var APP_BUILD_STAMP = "v".concat(APP_VERSION, " (").concat(new Date().toISOString().slice(0, 10), ")");
// Plugin: write dist/version.json after every build so the app can detect updates
function versionJsonPlugin() {
    return {
        name: 'version-json',
        closeBundle: function () {
            writeFileSync('dist/version.json', JSON.stringify({ v: APP_VERSION }));
        },
    };
}
export default defineConfig({
    define: {
        __APP_BUILD__: JSON.stringify(APP_BUILD_STAMP),
        __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
    build: {
        // 真正的 bug 根源（2026-08-11 找到）：Vite 預設 build.assetsDir 也叫
        // 'assets'，跟 public/assets/ 撞名，兩邊的檔案在 dist/assets/ 底下混在
        // 一起。vite-plugin-pwa 生成 precache manifest 時，會把 dist/assets/
        // 底下的檔案當成「Vite 自己雜湊過檔名、URL 本身就會變」而給
        // revision:null（JS/CSS chunk 檔名本來就有 hash，這樣做沒問題）——但
        // public/assets/ 底下的圖檔是原始檔名複製過去的，並沒有雜湊，
        // revision:null 等於「這個 URL 永遠不會被判定成有更新」，導致本次工作
        // 階段好幾次角色圖／地圖圖更新後，玩家瀏覽器的 SW precache 永遠卡在第
        // 一次快取到的舊圖，version.json/game-assets-vN 版號怎麼跳都沒用（那些
        // 版號機制管的是另一個 runtime cache，precache 這層根本沒被那些機制
        // 動到）。把 Vite 自己的雜湊輸出目錄改名避開撞名，dist/assets/ 底下就
        // 只剩 public/assets/ 複製過去的檔案，vite-plugin-pwa 才會正確算出
        // 內容雜湊當 revision，之後圖檔內容一變 precache 就會正確跟著更新。
        assetsDir: '_build',
        rollupOptions: {
            output: {
                manualChunks: {
                    firebase: ['firebase/app', 'firebase/auth'],
                },
            },
        },
    },
    plugins: [
        react(),
        versionJsonPlugin(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'icons/*.png'],
            manifest: {
                name: 'ASTERVOW',
                short_name: 'ASTERVOW',
                description: '星界航海聖殿——擲出下一條路，讓命運替你開門',
                theme_color: '#080f24',
                background_color: '#080f24',
                display: 'standalone',
                orientation: 'portrait-primary',
                start_url: '/',
                scope: '/',
                icons: [
                    {
                        src: 'icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'icons/icon-512-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                skipWaiting: true,
                clientsClaim: true,
                // version.json は絕不 precache，讓它永遠走網路
                globIgnores: ['**/version.json'],
                globPatterns: ['**/*.{js,css,html,png,jpg,webp,svg,ico,woff2}'],
                maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
                ignoreURLParametersMatching: [/^v$/],
                runtimeCaching: [
                    {
                        // version.json: 永遠走網路，絕不快取
                        urlPattern: /\/version\.json/,
                        handler: 'NetworkOnly',
                    },
                    {
                        // sprite sheets 與遊戲資源：StaleWhileRevalidate
                        urlPattern: /\/assets\//,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'game-assets-v22',
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 60 * 60 * 24 * 7,
                            },
                        },
                    },
                ],
            },
        }),
    ],
});
