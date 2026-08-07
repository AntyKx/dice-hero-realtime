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
                name: 'Dice Hero',
                short_name: 'Dice Hero',
                description: '以骰子決定命運，踏上英雄之路',
                theme_color: '#0a1228',
                background_color: '#0a1228',
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
                        src: 'icons/icon-512.png',
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
                            cacheName: 'game-assets-v4',
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
