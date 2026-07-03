import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // 只快取 app shell,離線時可瀏覽已載入過的頁面;不做背景推播(對應設計文件 §4.1)
      manifest: {
        name: '蘑菇重生計時器',
        short_name: '蘑菇計時器',
        description: '協作記錄皮克敏手遊蘑菇重新生長時間',
        theme_color: '#8a4fd6',
        background_color: '#fdfaf3',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
})
