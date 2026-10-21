import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import vueDevTools from "vite-plugin-vue-devtools";
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 本机联调的后端地址：环境变量 API_TARGET > .env.local > 默认本地 Functions
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      vue(),
      vueDevTools(),
      Icons({ autoInstall: true }),
      AutoImport({
        imports:['vue','vue-router','pinia'],
        dirs:[
          'src/composables',
          'src/core'
        ],
        resolvers: [
          ElementPlusResolver(),
          IconsResolver({ prefix: 'Icon' }), 
        ],
        dts:'src/auto-imports.d.ts',
      }),
      Components({
        dirs: ['src/components'],
        resolvers: [
          ElementPlusResolver(),
          IconsResolver({ enabledCollections: ['ep'] }), 
        ],
        dts: 'src/components.d.ts',
      })
    ],
    base: './',
    resolve: {
      alias: {
        "@": path.resolve("./src")
      }
    },
    server: {
      // 默认：本地后端 127.0.0.1:8788（npx wrangler pages dev）
      // 直连线上后端（用线上数据）：.env.local 里写 API_TARGET=https://xxx.pages.dev
      proxy: { '/api': env.API_TARGET || 'http://127.0.0.1:8788' },
    },
  }
})
