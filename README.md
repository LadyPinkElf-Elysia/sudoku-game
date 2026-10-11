# 数独（Vue 3 + Cloudflare Pages Functions + D1）

浏览器数独：系统随机生成 · 自定义题面 · 出题与分享 · 搜索挑战 · 账号与「我的题目」管理。

## 技术栈

- 前端：Vue 3 + TypeScript + Pinia + Vue Router（hash 路由）+ Vite
- 后端：Cloudflare Pages Functions + D1（SQLite）
- 架构：`core`（纯函数）→ `services` / `stores` → `composables` → `components` / `pages`（硬约束见 `ARCHITECTURE.md`）

## 命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 前端开发服务器（`/api` 代理到 `127.0.0.1:8788`） |
| `pnpm build` | `guard` + `vue-tsc` + `typecheck:functions` + `vite build`（产物在 `dist/`） |
| `pnpm guard` | 架构守卫（R1~R15 红规则，违规 exit 1；build 前自动跑） |
| `pnpm typecheck` | 前端类型检查（`vue-tsc`） |
| `pnpm typecheck:functions` | 后端类型检查（`tsc -p functions/tsconfig.json`） |
| `pnpm format` | prettier 格式化 |
| `pnpm preview` | 预览构建产物 |

## 本地联调（后端 + 本地 D1）

```bash
npx wrangler d1 execute sudoku-db --local --file=schema.sql   # 本地库建表（幂等，可重复跑）
npx wrangler pages dev --port 8788                            # 终端 1：后端 + 静态资源
pnpm dev                                                      # 终端 2：前端（/api 代理到 8788）
