import { defineConfig } from 'vitest/config'

// 固定在台灣時區執行，讓「早上 8 點前（UTC 仍是前一天）」的測試有意義。
process.env.TZ = 'Asia/Taipei'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
