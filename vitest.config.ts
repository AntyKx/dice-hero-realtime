import { defineConfig } from 'vitest/config'

// 獨立設定，避免測試時載入 vite-plugin-pwa
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
