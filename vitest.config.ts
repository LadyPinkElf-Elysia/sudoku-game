import { defineConfig } from 'vitest/config'
import path from 'path'

// 与 vite.config.ts 分离：测试不需要 vue / vue-devtools 插件，只要 @ 别名
export default defineConfig({
    resolve: {
        alias: { '@': path.resolve('./src') },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
})
