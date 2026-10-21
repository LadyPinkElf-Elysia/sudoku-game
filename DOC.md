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
| `src/components/` | `components/` `composables/` `constants/` `types/` `core/` | `vue` `element-plus` `@element-plus/icons-vue`（**禁 `vue-router` / store**；允许 core 纯函数） |
| `src/pages/` | `pages/` `components/` `composables/` `stores/` `services/` `core/` `constants/` `types/` | `vue` `vue-router` `element-plus` `@element-plus/icons-vue`（**Math. 仍禁** → R6） |
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
  components/    ActionBar(Actions → 一排图标+文字按钮，图标按 key 取 EP) · BoardView(棋盘：画 + 缩放) · Overlay(→el-dialog) · Flex ·
                 FormField(→el-input/select/slider) · NumberPad(→el-button) · ListSection(→el-pagination/skeleton/result/empty) ·
                 PagerStepsView · MyPuzzleRow · PuzzleCard · SecretValue · RenameText(→el-input) · ExportOverlay(→el-dialog) · AccountSection ·
                 TipLine(一次性提示：3 秒后淡出)
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
| 控制台 `Failed to resolve component: el-xxx` | 没开按需自动引入（本项目是**显式 import**） | 在对应 SFC 顶部 `import { ElXxx } from 'element-plus'` |
| 遮罩不居中 / 头部多一条空白 | `el-dialog` 的 body/footer 样式写在了 scoped 里（Teleport 追不进去） | 写进 `styles/overlay.css` 的 `.el-dialog.overlay ...` |

---

## 8. 变更记录

- **v1.9.14**：`PROJECT.md` 全景导读（本轮已并入本文档）。
- **v1.9.15**：`CODE-GUIDE.md` 分层导读（已并入 §4）。
- **v1.9.16**：三处归位 + 性能重排 —— `render/` 拆五文件去模块级状态 · 类型归位（`types/render.ts` / `types/sudoku.ts`）· `core/sudoku/groups.ts`（组表 + 三扫描）· store 只留真源（`startCreate/startSolve` 删除、`startFromTexts` 外移、`cheat`→`fillSolution`）。
- **v1.9.17**：按钮条文案表（`constants/actions.ts`）+ 其他文案一处（`constants/copy.ts`）+ 存档（`GameSave` / `services/saveGame` / `restoreGame` / `useGameSave`）+ 答案按钮改挑战专属 + `writePref` 返回 boolean。
- **2026-10（十五轮收敛）**：见 §4.3 —— 方向从"多抽一层"转为"**只抽复杂或通用的**"，页面/组件/组合式的边界都按判断线重画。
- **2026-10（构建修复）**：`core/action.ts` 删除后，11 处 `@/core/action` 的 import 合并进 `@/constants/actions`（`ACTION_OF as actionOf`）；`services/api/session.ts` 的 `setToken` / `setLastUid` 改为语句体（`writePref` 返回 boolean，签名仍是 void）。
- **2026-10（UI 库提案）**：见 §10 —— Element Plus 的组件映射、守卫/矩阵差异、风险与回滚。
- **2026-10（UI 库落地）**：`element-plus@2.14.7` 已接入。`MATRIX` / §4.1 放行 `element-plus`；`main.ts` 全量引 css + `app.use(ElLoading)`；主题变量进 `styles/form.css`。**自研组件外壳全部保留（页面零改动），内部换成 EP**：`FormField`（el-input/el-select/el-slider）· `Overlay`（el-dialog + v-loading）· `TextAction`（el-button link）· `PagerBar`（el-pagination）· `ListSection`（el-skeleton/el-result/el-empty）· `NumberPad`（el-button circle）· `SecretValue`（el-button）· `RenameText`/`ExportOverlay`（el-input）· `CustomPage`（el-checkbox）。同时删掉 `FormField` 的密码 👁、滑块、`SystemPage` 的 `.range`、`SearchPage` 的 `.search-btn`、`MyPuzzlesPage` 的 `.go-create` 等手写样式。**两个纯壳已拆掉**：`TextAction` → `<el-button class="text-action" link>`（类在 `styles/form.css`）、`PagerBar` → `el-pagination`（ListSection）/ `PagerStepsView`（GamePage、SolvePage）。
- **2026-10（EP 收尾）**：① 所有 `actions` 按钮补 `:disabled="!a.onClick"` —— `actionOf(x, undefined)` 原本渲染成"纯文本"，换 EP 后必须显式禁用；② 清掉 `.text-action` 的 `margin`（EP 的 `.el-button + .el-button` 有 12px 左边距，会和 Flex 的 `gap` 叠加）；③ `PagerSliderView` 的原生 `<input type=range>` → `el-slider`；④ 删除无人引用的全局 CSS：`.input` / `.select(.is-sm)` / `.btn-primary` / `.text-btn` / `.retry` / `.label`（约 -90 行）。
- **2026-10（P1–P5 落地，见 §11）**：新增 `components/ActionBar.vue` 并替换 **14 处**"一排文字按钮"；**8 处纯加载遮罩 → 页面根节点的 `v-loading`**（`Overlay.spinning` 随之删除，`Overlay` 只剩文案/插槽/按钮条）；删除二次确认 → `ElMessageBox.confirm`（`MyPuzzlesPage` 少了 `removeOpen` + `removeActions`）；`PuzzleViewPage` / `ResumePage` 的三态 → `el-skeleton` / `el-result` / `el-empty`；`dateTimeTextOf` 合并（`metaText` 导出，`ResumePage` 复用）、`EyeGlyph` 内联进 `SecretValue`、`PagerSliderView` 内联进 `ListSection`。
- **2026-10（数据结构归位，见 §12）**：`ListBar` 从 6 个扁平字段改成 `{ mode: filter, sort: filter }` 并由 `useListQuery` 的 `bar` 产出（`ListPager` 同理出 `pager`），两个列表页不再各拼一份、文案统一到 `LIST_COPY`；`Action` 增加显式 `disabled`（`ACTION_OF` 在没给点击函数时置 true）；`Menu.routeName` → `to: { name: Page }`。
- **2026-10（图标换 EP）**：引入 `@element-plus/icons-vue`（守卫 §4.1 已放行）。**文案表里不再写 emoji**：`ACTION` 全部改成纯文字；图标按 `Action.key` 由 `components/ActionBar.vue` 的 `ICON_OF` 统一映射（新增动作只补一行）。`HomePage` 菜单图标按 `key` 取 `MENU_ICON`（`Menu` 类型去掉 `icon` 字段）；`SecretValue` 的 👁/📋 → `View`/`Hide`/`CopyDocument`/`Select`；`NumberPad` 的清格键 → `Close`；顶栏账号位与账号区名字 → `User`（`RenameText` 的 `icon` 从字符串改成组件）；可见性文案去掉 🌐🔗🔒；`SolvePage` / `GamePage` / `GAME_COPY.win` / `MINE_COPY.goCreate` 里的 emoji 一并清掉。**当前映射（按反馈迭代后）**：提示 `Opportunity` · 存档 `FolderAdd` · 导出题目 `Share` · 作弊 `Key` · 填入棋盘 `Bottom` · 求解 `Grid` · 首页「继续游戏」`FolderOpened`。
- **2026-10（加载态与细节）**：顶栏 `.nav-item` 补 `:hover` 与 `router-link-active` 高亮；继续游戏的存档条 `Flex` 补 `align="stretch"`（撑满一行）。
- **2026-10（存档可命名）**：点「存档」先弹 `ElMessageBox.prompt` 让玩家自己起名（默认值 = 上次的名字 → 题目名 → 来源名，最长 `SAVE_NAME_MAX = 20`），名字存进 `GameSave.name`（**可选字段**：旧存档没有它，读回时回退到题目名 / 来源名）；继续游戏列表优先显示这个名字，覆盖同一局时弹框会预填上次的名字；**列表里每行还有「重命名」**（同一个弹框，预填当前显示的名字，空名字 / 超长就地提示）。
- **2026-10（行内文字对齐）**：`RenameText` 的「重命名」与 `AccountSection` 的「退出」补 `class="text-action"`（之前虽是 `el-button link`，但没走全局文字按钮类，带着 EP 默认的 32px 高度与 padding，把名字 / 标题 / 按钮顶得一高一低）；`.rename` 改为**基线对齐**、图标单独 `align-self: center`。同时给「重命名」加了 `EditPen` 图标（与继续游戏存档条的重命名一致；账号区与列表标题两处同时生效）；账号区的「退出」改走 `ActionBar`（自动带 `SwitchButton` 图标、与其它按钮条同一套颜色 / 禁用规则），并删掉手写的 `.logout` 样式；顶栏「主页」补 `House` 图标（与右侧账号位的 `User` 一致）。
- **2026-10（提示自动淡出）**：新增 `composables/useTip.ts`（非空时 3 秒后清空；**同一句再触发会重新计时**）+ `components/TipLine.vue`（`<Transition>` 淡出 0.3s）。游戏页 / 首页 / 继续游戏的 `.tip` 全部换成 `useTip` + `TipLine`；`useGameSave` 内部提示也走 `useTip`（存档 / 改名 / 删除的成功提示不再常驻）。`CreatePage` 的 `.tip` 仍是**校验错误**说明（不是一次性提示），保持常驻直到下次提交。
- **2026-10（耗时动作统一遮罩）**：新增 `LOADING_COPY`（`puzzle: 正在加载题目…` / `game: 正在打开题目…`）。**所有耗时动作都给全屏遮罩 + 锁滚动**：搜索页「挑战」（取详情 → 开局 → 跳页）、落地页「挑战」（上报热度 + 跳页）、我的题目「挑战 / 编辑」（要取详情）、继续游戏「继续」（恢复 + 首访路由分块）、预览取数；`MyPuzzlesPage` 的 PATCH / DELETE 也并入同一个全屏遮罩（原来只遮列表）。删除 `SEARCH_COPY.loading` / `MINE_COPY.loading`（合并进 `LOADING_COPY`）。

---

## 9. 待办与待删清单

**可删的文件**（都已无任何引用）—— 只剩这 4 个组件，跑一条命令即可：

```
src/components/TextAction.vue      ← 已全部改成 <el-button class="text-action" link>（全局类在 styles/form.css）
src/components/PagerBar.vue        ← 默认模式 → el-pagination（在 ListSection 里），步骤条 → PagerStepsView（GamePage/SolvePage 直用）
src/components/EyeGlyph.vue        ← 已内联进 SecretValue（唯一使用者）
src/components/PagerSliderView.vue ← 已内联进 ListSection（mode=slider 的那一个分支）
```

```powershell
cd c:\Users\lenovo\Desktop\学习资料\vue3\sudoku
Get-ChildItem -Recurse src -Include *.vue,*.ts | Select-String -Pattern 'TextAction|PagerBar|EyeGlyph|PagerSliderView'   # 预期 0 条
Remove-Item src\components\TextAction.vue, src\components\PagerBar.vue, src\components\EyeGlyph.vue, src\components\PagerSliderView.vue
```

（`src/composables/board/useZoom.ts`、`src/core/page.ts` 你已删除，已核对确实不存在。）

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

---

## 10. UI 库（Element Plus）—— **已接入**

> 现状：`element-plus@2.14.7` 在 dependencies 里；`MATRIX` 的 `pkg` 已放行（`src/components` / `src/pages`）。`main.ts` 第一行引 `element-plus/dist/index.css`，并 `app.use(ElLoading)` 注册 `v-loading`。

### 10.1 落地方式（结论）

| 决策 | 内容 |
|---|---|
| 路线 | **适配层**：自研组件的 props/事件签名一个不改，内部换成 EP → 页面零改动、每个组件可单独回滚 |
| 否决路线 | 页面直连 `el-form`/`el-table`：会推翻 `styles/form.css|card.css|overlay.css` 的视觉基调 |
| 已完成 | `FormField`(el-input/el-select/el-slider) · `Overlay`(el-dialog + v-loading) · `TextAction`(el-button link) · `PagerBar`(el-pagination) · `ListSection`(el-skeleton/el-result/el-empty) · `NumberPad`(el-button circle) · `SecretValue`(el-button) · `RenameText`/`ExportOverlay`(el-input) · `CustomPage`(el-checkbox) |
| 有意保留 | `Flex`（EP 无"gap + 对齐"等价物，`el-space` 会包一层 DOM、破坏 `flex: 1`）· `BoardView`（canvas 自绘 + R14）· `PagerStepsView`（可点回退的历史步进，`el-steps` 不可点） |
| 样式对齐 | 主题变量进 `styles/form.css` 的 `:root`（`--el-color-primary: #6366f1` 等）；输入框与主按钮统一 36px，`size="small"` 保持紧凑 |

`main.ts` 引入顺序：`import 'element-plus/dist/index.css'` 必须放在 **`@/styles/*.css` 之前**（否则 `.el-input__wrapper` 会盖掉全局 `.input` 规格）。主题对齐只需覆盖 CSS 变量：`--el-color-primary: #6366f1`（+ `light-3/5/7/8/9`、`dark-2`），否则 EP 的 `#409eff` 与现有主色是两套配色。

### 10.2 守卫与矩阵的差异（与代码同批提交）

`scripts/check-arch.mjs` 第 63–64 行，**只动 `pkg`，`src` 前缀一律不动**：

```diff
-    'src/components':  { src: [...], pkg: ['vue'] },
-    'src/pages':       { src: [...], pkg: ['vue', 'vue-router'] },
+    'src/components':  { src: [...], pkg: ['vue', 'element-plus'] },
+    'src/pages':       { src: [...], pkg: ['vue', 'vue-router', 'element-plus'] },
```

`§4.1` 第 117–118 行两行同步（`pkg` 列加 `element-plus`）；§5 目录地图**不新增目录**（不加 `components/el/`）；§8 变更记录补一条。原则：`MATRIX` 与 §4.1 必须同一 commit —— 脚本头明写"先改 DOC 再改 MATRIX"，分两次提交会让人误判为漏改。

按需引入（可选）：`vite.config.ts` 加 `Components({ resolvers: [ElementPlusResolver()] })`；但 `v-loading` / `ElMessage` 这类指令与函数仍需显式 import（`ElLoading`、`ElMessage`）。

### 10.3 组件映射（适配层内部替换，页面不动）

| 组件 | 换？ | 换成 | 要点 |
|---|---|---|---|
| `components/FormField.vue` | **是**（收益最高） | text → `el-input`；password → `el-input show-password`（**删 `EyeGlyph` 与 `.eye` 样式、删本地 `visible`**）；textarea → `el-input type="textarea" :rows="4"`；select → `el-select`+`el-option`（**删 `onValue()`，`:value="opt.value"` 天然保 number**）；range → `el-slider`（**删 30 行 `::-webkit-slider-thumb`**）；`compact` → `size="small"` | 密码 👁 与滑块样式是本文件最大的两坨手写 CSS |
| `components/ListSection.vue` | **是（已做）** | 三态 → `el-skeleton` / `el-result`（带重试）/ `el-empty`（`#empty` 插槽名保留）；分页 → `el-pagination` / `PagerStepsView` / `el-slider` | `<ul class="list">` **保留**：`PuzzleCard` 是卡片网格，换 `el-table` 会破坏布局 |
| `components/ExportOverlay.vue` | 是 | `el-dialog` + `el-input type="textarea" readonly` | 纯弹窗 + 只读文本，正是 EP 强项 |
| `components/SecretValue.vue` / `RenameText.vue` | 是 | `el-input readonly` + `el-tooltip`；`RenameText` → `el-input` + 错误行 | 账号区是"复制 + 改名"，`el-input` 的 `append` 插槽能省掉按钮拼装 |
| `components/PagerSliderView.vue` | **已内联** | `ListSection` 里一个 `el-slider` 分支 | 唯一使用者就是 `ListSection`；文件可删（见 §9） |
| `components/AccountSection.vue` | 部分 | 内部随上面两个变化，对外 9 个 props 不变 | — |
| `components/TextAction.vue` | **已移除** | 页面/组件直接 `<el-button class="text-action" link>` | `.text-action` 是全局类（`styles/form.css`），只用 `--el-button-text-color: inherit` 保住"不变蓝" |
| `components/Overlay.vue` | **是（已做）** | `el-dialog` + `#footer` 的 `ActionBar` | `wide`→`width`；**加载态交给页面的 `v-loading`**（`spinning` 已删）；关闭路径全部禁用 |
| `components/NumberPad.vue` | **是（已做）** | `el-button circle`（`--el-button-size: 32px`） | 删掉自绘圆钮/边框/hover；网格里清掉 `el-button + el-button` 的 12px 左边距 |
| `components/PagerBar.vue` | **已移除** | `el-pagination`（ListSection）/ `PagerStepsView`（GamePage、SolvePage） | `go()` 的越界判断搬进 ListSection；步骤条本来就是独立组件，没必要再套一层 |
| `components/BoardView.vue` / `Flex.vue` | 否 | — | canvas 自绘 + 缩放（R14）；`Flex` 40 行比 24 栅格更贴布局 |
| `components/PuzzleCard.vue` / `MyPuzzleRow.vue` | 否 | — | 信息密度是自定义的，`el-card` 只加壳 |
| `components/EyeGlyph.vue` | **已内联** | — | 已并入 `SecretValue`；文件可删（见 §9） |

**`Overlay` → `el-dialog` 的映射**：`show` → `:model-value`；`wide` → `width="720px"`（否则 320px）；`text`/`desc` 仍是全局类 `.overlay-title`/`.overlay-desc`；`actions` → `#footer` 的 `ActionBar`；关闭路径全部禁用（`show-close` / `close-on-click-modal` / `close-on-press-escape`），因为关不关由调用方数据决定。原 `shade` prop 无人使用（12 个调用点都没传）→ 已删除；`spinning` 也被移除 —— **加载态统一由页面的 `v-loading` 承担**（8 处）。

### 10.4 调用点清单（已按此改完）

> 现状：下面这些位置**全部已改**；另外多改了三处（原先没列出来的裸控件）：`RenameText` 的原生 `input`/`button` → `el-input`/`el-button`、`ExportOverlay` 的原生 `textarea` → `el-input type="textarea"`、`CustomPage` 的原生 `checkbox` → `el-checkbox`，以及删掉 `SystemPage` 里 30 行手写 `.range` 样式。

| 文件 | 行 | 现状 | 动作 |
|---|---|---|---|
| `pages/LoginPage.vue` | 116–125 | 4 个 `FormField`（含 2 个 password） | 零改动 |
| | 129 / 132 | 手写 `button.btn-primary` / `button.text-btn` | `el-button type="primary" native-type="submit"` / `el-button link` |
| | 136 | `<Overlay :show="loading" spinning :text>` | → `v-loading`（纯加载，无插槽无按钮） |
| | 139–141 | `Overlay` + uid 卡片插槽 + `actions` | **保留** |
| `pages/CreatePage.vue` | 124–127 | **手写** `.field/.label/.input`（`v-model="title"`） | 改回 `<FormField v-model="title" vertical label="标题" :maxlength="TITLE_MAX">` |
| | 129–130 | `FormField type="select"` | 零改动；`(v) => (boxSize = v as number)` 断言可删 |
| | 142 / 145 / 147 | 加载遮罩 / 成功遮罩 / 失败遮罩 | 仅 142（纯加载）→ `v-loading`；另两个带 `actions` 保留 |
| `pages/SearchPage.vue` | 90–93 | **手写**搜索表单（`input.input` + `button.btn-primary`） | `el-input` + `el-button`；顺带删 133–149 行已是死代码的 `.search-btn` |
| | 110–114 | `Overlay` + 棋盘插槽；`Overlay spinning` | 前者保留；后者（114）→ `v-loading` |
| `pages/MyPuzzlesPage.vue` | 224–234 | `ListSection` + `#empty` 手写 `.go-create` | 按钮 → `el-button link` |
| | 242–243 | 删除二次确认 `Overlay` + `actions` | 唯一适合 `ElMessageBox.confirm` 的场景（文案仍走 `constants/copy`） |
| | 246 | `Overlay spinning` | → `v-loading` |
| `components/ListSection.vue` | 37–42 | 两个 `FormField type="select" compact` | 零改动（`compact` 在 FormField 内映射 `size`） |
| | 47–56 | `<p class="state">` + 手写 `.retry` | 三态换 EP |

其余页面（`GamePage` / `ResumePage` / `SolvePage` / `PuzzleViewPage` / `difficulty/*`）按同一模式处理，用下面的命令补全清单：

```powershell
cd c:\Users\lenovo\Desktop\学习资料\vue3\sudoku
Get-ChildItem -Recurse src -Include *.vue | Select-String -Pattern '<Overlay' | Select-Object Path,LineNumber,Line
Get-ChildItem -Recurse src -Include *.vue | Select-String -Pattern 'class="input"|class="btn-primary"|class="text-btn"|class="tip"'
Get-ChildItem -Recurse src -Include *.vue | Select-String -Pattern 'spinning' | Select-Object Path,LineNumber
```

### 10.5 风险（按严重度）

| 风险 | 应对 |
|---|---|
| **`v-loading` 只覆盖定位父容器**（现在 `Overlay` 是 `position: fixed; inset: 0` 全屏） | 阶段 3 的前置决策：要全屏就挂 `#app`/`body`，否则保留 `Overlay` |
| **`ElMessage` 被遮罩盖住**（Overlay 9999 vs EP 2000+） | 消息只在无遮罩场景用，或把 Overlay 的 z-index 收敛成变量 |
| **裸 `.input` 与 `el-input` 同页并存** | 阶段 2 一次收编干净，否则同页两种输入框 |
| `@paste` 冒泡（`LoginPage` 120–121 的 uid 去空白） | 换后手测；失效则透传 `onPaste`（`onUidPaste` 只读 `clipboardData`，不读 `target`，理论上仍成立） |
| `el-select` 值类型 | `:value="opt.value"` 保 number；`CreatePage` 的 `as number` 断言同时删 |
| `erasableSyntaxOnly: true`（`tsconfig.app.json` 第 14 行） | 若 EP 的 `.d.ts` 用了 `enum`/参数属性，`vue-tsc` 可能报 TS1294；`@vue/tsconfig` 默认 `skipLibCheck`，大概率无事 —— **本方案唯一未知项**，装完先 `pnpm typecheck` |
| 体积 | 全量约 +330KB gzip → 走 §10.2 按需引入 |
| R9 / R5 | 换完 `FormField`、`ListSection` 都变短，不触线；EP 不是 store/router，不影响 R5（但**禁止**在 `components/` 里用 `ElMessageBox` + `router`） |

### 10.6 回滚与验收

- 分阶段提交：`chore(arch): allow element-plus`（MATRIX + §4.1 + package.json + main.ts）→ `refactor(ui): FormField` → `refactor(ui): 页面裸标记` → `refactor(ui): 三态`。
- **适配层天生可回滚**：页面没改过，`git revert refactor(ui): FormField` 即退回原生实现，其它阶段不受牵连。
- 紧急开关：注掉 `main.ts` 里 EP 的 css → 组件退化为无样式裸元素，不白屏，可线上止血。
- 每阶段跑：`pnpm guard` · `pnpm typecheck` · `pnpm build`，再按 stage 手测（粘贴去空白 / 密码显隐 / **切换盘面大小后棋盘重建** / 下拉值类型 / 回车提交 / 三态与重试 / 遮罩期间点不到底层）。

### 10.7 排期建议

| 阶段 | 内容 | 预估 |
|---|---|---|
| 0 | 装包 + MATRIX/§4.1 + main.ts + 主题变量 | 0.5h |
| 1 | `FormField` 适配（含删 `EyeGlyph`） | 2h |
| 2 | 收编页面裸 `.input`/`.btn-primary`/`.text-btn` | 1.5h |
| 3 | 三态 + `v-loading` + `ElMessage`/`ElMessageBox` | 1.5h |
| 4 | `ExportOverlay`/`SecretValue`/`PagerSliderView`/`AccountSection` | 3h |

**只做 0+1+2（约 4h）就能拿到 80% 收益**：消掉 `FormField` 里 80 行手写 CSS 与页面 4 处裸标记，且完全不碰 `Overlay`/`BoardView` 这些"一改就露馅"的地方。

---

## 11. 组件与页面复盘：该抽的 / 该直接用 EP 的 / 不该抽的

### 11.1 判定标准（三条，按顺序问）

1. **EP 有没有等价物？** 有 → 直接用 EP，不自己写（`el-pagination`、`el-dialog`、`el-skeleton`、`ElMessageBox`、`v-loading`…）。
2. **同一段结构出现在 ≥3 处、且只差参数？** 是 → 抽组件；**只出现在 1 处** → 就地写（DOC §4.2「薄壳不外提」）。
3. **抽出来会不会带进不该有的依赖？** 会 → 不抽（如 `components/` 不能碰 `vue-router`，见 R5）。

### 11.2 该抽的：1 个组件 + 3 处合并

#### ① `ActionBar.vue`（**唯一值得抽的组件**）

现状：同一段 3 行模板出现在 **14 处（12 个文件）**，除了 `gap` / `justify` / 有没有默认插槽之外完全一致：

| 文件 | 行 | 形态 |
|---|---|---|
| `CreatePage` | 129–131 | gap 12 / center / wrap |
| `EditPuzzlePage` | 100–102 | 同上 |
| `GamePage` | 128–130 | 同上（变量名叫 `items`） |
| `SolvePage` | 202–204 | 同上 |
| `difficulty/SystemPage` | 61–63 | 同上 |
| `difficulty/CustomPage` | 152–154 | 同上 |
| `PuzzleViewPage` | 41–43 | gap 14 / center / wrap |
| `ResumePage` | 52–54 | gap 14（每行存档条） |
| `PuzzleCard` | 43–45 | gap 6 / center |
| `MyPuzzleRow` | 69–71 · 89–95 | gap 6（角标 / 预览+挑战） |
| `BoardView` | 44–47 | gap 8（缩放 ➖/➕） |
| `Overlay` | 42–47 | gap 14（footer） |
| `HomePage` | 48–54 | **例外**：渲染的是 `Menus`（图标 + 文案 + 路由提示），不是 `Actions` → 保持手写 |

```vue
<!-- src/components/ActionBar.vue：只做「Actions 数组 → 一排文字按钮」，样式全在全局 .text-action -->
<script setup lang="ts">
import { ElButton } from 'element-plus'
import Flex from './Flex.vue'
import type { Actions } from '@/types/item'

withDefaults(defineProps<{
    actions: Actions
    gap?: number
    justify?: 'start' | 'center' | 'end' | 'between'
    wrap?: boolean
}>(), { gap: 12, justify: 'center', wrap: false })
</script>

<template>
    <Flex :gap="gap" :justify="justify" :wrap="wrap">
        <!-- onClick 为空 → 禁用（保持"纯文本"观感，见 styles/form.css 的 .is-disabled 规则） -->
        <el-button v-for="a in actions" :key="a.key" class="text-action" link :disabled="!a.onClick"
            @click="a.onClick">{{ a.text }}</el-button>
    </Flex>
</template>
```

收益：`disabled` 规则、`text-action` 类、`Flex` 参数只写一次；12 个调用点各减 2~4 行；以后加"按钮前图标"之类只改一处。
`Overlay` 的 footer 也可以换成它（它是 `Flex` + 3 行按钮，正好同构）。

#### ② 时间格式化：`metaText.ts` 里已有实现，`ResumePage` 又抄了一份

| 位置 | 现状 |
|---|---|
| `composables/puzzle/metaText.ts` 18–20 | `createdTextOf`：`toLocaleString('zh-CN', {year, month, day, hour, minute, hourCycle:'h23'})` |
| `pages/ResumePage.vue` 22–24 | `savedAtTextOf`：同一套参数，**只少了 `year`** |

→ 让 `metaText.ts` 导出 `dateTimeTextOf(ms, withYear = true)`，两处共用（放 composables 而不是 core：`core` 被 R3 禁止用 `Date.now()`，而这个函数需要兜底"没时间就按现在"）。

#### ③ 两处「只有一个使用者」的薄壳，按规矩应合并

| 文件 | 行数 | 使用者 | 合并到 |
|---|---|---|---|
| `components/EyeGlyph.vue` | 12 | 只有 `SecretValue`（👁 图形） | `SecretValue` 内联（本来就只是两段 `<path>`） |
| `components/PagerSliderView.vue` | 37 | 只有 `ListSection`（`mode === slider`） | `ListSection` 内的一个 `v-if` 分支 |

合并后 `components/` 从 17 个文件降到 16（含新增的 `ActionBar`）。

### 11.3 该直接用 EP 的（4 项，都是「别自己写」）

#### ① 纯加载遮罩 → `v-loading`（**8 处**，收益最大）

| 文件 | 行 | 现在 |
|---|---|---|
| `LoginPage` | 137 | `<Overlay :show="loading" spinning :text="AUTH_COPY.wait" />` |
| `CreatePage` | 142 | `<Overlay :show="loading" spinning text="正在提交题目…" />` |
| `EditPuzzlePage` | 109 | `<Overlay :show="loading" spinning text="正在处理…" />` |
| `SolvePage` | 214 | `<Overlay :show="loading" spinning :text="SOLVE_COPY.solving" />` |
| `difficulty/SystemPage` | 67 | `<Overlay :show="loading" spinning text="正在生成题目" desc="…" />` |
| `difficulty/CustomPage` | 156 | `<Overlay :show="loading" spinning :text="CUSTOM_COPY.validating" />` |
| `SearchPage` | 115 | `<Overlay :show="previewLoading" spinning />` |
| `MyPuzzlesPage` | 246 | `<Overlay :show="busy" spinning />` |

换成页面根节点上的指令（`ElLoading` 已在 `main.ts` 注册）：

```vue
<div class="page-card wide" v-loading="loading" element-loading-text="正在生成题目">
```

做完这 8 处，`Overlay` 的 `spinning` prop 就没人用了 → 一起删（`#footer` 之外只剩"文案 + 插槽 + 按钮条"三种用途）。

**例外（弹层场景要全屏遮蔽）**：`SearchPage` / `MyPuzzlesPage` 的**预览取数**用 `v-loading.fullscreen.lock`（全屏遮罩 + 锁滚动）；`MyPuzzlesPage` 的 `busy`（PATCH / DELETE）挂在 `ListSection` 上，只遮列表区域 —— 改的是列表，不该挡住整个页面。

#### ② 删除二次确认 → `ElMessageBox.confirm`（1 处）

`MyPuzzlesPage` 242–243 现在是「一个 `removeOpen` ref + 一份 `removeActions` + 一个 `Overlay`」。EP 自带确认框（按钮、焦点、ESC、层级全包）：

```ts
await ElMessageBox.confirm(MINE_COPY.removeConfirm, MINE_COPY.removeTitle, { type: 'warning' })
```

省掉 `removeOpen`、`removeActions`、以及"确认/取消"两个 `actionOf`（约 6 行状态）。

#### ③ 非列表页的三态 → `el-skeleton` / `el-result`

| 文件 | 行 | 现在 | 换成 |
|---|---|---|---|
| `PuzzleViewPage` | 34–35 | `<p class="state">加载中…</p>` / `<p class="state is-error">` | `el-skeleton :rows="3"` / `el-result icon="error"` |
| `ResumePage` | 42 | `<p class="state">{{ emptyText }}</p>` | `el-empty :description="emptyText"` |

（`ListSection` 里已经这么做了，这两页只是没跟上。）

#### ④ 列表分页 → 已完成（`el-pagination`）

### 11.4 **不建议**抽 / 不建议换的（附理由，避免反复讨论）

| 候选 | 结论 | 理由 |
|---|---|---|
| `ItemCard`（`.item-card` 外壳：`MyPuzzleRow` / `PuzzleCard` / `ResumePage`） | 不抽 | 外壳已经是全局 CSS（`styles/card.css` 的 `.item-card` / `.item-head` / `.item-title-line`），抽组件只剩 `<article class="item-card"><slot/></article>` 一层空壳 |
| `SubNav`（难度页 Tab + 求解页输入方式） | 不抽 | 难度页那两个是 `<RouterLink>`（保留 `<a>` 语义：中键新开、右键复制）；共享组件要用 `vue-router`，而 **R5 禁止 `components/` 碰路由** |
| `FormField` 改成 `el-form-item` 直写 | 不换 | 12 处都要重复「label 在上 / 紧凑尺寸 / 数字选项保类型 / hint 行」这套映射；`FormField` 已只 147 行 |
| `Flex` → `el-space` / `el-row` | 不换 | `el-space` 给每个子元素包一层 `.el-space__item`，`flex: 1`、`baseline` 对齐、`justify="between"` 全部失效 |
| `NumberPad` | 保留 | 4 处使用（`CreatePage` / `EditPuzzlePage` / `SolvePage` / `GamePage`），含 `max=S`、`columns=B`、X 清格；拆了要在 4 个页面各抄一遍网格 CSS |
| `SecretValue` / `RenameText` | 保留 | 是**行为**不是壳（惰性取真值 + 遮蔽/复制；就地改名 + Enter/Esc/失焦 + 自动聚焦）；各自 2 处使用 |
| `ExportOverlay` / `AccountSection` | 保留 | 虽然各只有 1 个使用者，但内聚一个完整交互（复制 + 提示 / 改名 + uid + 退出）；内联会让 `GamePage` 171→约 210 行、`MyPuzzlesPage` 253→约 300 行（R9 页面 ≤400 仍安全，但可读性下降） |
| `PagerStepsView` | 保留 | 3 处使用；可点回退 + 横向滚动 + 当前步自动滚进视野，`el-steps` 不可点 |
| 登录表单改 `el-form` + `rules` | 不换 | 现在是一次顺序校验、返回**第一条**文案，与服务端共用 `constants/user` 的规则；`rules` 写法更长且难表达"顺序" |
| 页面常驻提示 `.tip` 改 `ElMessage` | 不换 | `.tip` 是常驻（如"保存成功"、"此格可以填：…"），toast 会消失，语义不同 |

### 11.5 建议的落地顺序（合计约 2.2h，全部低风险）

| 顺序 | 做什么 | 工作量 | 影响面 |
|---|---|---|---|
| P1 | 新增 `ActionBar.vue`，替换 14 处（`Overlay` footer 也算一处） | 0.5h | 各调用点 -2~4 行；`disabled` / `text-action` / `Flex` 参数收敛到一处 |
| P2 | 8 处纯加载 → `v-loading`，随后删 `Overlay.spinning` | 0.5h | 少 8 个 `Overlay` 实例；加载遮罩从"对话卡片"变"页面级遮罩"（**交互变化，需确认**） |
| P3 | 删除确认 → `ElMessageBox.confirm` | 0.3h | `MyPuzzlesPage` 少一个 ref + 一份 actions |
| P4 | `PuzzleViewPage` / `ResumePage` 的三态 → `el-skeleton` / `el-result` / `el-empty` | 0.3h | 与列表页视觉统一 |
| P5 | `dateTimeTextOf` 合并、`EyeGlyph` 内联进 `SecretValue`、`PagerSliderView` 内联进 `ListSection` | 0.6h | `components/` 少 2 个文件、时间格式只一份 |

**P1 是唯一"新组件"**，其余都是「删自己写的、换 EP 的」或「合并薄壳」。做完后：
- `components/`：17 → 16 个文件（+`ActionBar`，−`EyeGlyph`，−`PagerSliderView`；`TextAction`/`PagerBar` 已可删）；
- `pages/`：总行数约 −40，且"一排按钮"再也没有第二种写法。

> **落地状态（2026-10）**：P1~P5 已全部完成 —— `ActionBar` 已替换 14 处；8 处加载遮罩改成页面级 `v-loading`（`Overlay.spinning` 已删）；删除确认改用 `ElMessageBox.confirm`；`PuzzleViewPage`/`ResumePage` 三态改用 `el-skeleton`/`el-result`/`el-empty`；`dateTimeTextOf` 已合并、`EyeGlyph` 与 `PagerSliderView` 已内联。剩余待删文件见 §9。

---

## 12. 架构与数据结构复盘

### 12.1 三条判定线（以后加功能先过这三条）

| # | 线 | 反例（本轮改掉的） |
|---|---|---|
| 1 | **能算出来的不要存、也不要传** | 页面把 `page/pageCount/pagerMode` 手工打包成 `ListPager`；把两个下拉拼成 6 字段的 `ListBar` |
| 2 | **行为不进 props**：props 只放值/数据，交互走 emit | `Action` 把 `text` 与 `onClick` 揉在一起（可接受，见 12.4）；`MyPuzzleRowControls` 12 个回调（待改） |
| 3 | **形状显式**：状态用字段表达，别用"某字段有没有值"隐式表达 | `Action` 用"没有 `onClick`"表示禁用 → 每个调用点都要 `!a.onClick` 反推 |

### 12.2 本轮已改（4 处）

| 项 | 之前 | 现在 | 影响 |
|---|---|---|---|
| `ListBar` | `{ modeLabel, modeOptions, mode, sortLabel, sortOptions, sort }` 6 个扁平字段，两个页面各拼一遍，`MyPuzzlesPage` 还硬编码中文 | `{ mode: { label, value, options }, sort: { … } }`，由 `useListQuery` 的 **`bar`** computed 产出 | `types/item.ts` · `useListQuery` · `ListSection` · 两个列表页；文案统一到 `LIST_COPY`（`SEARCH_COPY.browseLabel/sortLabel` 已删） |
| `ListPager` | 页面各自 `computed<ListPager>` 打包 | `useListQuery` 的 **`pager`** computed（页码来自 URL、页数来自各页的 `pageCount()`） | 同上；两个页面各少 6 行 + 2 个 import |
| `Action.disabled` | 隐式：没有 `onClick` 就当禁用 | 显式字段；`ACTION_OF(spec, undefined)` 直接产出 `disabled: true`，`ActionBar` 只认 `a.disabled ?? !a.onClick` | `types/item.ts` · `constants/actions.ts` · `ActionBar` |
| `Menu.routeName` | 把"路由名"塞进数据结构（`types` 层又不能 import vue-router，模板无法直接给 `RouterLink`） | `to: { name: Page }`（本地路由描述） | `types/item.ts` · `HomePage`（`router.push(item.to)`） |

### 12.3 仍未动（按「价值 ÷ 风险」排序）

| | 问题 | 建议 | 风险 |
|---|---|---|---|
| A | **`MyPuzzleRowControls` 12 个回调塞在 props 里**（`loadPid/onRename*/onVisibility/onSolution/onPreview/onChallenge/onEdit/onRemove`），组件反向依赖页面闭包 | 改成 `emit` 语义事件（`preview(answer)` / `remove` / `edit` / `challenge` / `patch({visibility})`），行内"正在改名"的状态留在页面（同时只能改一行） | 中：要同步改 `MyPuzzleRow` 模板、列表页 12 个闭包、以及类型 |
| B | **`FormField` 的 props 是大杂烩**：`type` 5 种形态，`options/min/max/step/maxlength/autocomplete/mono/width` 全塞一个对象 → 类型上 `type='select'` 可以不传 `options` | 用**可辨识联合**（`type:'select'` 时 `options` 必填）或拆 `TextField`/`SelectField`/`RangeField` | 中：`<script setup>` 里联合 props 的模板收窄写法较绕 |
| C | **`types/item.ts` 名不符实**：`Action`/`SelectOption`/`ListBar`/`ListPager`/`MyPuzzleRowControls`/`Menu` 六种东西混在一处 | 拆成 `types/action.ts` · `types/list.ts` · `types/menu.ts`（`item` 这个名字本来就没有领域含义） | 低：纯 import 改动（约 12 处），无逻辑变化 |
| D | **`BoardView` 的 props 与 `BoardRenderInput` 重复**：`GamePage`/`PuzzleViewPage` 用 `v-bind="input"`，`CreatePage`/`GamePage` 的游玩盘逐字段写 | 统一成一种（推荐 `v-bind`，页面只组一个对象） | 低：4 处模板 |
| E | **`gameStore.config.boxSize` 与 `gameStore.sudoku.B` 两份真源**（B 就是 boxSize 派生的边长） | `sudoku` 只保留 `S` / 组表，`B` 一律读 `config.boxSize` | 中：store 与多处调用（`BoardView`/`NumberPad`/`useBoardRender`） |
| F | `usePuzzlePreview` 返回 `previewInput`（`BoardRenderInput`），与 D 同源 | 与 D 一起做 | 低 |

### 12.4 明确**不改**（避免以后再来一轮）

- **`Actions` 数组 + `ACTION`/`ACTION_OF`**（"文案与回调同处一条按钮条"）：换成语义枚举会让文案表与页面分离、页面还得再查表，收益不抵改动面；本轮只把"禁用"显式化。
- **`Overlay` / `ListSection` / `FormField` 继续做组合组件**：它们承载的是"布局 + 插槽协议"（`#footer` / `#item` / `#empty` / label+hint），不是 EP 能一对一替换的壳。
- **`SecretValue` / `RenameText` 不改回页面内联**：它们是**行为**组件（惰性取真值 + 遮蔽 + 剪贴板 / 就地改名 + 键位 + 自动聚焦），各自 2 处使用。
- **`MyPuzzleRow` 的 controls 本轮不动**：改它会连带类型、列表页 12 个闭包和"同时只允许一行改名"的语义，适合单独一轮（见 12.3 A）。







