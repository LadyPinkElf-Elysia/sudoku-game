import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(),vueDevTools()],
  base: './', 
  resolve:{
    alias:{
      "@":path.resolve("./src")
    }
  },
  server: {                                   // ★ 新增：本地联调把 /api 转发到后端
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },

})
