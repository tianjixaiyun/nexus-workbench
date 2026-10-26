import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/nexus-workbench/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'NEXUS 个人工作台',
        short_name: 'NEXUS',
        description: '任务 · 习惯 · 专注 · 笔记 · 数据,一体化的个人效率工作台',
        lang: 'zh-CN',
        start_url: '/nexus-workbench/',
        scope: '/nexus-workbench/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#05080f',
        background_color: '#05080f',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 新版本 SW 立即接管并清掉旧缓存,避免"更新了还看到旧版"
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // ECharts 等大资源不预缓存,运行时按需缓存
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            // 天气 API:网络优先,失败回退缓存
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'weather-cache', expiration: { maxEntries: 20, maxAgeSeconds: 1800 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            // react 生态先于 three 分组捕获:否则 rolldown 会把 react/zustand 并进 three 组,
            // 入口静态引用 zustand 导致 three 分包被 modulepreload 拉回首屏
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-reconciler|its|zustand)[\\/]/, priority: 2 },
            { name: 'three', test: /node_modules[\\/]three|node_modules[\\/]@react-three/ },
            { name: 'echarts', test: /node_modules[\\/]echarts/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
