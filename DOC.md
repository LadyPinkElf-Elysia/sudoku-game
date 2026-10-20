# 数独 · 项目唯一文档（DOC.md）

> **这是本项目唯一的说明文档**（原标题 `README.md` / `ARCHITECTURE.md` / `CODE-GUIDE.md` / `PROJECT.md` / `REQUIREMENTS.md` 与 `docs/00~11` 已合并到这里）。
> 其余 md 只留一行"已合并"标记，可直接删除。
> 最近一轮重构（2026-10，共 15 轮）把"过度抽离"往回收了：**纯函数 = 复杂或通用；薄壳 = 就地写；组件只接线**。

---

## 目录

1. [概览与命令](#1-概览与命令)
2. [需求与验收](#2-需求与验收)
3. [架构约束（R1~R15 现行版）](#3-架构约束r1r15-现行版)
4. [分层与"这段逻辑该写在哪"](#4-分层与这段逻辑该写在哪)
5. [目录地图](#5-目录地图)
6. [数据流链路](#6-数据流链路)
7. [工程化：守卫 / 命令 / 报错](#7-工程化守卫--命令--报错)
8. [变更记录](#8-变更记录)
9. [待办与待删清单](#9-待办与待删清单)

---

## 1. 概览与命令

**是什么**：Vue 3 + TypeScript + Pinia + Vite 的数独（出题 / 求解 / 挑战 / 存档），后端是 Cloudflare Pages Functions + D1。

| 层 | 目录 | 一句话 |
|---|---|---|
| 数据 | `types/` `constants/` `stores/` `services/` | 有什么数据、存在哪、从哪来 |
| 纯函数 | `core/` | 怎么算（规则 / 生成 / 挖空 / 求解 / 解析 / 文案） |
| 编排 | `composables/` | 什么时候算、算完干什么（`ref` / `watch` / 生命周期 / router / 异步） |
| 渲染适配 | `render/` | 只做"怎么画到像素"的复杂纯绘制 |
| 展示 | `components/` `pages/` | 组件只画（props 进、事件出）；页面只接线 |
| 后端 | `functions/` | Cloudflare Functions + D1（复用 `core` 做校验） |

```bash
pnpm dev                  # 前端（vite，/api 代理到 8788）
pnpm guard                # 架构守卫（违规 exit 1；build 不含它，需单独跑）
pnpm typecheck            # vue-tsc 只查 src/
pnpm typecheck:functions  # tsc 查后端
pnpm build                # vue-tsc -b + typecheck:functions + vite build
pnpm format               # prettier

npx wrangler types                                  # 生成 worker-configuration.d.ts
npx wrangler d1 execute sudoku-db --local  --file=schema.sql
npx wrangler pages dev --port 8788                  # 后端 + 本地 D1
```

---

## 2. 需求与验收

| # | 功能 | 验收要点 |
|---|---|---|
| FR-1 | 注册 / 登录 / 退出 | 注册后弹「账号 ID」卡片（只显示一次）；刷新靠 token 恢复；401 → 清登录态 |
| FR-2 | 系统生成 | 选盘面大小 B（2~10）与挖空比例（40%~65%）→ 生成 → 进游戏页 |
| FR-3 | 游戏页 | 点格选格、数字键落子、冲突红底、判胜、「💡 提示」、「↺ 重开」、历史步骤条 |
| FR-4 | 题目求解 | 粘串或手填 → 本地校验（全空/太大/冲突）→ Worker 多解 → 逐解浏览 |
| FR-5 | 出题 | 两阶段（题面 → 答案）：提交题面即锁题；提交答案成对校验 + 比例校验 → 入库 |
| FR-6 | 自定义开局 | 题面 + 答案两串校验 →（可选）提交到我的题目 → 开局（**不校验比例**，只有入库才校验） |
| FR-7 | 我的题目 | 列表（时间/热度排序、进度条/滑动条浏览）、行内重命名/可见性/显示答案/删除 |
| FR-8 | 搜索 | 关键词/20 位 uid 分流；预览遮罩（题目 / 答案）；挑战直接开局并上报热度 |
| FR-9 | 落地页 `/p/:pid` | 只读预览 + 挑战（带标题 · 出题人信息行） |
| FR-10 | 编辑自己的题 | 预填题面（未锁定）→ 两阶段 → PATCH（`created_at` 不变） |
| FR-11 | 题目信息行 | 挑战/自有题显示「标题 · 出题人」；系统生成为「系统生成 S×S」 |
| FR-12 | 账号区 | 就地改显示名（2~16 位）、uid 遮蔽 → 👁 显示 / 📋 复制、退出 |
| FR-13 | 存档 / 继续游戏 | 游戏页「💾 存档」；主页「💾 继续游戏」→ **存档列表页**，每条「继续 / 删除」；读档回到盘面 + 历史步数 + 选中 |
| FR-14 | 题目导出 | 游戏页「📋 导出题目」只导**题面**（不含答案与玩家填数）；**只给系统生成的盘** |
| FR-15 | 答案按钮 | **只在挑战来源**（`origin === Challenge` 且有答案串）出现；系统生成 / 自定义不给 |

**关键业务决策（摘要）**

- **不要求唯一解**：判胜只看「填满 + 无冲突」（`isFull && !hasConflict`），不与答案比对；求解页允许多解。
- 挑战题的答案按 `show_solution` 下发，**缺失也能玩**。
- 自定义提交默认 `visibility = private`；出题/编辑入库必过 40%~65%。
- 时区/时间只在 `metaText.ts` 与存档列表里格式化一次。

---

## 3. 架构约束（R1~R15 现行版）

> 可执行版本：`scripts/check-arch.mjs`（`pnpm guard`）。**改规矩的顺序**：先改这里 → 再改守卫常量 → 再改代码。

| 规则 | 内容 | 级别 |
|---|---|---|
| **R1 顶层白名单** | `src/` 下只允许 `core services render stores composables components pages constants types styles router main.ts App.vue` | 🔴 |
| **R2 依赖只向下** | 见 §4.1 矩阵。**2026-10 放宽**：`pages/` 可用 `core` / `services`（就地写流程）；`components/` 可用 `core`。仍禁：`components/` 碰 store/router、`services/` 碰 store/router、任何层碰 `axios` | 🔴 |
| **R3 core 纯度** | 禁 `window/document/localStorage/navigator`、`new Worker`、`Math.random`、`Date.now`、`console`；随机由调用方注入 `rng` | 🔴 |
| **R4 数据层不写算法** | `stores/` 禁 `for (` / `.forEach(` / `Math.`、禁 `vue-router`；只做「取值 → 调 core → 写回」 | 🔴 |
| **R5 展示层不碰状态** | `components/` 禁 `@/stores` 与 `vue-router`；需要读 store 的"布局"放 `pages/` | 🔴 |
| **R6 页面只接线** | 声明 ≤ **50**（只数顶层）、行数 ≤ **400**、禁 `Math.`；**只被一个页面用的流程就地写**（2026-10 调整：页面 = 该页的控制器 + 视图接线） | 🔴 |
| **R7 组合式只编排** | 禁 `Math.`（算式下沉 core）；`router` / 异步在这里；一页一份的实例（棋盘）只调一次 | 🔴 |
| **R8 命名成套** | `constants/` 导出名 `UPPER_SNAKE`；`composables/**` 文件名 `use*`（纯函数模块登记 E8）；`xxxOf` / `is|has|can` / `get` / `make|create|generate` / `parse|xxxToStr` | 🔴（语义评审） |
| **R9 体量** | 单文件 ≤ **200** 行；**页面 ≤ 400**、**组合式 ≤ 300**；`core` 单文件导出 2~8；单函数模块 ≥50 行 | 🔴 |
| **R10 类型归位** | 共享类型（≥2 个非父子文件用）→ `types/`；组件 props/emits 就地写；`constants/` **不许导出类型**；一个形状只留一份接口（不用 `Omit/Pick` 造第二名字） | 🔴 |
| **R11 core 可测** | core 不碰宿主、不取随机与时间、**无模块级可变状态**（`rules.ts` 的缓存登记 E1）；不强制写测试 | 🔴（可测性） |
| **R12 禁桶文件** | 不写 `export * from`；不跨层再导出 | 🔴 |
| **R13 types 是叶子** | types 只能 import types / constants | 🔴 |
| **R14 棋盘自带缩放** | 缩放归 `components/BoardView.vue`（内部 `zoom` + 按钮 + `defineExpose({ zoomIn, zoomOut, resetZoom })`）；守卫只查该文件里有 `zoomInOf(`/`zoomOutOf(` | 🔴 |
| **R15 状态归位** | 位置放路由（子路由 / 路径参数）；影响请求的放 query；纯 UI 偏好放本地偏好（`services/prefs.ts`，键前缀 `sudoku.`）；弹层/流程阶段/游戏状态留内存 | 评审 |

**登记例外**：E1 `core/sudoku/rules.ts` 的 `getSudoku` 缓存（只影响性能，对入参可观察等价于纯函数）；E8 `composables/puzzle/metaText.ts`（纯函数模块，不是 composable）。

## 4. 分层与"这段逻辑该写在哪"

### 4.1 依赖矩阵（只允许向下）

| 目录 | 允许的 src 前缀 | 允许的外部包 |
|---|---|---|
| `src/constants/` | （无） | （无） |
| `src/types/` | `types/` `constants/` | （无） |
| `src/core/` | ＋`core/` | （无） |
| `src/services/` | ＋`services/` | （无） |
| `src/render/` | ＋`render/` | （无） |
| `src/stores/` | ＋`services/` `stores/` | `vue` `pinia` |
| `src/composables/` | ＋`render/` `stores/` `composables/` | `vue` `vue-router` |
| `src/components/` | `components/` `composables/` `constants/` `types/` `core/` | `vue`（**禁 `vue-router` / store**；允许 core 纯函数） |
| `src/pages/` | `pages/` `components/` `composables/` `stores/` `services/` `core/` `constants/` `types/` | `vue` `vue-router`（**Math. 仍禁** → R6） |
| `src/router/` | `router/` `stores/` `constants/` `types/` | `vue-router` |
| `src/`（`main.ts`/`App.vue`） | 组合根：允许一切 | 允许一切 |
| `functions/` | `functions/` `src/core/` `src/constants/` `src/types/` | （无） |

一句话：**core 不认识 vue；stores 不认识 router；types 谁都不认识；组件不认识 store。**

### 4.2 四条判断线（2026-10 反复收敛后的结论）

| 你想写的东西 | 放哪 | 判据 |
|---|---|---|
| **算法 / 换算** | `core/` | 复杂（生成、挖空、求解、回溯簿记、组表、脏格 diff）**或** ≥2 处跨层复用（`parse` / `rules` / `model` / `ops`）**或**含 `Math.`（只能治在 core） |
| **异步流程 + 状态** | `composables/` | 需要 `ref` / `watch` / 生命周期 / `router` / `await`；**一个组合式可以管一条完整链路**（如 `useSudokuEngine` = 生成 + 挖空 + 求解） |
| **纯展示** | `components/` | props 进、事件出；**不碰 store / router**；内部可以有"只有它自己用"的状态（如 `BoardView` 的缩放） |
| **页面** | `pages/` | 只接线：把 store / composable 的数据摆上模板；**只给一个页面用的流程就地写**，不再为它单开 composable |
| **真源 / 规则派生** | `stores/` | 全局唯一、要跨页活着的数据（一局游戏、一份列表、一个登录态）；派生一律 `computed` |

**薄壳不外提**：几行转调、只有一个使用者、贴着某个内部状态的东西 —— 就写在调用处（本轮已按此拆掉 `core/page.ts`、`core/game/derive.ts`、`render/geometry.ts`、`render/dirty.ts` 等）。

### 4.3 2026-10 的归位清单（15 轮，结论版）

| 轮次 | 做了什么 |
|---|---|
| ⑤ 减抽离 | **单页专用**的组合式全部就地写进页面：`useAuth`→LoginPage · `useAccountMenu`→AppLayout · `useAccountPanel`→MyPuzzlesPage · `useDifficultyFlow`→SystemPage · `useCreateFlow`→CreatePage · `useEditFlow`→EditPuzzlePage · `useCustomFlow`→CustomPage · `useGameFlow`→GamePage · `useSearchPuzzle`→SearchPage · `useMyPuzzles`→MyPuzzlesPage · `useSolveFlow`→SolvePage；`usePuzzleExport` 并入 `useGameFlow`。R6 放宽到 ≤30 声明 / ≤400 行（只数顶层） |
| ⑥ 降耦合 | `core/action.ts` 去掉 `submitSpecOf`（core 不再依赖按钮文案）；页面不再直连 `services`；抽出 `components/ExportOverlay.vue`、`components/AccountSection.vue` |
| ⑦ 棋盘状态 | `stores/game.ts` 加过 `zoom`/`setZoom`（后被 ⑭ 覆盖） |
| ⑧ 引擎组合式 | `composables/game/useSudokuEngine.ts`：**生成 + 挖空 + 求解**一条链路，对外 `loading/error/solutions/generate/solve/reset` |
| ⑨ render 正名 | `useBoardCanvas` → `useBoardRender`（对外只有 `onCanvasClick`） |
| ⑩ render 瘦身 | 几何 / `prepareCanvas` / `getClickPos` / 线层签名并入组合式；`render/` 只留 `paint.ts` · `layer.ts` · `board.ts` |
| ⑪ 内部函数化 | 帧快照 / 脏格 diff / 重绘决策并入 `useBoardRender`；组合式预算 300 行 |
| ⑫ 分页拆散 | `clampPage/sortOf/pagerModeOf` → `useListQuery`；`offsetOf` → `puzzleApi`；`pageCountOf` → `stores/puzzle`（`| 0` 整数写法） |
| ⑬ 派生拆散 | `statusOf` → store；`hintTextOf` → `GamePage`；`percentOf` → `core/sudoku/shape` |
| ⑭ 缩放归棋盘 | `useZoom`/`useBoardZoom` 删除；`BoardView` 内部持 `zoom` + 按钮 + `defineExpose`；R14 改写 |
| ⑮ 入参不外露 | 页面的 `boardParams`/`boardInput` 中间对象去掉，直接 `<BoardView :board :box-size :selected :conflict-mask>` |

---

## 5. 目录地图

```
src/
  constants/     actions(按钮条文案表 + ACTION_OF 拼装) · copy(其余全部文案) · board · game · pages · user · puzzle · solve
  types/         board · game(+GameSave) · sudoku · render(+BoardGeometry/CellFonts/FrameState/RedrawMode) · item · page · puzzle · user · worker
  core/
    message.ts           errorTextOf / blankRatioErrorOf / puzzleSubmitErrorOf（校验阶梯）
    array.ts             shuffle(rng) / 造二维 / 二维映射 / 切块
    board/               metrics(边长·字号·offsetToCell·pixelOf) · model(fromPuzzle/toNum/toRC) · ops(clone/lock/apply/count/given) · zoom(clamp/±/默认值)
    sudoku/              shape(S/B/格数/挖空/比例/percentOf) · parse(串↔盘) · rules(getSudoku 工厂) · groups(组表+三扫描) · tracker(MRV 簿记) · solver · multiSolver · generator · digger
  services/
    prefs.ts             localStorage 薄封装（write 返回 boolean）
    saveGame.ts          存档表：readSaves / addSave / removeSaveById / hasSaveData（JSON + 结构校验）
    sudoku/worker.ts     Worker 线程：generate / solve → 调 core
    sudoku/workerClient.ts  runInWorker（超时 / 出错 / 一次性）
    api/                 client(唯一 HTTP 出口·401 广播) · session · userApi · puzzleApi(offsetOf 就地)
  render/        paint.ts(paintCell/fontsOf/blitCellLines) · layer.ts(drawLinesOn/createLinesLayer) · board.ts(paintBoard/paintDirtyCells)
  composables/
    useListQuery.ts      URL(?q&sort&page) ↔ 本地条件 + 越界收敛 + 浏览偏好
    useClipboard.ts      复制（只关心成没成）
    game/useSudokuEngine.ts   生成 + 挖空 + 求解（对外 loading/error/solutions/generate/solve/reset）
    game/useGameSave.ts       存档：游戏页写入 / 列表页读回（saves/hasData/tip/save/resume/remove）
    game/usePuzzleStage.ts    出题/编辑共用的"题面 → 答案"两阶段状态机
    board/useBoardRender.ts   棋盘渲染（几何/适配/线层/帧快照/脏格/点击），对外只有 onCanvasClick
    puzzle/usePuzzlePreview.ts 预览遮罩（我的题目 + 搜索共用）
    puzzle/usePuzzleDetail.ts  详情取数 + 挑战（搜索 + 落地页共用）
    puzzle/metaText.ts    元信息行文案（E8：纯函数模块）
    game/useStartFromTexts.ts  「挑战」开局（解析两串 + 算比例 + 来源=Challenge）
  components/    BoardView(棋盘：画 + 缩放) · Overlay · TextAction · Flex · FormField · NumberPad · PagerBar(+Slider/Steps) ·
                 ListSection · MyPuzzleRow · PuzzleCard · SecretValue · RenameText · EyeGlyph · ExportOverlay · AccountSection
  pages/         AppLayout · HomePage · DifficultyPage(+difficulty/SystemPage,CustomPage) · GamePage · ResumePage ·
                 CreatePage · EditPuzzlePage · SolvePage · SearchPage · MyPuzzlesPage · PuzzleViewPage · LoginPage
  router/        路由表 + 登录守卫 + router.onError（导航失败会打印）
functions/       api/{register,login,logout,me, puzzles/...} · utils/{id,auth,json,user,puzzle} · _middleware.ts
```

## 6. 数据流链路

```
① 系统生成一局
   SystemPage.apply → useSudokuEngine.generate(cfg)
      ├─ blankCountOf(B, ratio)                       〔core/sudoku/shape〕
      ├─ generateInWorker → Worker: generatePuzzle → digPuzzle（挖空）
      └─ 返回 { puzzle, solution }
   → gameStore.startGame(puzzle, solution, cfg, System) → /game
   → BoardView → useBoardRender.draw（几何/线层/整盘）→ canvas

② 落子（最核心）
   点格 → BoardView.onCanvasClick → emit cell-click → gameStore.select
   数字键 → gameStore.inputNum（守卫：状态 / 已选中 / lock / 同值）
   → board 变 → computed 重算（numBoard / conflictMask / isWin / status）
   → BoardView 的 props 变 → useBoardRender 的 watchEffect 命中
   → 脏格 diff：少就局量重绘（paintDirtyCells + 贴回线层），多就整盘（paintBoard）

③ 提示：💡 提示 → getCandidates(selected) → GamePage 内部 hintTextOf → tip 行

④ 存档 / 继续游戏
   游戏页「💾 存档」→ useGameSave.save()（真源：config/origin/meta/solution/snapshots/currentStep/selected）
      → services/saveGame.addSave（JSON + 结构校验 + 上限）→ localStorage['sudoku.gameSaves']
   主页「💾 继续游戏」→ /resume → ResumePage 列出 saves（每条：继续 / 删除）
      继续 → useGameSave.resume(id) → gameStore.restoreGame → /game（盘面 + 历史步数 + 选中都回来）

⑤ 求解
   SolvePage.solve → 本地校验（全空 / B>6 / 有冲突）→ useSudokuEngine.solve(numBoard, 上限)
      → Worker: solvePuzzleMulti → solutions
   → 只读棋盘 solutionInput + 步骤条逐解浏览（解只在页面本地，不进 store）

⑥ 挑战
   SearchPage / PuzzleViewPage / MyPuzzlesPage → usePuzzleDetail.challenge
      → useStartFromTexts(puzzleText, solutionText, blankCount, source?)
      → startGame(…, Challenge) →（登录）上报热度 → /game
   游戏页据此：给「📖 答案」（有答案串时）、不给「📋 导出题目」、显示「标题 · 出题人」

⑦ 出题 / 编辑
   CreatePage / EditPuzzlePage → usePuzzleStage（题型→答案两阶段：校验 / 锁题 / 成对校验）
      → create / update(api) → /my-puzzles

⑧ 列表（搜索 / 我的题目）
   条件在 URL（?q&sort&page）→ useListQuery 的 watch（immediate）→ store.loadPage
   → ListSection 三态 + PagerBar；改完行内内容 → dropDetail + retry 重拉当前页
```

---

## 7. 工程化：守卫 / 命令 / 报错

| 命令 | 作用 |
|---|---|
| `pnpm guard` | `scripts/check-arch.mjs`：R1~R14 机器可查项（违规 exit 1）。**build 不含它** |
| `pnpm typecheck` | `vue-tsc --noEmit -p tsconfig.app.json`（只查 `src/`） |
| `pnpm typecheck:functions` | `tsc -p functions/tsconfig.json`（后端） |
| `pnpm build` | `vue-tsc -b` + `typecheck:functions` + `vite build` |

**守卫机器查什么**：顶层目录白名单（R1）· 依赖矩阵与外部包（R2）· core 纯度（R3）· store 里 `for/forEach/Math.`（R4）· 组件碰 store/router（R5）· 页面声明数与 `Math.`（R6）· 组合式 `Math.`（R7）· constants 命名 / composables 文件名（R8）· 行数与导出数（R9：普通 200 / 页面 400 / 组合式 300）· constants 不许导出类型（R10）· core 模块级可变状态（R11）· 桶文件（R12）· types 越层（R13）· 棋盘自带缩放（R14）。

**常见报错 → 先看哪里**

| 现象 | 原因 | 处理 |
|---|---|---|
| 点按钮没反应 / 路由不跳 | 目标页**懒加载失败**（编译错误 / 残留 import） | 控制台 `[router] 导航失败` 或 `Failed to fetch dynamically imported module`；跑 `pnpm typecheck` |
| `does not provide an export named 'X'` | 某个文件还在从旧位置 import（文案搬去了 `constants/copy.ts`） | 按报错文件改 import |
| 白屏 + `Cannot find module '@/composables/...'` | 引用了已删除的组合式 | 删掉该 import（逻辑已进页面） |
| 守卫红：`行数 > 200/300/400` | 🔴 | 拆文件或按判断线内联 |
| 守卫红：`constants 导出名` | 小写/驼峰导出 | 改 `UPPER_SNAKE` |
| 画布空白 | 容器宽为 0 / 盘面为空 / 拿不到 2d 上下文 | 看 `geometryOf` 与 `prepareCanvas` 的早退分支 |

---

## 8. 变更记录

- **v1.9.14**：`PROJECT.md` 全景导读（本轮已并入本文档）。
- **v1.9.15**：`CODE-GUIDE.md` 分层导读（已并入 §4）。
- **v1.9.16**：三处归位 + 性能重排 —— `render/` 拆五文件去模块级状态 · 类型归位（`types/render.ts` / `types/sudoku.ts`）· `core/sudoku/groups.ts`（组表 + 三扫描）· store 只留真源（`startCreate/startSolve` 删除、`startFromTexts` 外移、`cheat`→`fillSolution`）。
- **v1.9.17**：按钮条文案表（`constants/actions.ts`）+ 其他文案一处（`constants/copy.ts`）+ 存档（`GameSave` / `services/saveGame` / `restoreGame` / `useGameSave`）+ 答案按钮改挑战专属 + `writePref` 返回 boolean。
- **2026-10（十五轮收敛）**：见 §4.3 —— 方向从"多抽一层"转为"**只抽复杂或通用的**"，页面/组件/组合式的边界都按判断线重画。
- **2026-10（构建修复）**：`core/action.ts` 删除后，11 处 `@/core/action` 的 import 合并进 `@/constants/actions`（`ACTION_OF as actionOf`）；`services/api/session.ts` 的 `setToken` / `setLastUid` 改为语句体（`writePref` 返回 boolean，签名仍是 void）。

---

## 9. 待办与待删清单

**可删的空壳文件**（内容都已并入别处）：当前只剩这两个 ——

```
src/composables/board/useZoom.ts   ← 缩放进 BoardView
src/core/page.ts                   ← 分页薄壳拆到各自使用者
```

（`src/core/action.ts` 已删除：调用方统一改为 `import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'`，拼装函数与按钮表同处一文件。）

（其余空壳你已删除，已核对：`useAuth` / `useAccountMenu` / `useAccountPanel` / `useCreateFlow` / `useEditFlow` /
`useCustomFlow` / `useGameFlow` / `useDifficultyFlow` / `useGeneratePuzzle` / `useSearchPuzzle` / `useMyPuzzles` /
`useSolveFlow` / `useSolvePuzzle` / `usePuzzleExport` / `useBoardCanvas` / `render/geometry` / `render/dirty` /
`core/game/derive` 都已不在 `src/` 里，且活文件无残留 import。）

**已合并的文档**（本文档取代，可删）：根 `README.md`、`ARCHITECTURE.md`、`CODE-GUIDE.md`、`PROJECT.md`、`REQUIREMENTS.md`、`docs/`（README + 00~11）。

**可选待办**：

1. `core/sudoku/solver.ts` 的单解入口是否并入 `multiSolver`（现仅为"回溯引擎出口"，留着便于单测）。
2. 冲突增量（`dupVal[(组, 值)]`）：B=10 实测 0.4ms → 0.008ms，但要给 6 条改盘路径埋点，暂不做。
3. `docs/07`（组件与页面逐文件）里的页面数已随 `ResumePage` 变化，本文档 §5 是最新事实。


