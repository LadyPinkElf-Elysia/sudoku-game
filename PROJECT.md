# 数独 · 项目全景导读（PROJECT.md）

> **用途**：给自己看的「重启记忆」文档 —— 从框架 → 设计 → 为什么这么设计 → 怎么实现 → 数据怎么流。
> **与其它文档的关系**：`REQUIREMENTS.md` 是**要什么**（功能与验收）· `ARCHITECTURE.md` 是**硬约束**（R1~R15 / E1~E8，守卫可执行）· **本文是「怎么串起来的」**（导读，不重复细节）· `CODE-GUIDE.md` 是**各层为什么这么写**（pages / components / composables / stores / core 各自的意思、理由与反例）。
> **怎么读**：§0~§2 建立框架 → **§3 两种盘面表示**是理解全项目的钥匙 → 之后按需查 §4（core 怎么算）· §5（数据怎么流）· §6~§8（状态/流程/适配器）· §9~§11（约定、踩坑、改需求的顺序）。
> **维护约定**：改完代码动到"结构/流程/决策"时，本文与另外两份一起更新（三处同步，见 §11）。

---

## 0. 30 秒速览

- **是什么**：一个 Vue3 数独站点 —— 系统生成 / 自定义 / 搜索 / 出题 / 我的题目 / **题面求解（多解）** / **导出题目**，带 Cloudflare Functions + D1 后端。
- **三层 + 三个适配器**：`core/`（纯函数：怎么算）· `stores/`（数据：有什么、记什么）· `composables/`（流程：什么时候算、算完干什么）；
  三个"唯一碰外界"的适配器：`render/`（唯一碰 canvas）· `services/`（唯一碰 Worker / HTTP / 本地存储）· `functions/`（唯一碰 D1，在仓库顶层）。
- **一条铁律：依赖只能向下**
  `components → composables → stores → services → core → constants/types`（组件还被额外禁止碰 store / router）。
  因此 **core 被前后端共用**：数独规则只有一份，前端即时校验与后端复校走同一份代码。
- **跑起来**：`pnpm dev`；后端联调：`npx wrangler pages dev --port 8788`（vite 已把 `/api` 代理到它）。
- **四道门禁**：`pnpm guard`（架构守卫）· `pnpm typecheck` · `pnpm typecheck:functions` · `pnpm build`。

## 1. 技术栈与运行骨架（为什么是这些）

| 选型 | 版本（package.json） | 为什么 |
|---|---|---|
| Vue 3.5 + `<script setup>` + TypeScript 6 | `vue ^3.5.42` / `typescript ~6.0.2` | 组合式 API 让"每页一个 flow"（§7）成立；类型是分层红线（core 手写契约 `types/sudoku.ts`） |
| Vite 8 | `vite ^8.3.0` | 开发快；`server.proxy['/api'] → 127.0.0.1:8788`（可用 `API_TARGET` 覆盖）让前后端"同源"开发 |
| Pinia 4 | `pinia ^4.0.3` | 只装**跨页共享且需要记住**的数据（game / puzzle / user）；其余是组件/组合式本地状态（R15：过程放 state） |
| vue-router 5，**hash history** | `vue-router ^5.3.1` | hash 不需要服务端 rewrite 兜底（Pages 静态托管友好）；分享链接仍是 `/p/:pid`（R15：位置放路由） |
| Cloudflare Pages Functions + D1 | `wrangler ^4.149.0` | 零运维后端；`functions/` 与前端同仓库；D1 是 SQLite，`schema.sql` 幂等可重复执行 |
| Web Worker | 原生 | 生成与多解是**回溯**（可能秒级到十几秒）→ 必须离开主线程；生成 15s / 求解 30s 超时 |
| pnpm（monorepo workspace） | 根目录 `学习资料/vue3` | 依赖只装一份（硬链接）；**lockfile 与 `node_modules` 在仓库根**，包内没有 lockfile（这不是文件丢失） |

**运行骨架（谁在什么时候被调用）**

```
浏览器
 ├─ main.ts            createApp + pinia + router（组合根：允许 import 一切）
 ├─ App.vue            只有 <RouterView/>（外壳在 pages/AppLayout.vue）
 ├─ router/index.ts    路由表 + 守卫（受保护路由回跳登录；难度壳补默认 Tab）
 └─ pages/*.vue        只接线：声明 ≤10、禁 Math.、把 composable 给的数据喂给组件
        ▲
        │（数据与动作）
   composables/*        ref/watch/生命周期/router/异步**只在这里**出现
        ▲
        ├── stores/*   棋盘 / 列表缓存 / 登录态（需要"记住"的东西）
        └── services/* api 客户端 · 本地偏好 · Worker 客户端（唯一碰 fetch/localStorage/Worker）
                ▲
                └── core/* 纯函数：数独规则 / 生成 / 求解 / 解析 / 分页 / 文案（前后端共用）
Worker（独立线程）—— services/sudoku/worker.ts → 直接 import core 的生成器 / 多解器
Cloudflare Functions（服务端）—— functions/** → 也直接 import core（规则只有一份）
```

## 2. 分层与依赖规则（为什么这么设计）

### 2.1 每层只干一件事

| 层 | 目录 | 一句话职责 | 判据（出现什么就说明放错层了） |
|---|---|---|---|
| 数据层 | `types/ constants/ stores/ services/` | 有什么数据、存在哪、从哪来 | 需要"记住"或"出去取" |
| 纯函数层 | `core/` | 怎么算 | 入参定则输出定，不碰任何外部 |
| 组合式层 | `composables/` | 什么时候算、算完干什么 | 需要 `ref` / `watch` / 生命周期 / router / 异步 |
| 渲染适配器 | `render/` | 唯一碰 canvas | 出现 `ctx` / `devicePixelRatio` |
| 服务适配器 | `services/` | 唯一碰 Worker / HTTP / 本地存储 | 出现 `new Worker` / `fetch` / `localStorage` |
| 后端适配器 | `functions/`（仓库顶层） | Cloudflare Functions + D1 | 出现 `D1Database` / `PagesFunction` |
| 展示 | `components/ pages/` | 画出来 / 接线 | 不写算式（页面禁 `Math.`） |

一句话记住：**core 不认识 vue；stores 不认识 router；types 谁都不认识（除 types / constants）；组件不认识 store。**

### 2.2 每层的"禁止项"（守卫会查，违者 `pnpm guard` 直接红）

- **core**：禁 `vue`/`pinia`/`vue-router`、禁宿主（`window`/`document`/`localStorage`/`navigator`）、禁 `new Worker`、
  禁 `Math.random` / `Date.now` / `new Date()`、禁 `console.`；**随机与时间由调用方注入**（`shuffle(arr, rng)`、`generatePuzzle(B, blanks, rng)`）。
  → 为什么：这样 core 才是"可复现、可测、可在 Worker 与 Worker 后端里跑"的。
- **constants**：只放值（导出名 `UPPER_SNAKE_CASE`），不许放类型、不许 import 任何东西。
- **types**：叶子层，只许 `./xxx` 或 `@/types/*`、`@/constants/*`；**外部 canvas / DOM / Worker 用参数传，不塞进数据对象**；
  **敏感字段不进前端类型**（`uid` 不出现在题目相关类型里）。
- **stores**：禁 `for (` / `.forEach(` / `Math.`，禁 `vue-router`；只做「取值 → 调 core 的纯函数 → 写回」。
- **composables**：禁 `Math.`（算式一律下沉 core）；`router` 跳转与异步只在这里出现。
- **components**：禁 `@/stores`、禁 `vue-router`（`RouterLink`/`RouterView` 虽然是全局组件，也不许用 —— 路由属于 pages / composables）。
- **pages**：声明（`const`/`function`）≤ 10 个，禁 `Math.`，只接线（要显示算好的值 → 由 composable 暴露）。
- **全局**：禁 `export * from`（禁桶文件）；禁 `axios`（统一 `fetch`）；单文件 ≤ 200 行。
- **R11 core 必须可测**：core 里**不能有模块级可变状态**（顶层 `let` / `Map` / `Set` —— 例外只有 `rules.ts` 的 `getSudoku` 缓存，登记 E1）。
  ⚠️ 注意：**不强制写测试、不强制跑测试**；仓库不预置测试工具链（`.test.ts` 不受守卫约束，想测随时补）。

### 2.3 为什么值得守这些规矩

1. **规则只有一份**：`functions/utils/puzzle.ts` 直接 `import` `core` 做服务端复校 —— 前端说"题面合法"，后端不可能有第二种判法。
2. **核心逻辑脱离框架可验证**：改 `core` 时可以完全不开浏览器 —— 临时把 core 用 esbuild 打成 mjs 后 `node` 跑断言（本仓库一直在用这个办法做冒烟）。
3. **换皮不动骨**：渲染从 canvas 换 DOM、后端从 D1 换别的存储，只要不跨层就不会碰到 core。
4. **AI/新人可预测**：守卫把"能机器查的"全部机器化（R1~R15），所以人只需要评审"语义"部分（R8 命名语义、R15 状态归位）。

---

## 3. 两种盘面表示（理解全项目的钥匙）

| 类型 | 长相 | 谁在用 | 为什么 |
|---|---|---|---|
| `NumBoard` | `number[][]`，`0` = 空格 | **core 的通用货币**：`parse` / `rules` / `solver` / `generator` / `digger` / 后端 `functions/` | 纯数值，没有 UI 概念 → 前后端与 Worker 都能用 |
| `Board` | `Cell[][]`，`Cell = { v: number; lock: boolean }` | 玩法与渲染：`stores/game`、`render/board`、`BoardView`、NumberPad | 要区分"题面给的数"与"玩家填的数"（颜色/粗体/能否改） |

**转换点全部在 `core/board/`**（不要在别处手写遍历）：

| 函数 | 作用 | 典型场景 |
|---|---|---|
| `model.fromPuzzle(nums, lockGiven)` | `NumBoard` → `Board`；`lockGiven=true` 时**非 0 的格子锁定** | 开局（系统/自定义/挑战都用它）、只读解盘（永远 true） |
| `model.toNum(board)` | `Board` → `NumBoard` | store 的 `numBoard` 派生、提交、校验 |
| `ops.givenBoard(board)` | 只留 **锁定格**，其余归 0 | **导出题目**（玩家填的数自动消失） |
| `ops.lockGiven(board)` | 把"当前非 0 的格子"整体锁定 | 出题/编辑「提交题面」时锁题（之后不能再改题面） |
| `ops.applySolution(board, solution)` | 把答案填进可改格 | DEV 作弊 |
| `ops.cloneBoard` / `countBlanks` / `isBlankBoard` | 快照 / 挖空数 / 全空判定 | 历史步、挖空比例、提交校验 |
| `model.makeCell(v, lock)` | 造一格 | 输入数字、测试脚本 |

**一条经验**：凡是"要判断这是不是题面给的数"，一律看 `cell.lock`，**不要**去和 `solution` 比 —— `lock` 是"来源"，比"值相等"更语义正确（玩家可能正好填对，但那个格子仍然不是题面的一部分）。

## 4. core 逐模块（怎么算）

> core 的每个文件都遵守：入参定则输出定、不碰宿主、随机/时间靠注入。文件普遍 < 200 行（R9），`core/**` 单文件导出 2~8 个（或"单函数模块 ≥ 50 行"）。

### 4.1 `core/array.ts` —— 网格与洗牌工具

- `makeGrid<T>(n, fn)`：造 n×n 二维数组（`core` 里所有"表"都从它来，别手写嵌套循环初始化）。
- `mapGrid<A,B>(grid, fn)`：二维映射（`fromPuzzle` / `toNum` / `cloneBoard` / `givenBoard` 都基于它）。
- `chunk<T>(arr, size)`：一维切二维（`parseNumBoard` 用）。
- `shuffle<T>(arr, rng)`：Fisher–Yates，**随机源必须外部注入**（core 不许 `Math.random`）。

### 4.2 `core/board/*` —— 盘面模型 / 操作 / 几何 / 缩放

| 文件 | 关键导出 | 说明 |
|---|---|---|
| `model.ts` | `makeCell` · `fromPuzzle` · `toNum` · `toRC` | 见 §3 的转换表 |
| `ops.ts` | `cloneBoard` · `isBlankBoard` · `lockGiven` · `applySolution` · `countBlanks` · `givenBoard` | 见 §3 的转换表 |
| `metrics.ts` | `boardSideOf(contentWidth, zoom)` · `cellSizeOf` · `fontPxOf` · `offsetToCell` · `boxOriginOf` · `boxIndexAt` | **一切几何只在这里算**：棋盘 CSS 边长 = `clamp(内容宽×0.7, 240..420) × zoom`；`offsetToCell` 把点击坐标换成行列；`boxOriginOf/boxIndexAt` 把行列换成"宫"的起点/序号（宫相关的所有代码都调它，不各写一遍取整） |
| `zoom.ts` | `clampZoom` · `zoomInOf` · `zoomOutOf` · `canZoomInFrom` · `canZoomOutFrom` · `defaultZoomOf` | 浮点比较带 `EPS=1e-9`（否则 `2.8+0.1` 让按钮永远不禁用）；`defaultZoomOf(B)` 读 `BOARD_ZOOM.default` 字典（B=3→1.25 · B=6→2.5 · B=10→6；未登记兜底 `BOARD_ZOOM.min`） |

**为什么把几何/缩放放 core**：它们都是纯计算（无 DOM）；`render/` 只负责"把算好的数字画出来"，`composables/useZoom` 只负责"记住当前 zoom 并给按钮"。这样 `BoardView` 换渲染方式时，几何与缩放的测试面不变。

### 4.3 `core/sudoku/*` —— 数独本体（最值得记的部分）

| 文件 | 关键导出 | 记什么 |
|---|---|---|
| `shape.ts` | `sideOf(B)` · `cellCountOf(B)` · `blankCountOf(B, ratio)` · `boxSizeOf(S)` · `isBlankRatioOk(blanks, B)` | 只在 `B ↔ S = B²` 之间换算；挖空比例合法区间取自 `BLANK_RATIO`（**0.4 ~ 0.65**，见 §10） |
| `rules.ts` | `createSudoku(B)` → `Sudoku` 契约；`getSudoku(B)`（记忆化 `Map`，E1） | `allRows/allCols/allBoxes` 是**生成器**，`allGroups()` 把它们串起来 —— 冲突检测、`hasEmptyGroup`、候选都复用它（"行/列/宫"的定义只有一份）；`findConflicts` 出掩码、`hasConflict` 早退、`hasEmptyGroup` 判"整行/列/宫全空"、`isSolved`、`validatePuzzle(puzzle, solution)`（同尺寸 + 题面无冲突 + 题面是答案子集 + 答案是合法终盘） |
| `tracker.ts` | `createTracker(S, B, grid)` → `{ pickCell, candidatesOf, place }` | **回溯的候选簿记**：`rowUsed/colUsed/boxUsed` + 每格候选 `cand[r][c][n]` + 候选计数 `count[r][c]`。`pickCell()` 用 **MRV**（候选最少的空格）并同时报告 `full`（无空格）/`dead`（有 0 候选的死路）；`place(r,c,n)` 就地写盘 + 删同行/列/宫候选，**返回撤销闭包**（撤销只需回放 changes，E7） |
| `solver.ts` | `solveGrid(grid, B, rng, onSolution, maxIter?)` · `solvePuzzle(board, rng)` | **一份引擎**：每凑满一盘就调一次 `onSolution`（传拷贝），回调返回 `true` 就停；`maxIter` 是保险丝（默认 2000 万步）。`solvePuzzle` 入口先查尺寸与**题面自带冲突**（冲突直接 `null`） |
| `multiSolver.ts` | `solvePuzzleMulti(board, rng, max)` · `solveLimitOf(n)` | 与求解器**共用同一引擎**，只换停止策略：每找到一个就 `push`，存够 `limit` 才停 → 返回 `NumBoard[]`（`[]` = 无解/尺寸非法/自带冲突）。上限硬顶 50 |
| `generator.ts` | `generateSolution(B, rng)` · `generatePuzzle(B, blanks, rng)` | ① `patternBoard`：用 `((r·B + ⌊r/B⌋ + c) mod S)+1` 构造一个**天然合法的终盘**（不用搜）② `randomTransform`：数字置换 → 宫内行置换 → 行带置换 → 宫内列置换 → 半概率转置（都保合法性）③ 按 `keepRatioOf(S)` 随机保留一部分 ④ 交给 `solveGrid` 补全 → 完整解；`generatePuzzle` = `generateSolution` + `digPuzzle` |
| `digger.ts` | `digPuzzle(solution, blanks, rng)` | **三阶段挖洞**（目标 = `clamp(blanks, 40%~65%)`）：① 保证每行/每列/每宫**至少留 1 个数**（这也是"系统生成的题面不会有空行/列/宫"的来源）② 硬+软约束（行-宫/列-宫交叉至少留 `k` 个）③ 只守硬底线兜底 |
| `parse.ts` | `parseNumBoard` · `parsePuzzle` · `boardToStr` | 串 ↔ 盘面：**空格/逗号/中文逗号/换行分隔、行优先、`0` = 空格**；`boardToStr` 用空格分隔 —— **导出串与自定义/求解的输入完全对称**（§5.8） |

**引擎复用的实际收益**：`solver` 与 `multiSolver` 共用一个 DFS 骨架，差别只有"回调返回什么"；`generator` 也不写第二套搜索。所以"生成失败/求解无解"的行为只有一处需要理解。

### 4.4 `core/` 其余三件

| 文件 | 关键导出 | 说明 |
|---|---|---|
| `message.ts` | `errorTextOf(err, fallback)` · `blankRatioErrorOf(blanks, B)` · `puzzleSubmitErrorOf(numBoard, B, sudoku)` | **全站文案与提交校验的唯一出口**：11 处"错误兜底"、3 处 40%~65% 文案、出题/编辑共用的提交校验顺序（全空 → 有空行/列/宫 → 冲突 → 比例）都在这 |
| `page.ts` | `clampPage` · `pageCountOf` · `offsetOf` · `sortOf` · `pagerModeOf` | 列表的"归一化"只在这：页码收敛、页数、offset、把 URL 上的 `sort`/`pagerMode` 归一到合法值（`stores`/`composables` 不许写这种算式） |
| `game/derive.ts` | `statusOf(hasBoard, isWin)` · `hintTextOf(cell, candidates)` · `percentOf(ratio)` | 棋局状态与提示文案（"请选中一个格子"/"无法更改初始题目"/"此格可以填：…"） |

---

## 5. 数据流动（端到端时序）

> 每条都按「**触发 → 谁调用谁 → 数据形状怎么变 → 落在哪**」写。看懂这节，就找得到任何一个功能该改哪个文件。

### 5.1 系统生成开局（难度页 → 游戏页）

```
用户：难度页选 B + 挖空比例 → 点「▶ 开始游戏」
① composables/game/useDifficultyFlow.apply()
     draft.balance → blankCount = blankCountOf(B, ratio)（core/sudoku/shape）
② services/sudoku/workerClient.generateInWorker(B, blankCount)   ← new Worker + 15s 超时 + 拿到结果就 terminate
③ services/sudoku/worker.ts（Worker 线程）
     core/sudoku/generator.generatePuzzle(B, blanks, Math.random)
        generateSolution：patternBoard → randomTransform → 保留 keepRatio → solveGrid 补全
        digPuzzle：三阶段挖洞（保证每行/列/宫至少留 1 个数）
     → postMessage({ ok:true, result:{ puzzle, solution } })      ← 两个都是 NumBoard
④ stores/game.startGame(puzzle, solution, cfg, GAME_ORIGIN.System)
     mode = Game · origin = System · config = cfg
     board = fromPuzzle(puzzle, /* lockGiven */ true)             ← NumBoard → Board（已知格锁定）
     solution = solution · meta = 空
     resetHistory() → snapshots = [cloneBoard(board)]，currentStep = 0
⑤ router.replace('/game') → pages/GamePage.vue
     boardParams = { board: gameStore.board, boxSize: sudoku.B, selected, conflictMask, zoom }
     → components/BoardView 只管画；composables/board/useBoardZoom 的 zoom 初值 = defaultZoomOf(B)
```

**要点**：生成全程在 Worker；`store` 只做"写状态"；页面只把 store 的派生喂给组件。

### 5.2 自定义开局（两串 → 游戏页）

```
pages/difficulty/CustomPage.vue（两个 textarea）
① composables/game/useCustomFlow：puzzleText / solutionText（ref，绑 textarea；maxlength = CUSTOM_TEXT_MAX）
② apply() → validate()（顺序固定，失败只写 error，不跳页）
     parsePuzzle(题面) / parsePuzzle(答案)   ← core/sudoku/parse（个数必须是 16/81/…/10000）
     尺寸一致 → isBlankBoard → getSudoku(B).hasEmptyGroup → validatePuzzle(题面, 答案)
     （可选勾选「提交到我的题目」：就地展开标题框 → blankRatioErrorOf → POST /puzzles，默认 private）
③ stores/game.startGame(p.board, s.board, cfg, GAME_ORIGIN.Custom) → /game
```

### 5.3 挑战他人题 / 落地页挑战

```
[搜索页] 列表项「挑战」→ useSearchPuzzle.challenge(pid)
   → usePuzzleDetail.load(pid) → services/api/puzzleApi.getOne(pid) → GET /api/puzzles/:pid
   → detail.challenge() → stores/game.startFromTexts(puzzleText, solutionText, blankCount, meta?)
        parsePuzzle(题面) → startGame(board, 答案, cfg, GAME_ORIGIN.Challenge, meta{pid,title,uname})
   → router → /game（信息行显示「标题 · 出题人」）
[热度] 已登录时另有 POST /api/puzzles/:pid/play（1 人 1 小时 1 次；作者本人不计）
[落地页] /p/:pid → pages/PuzzleViewPage.vue → 同一个 usePuzzleDetail → 只读棋盘 + 「挑战」
```

### 5.4 我的题目：行内改一行（重命名 / 可见性 / 显示答案 / 删除）

```
pages/MyPuzzlesPage.vue → components/MyPuzzleRow（只画，不碰 store）
① 点「重命名」→ 就地变输入框 → 回车/失焦提交
② composables/puzzle/useMyPuzzles.withDetail(rowId, run, failText)
      detailOf(rowId) → GET /api/puzzles/mine/:rowId（拿 pid；命中 stores/puzzle 的 details 缓存就不发请求）
      run(detail) → PATCH /api/puzzles/:pid { title | visibility | showSolution }
      成功后 dropDetail(rowId) 清缓存 → 页面重拉当前页列表（loadMine）
③ 删除：二次确认（Overlay）→ DELETE /api/puzzles/:pid（后端连带清 puzzle_play）→ 同样清缓存 + 重拉
```

**为什么这样设计**：列表接口**不返回 pid**（最小暴露），所以任何"需要 pid 的操作"都统一走 `mine/:rowId`，并且**一次拿全**（pid + 题面 + 答案）以便缓存复用。

### 5.5 出题两阶段（含编辑页）

```
pages/CreatePage.vue（标题 + 盘面大小 + 可玩棋盘 + NumberPad）
① 阶段①（填题面）：composables/game/usePuzzleStage.submitPuzzle()
      core/message.puzzleSubmitErrorOf(numBoard, B, sudoku)  ← 全空 → 空行/列/宫 → 冲突 → 40%~65%
      通过 → puzzleSnapshot = numBoard；stores/game.lockPuzzle()（lockGiven 锁题）→ phase = Solution
② 阶段②（填答案）：checkSolution() → sudoku.validatePuzzle(puzzleSnapshot, numBoard)（不成立亮失败遮罩）
③ 提交：POST /api/puzzles（后端 checkPuzzle 用**同一套 core** 复校）→ 完成遮罩「去我的题目」
   编辑页 pages/EditPuzzlePage.vue：useEditFlow.load(pid) → parsePuzzle → stores/game.startCreate(B, board)（未锁）
     两阶段同上 → PATCH /api/puzzles/:pid（题面/答案成对提交，后端重算 blank_count，**不改 created_at**）
```

**为什么锁题要落 store**：`lock` 是盘面数据的一部分（§3），锁定后玩家就改不动题面格；`snapshots` 同步重置，历史从"锁题后"重新计。

### 5.6 题目求解（多解枚举）

```
pages/SolvePage.vue（两种输入方式，界面各自独立）
① 字符串模式：applyText() → parsePuzzle(串) → stores/game.startSolve(B, board)（GAME_MODE.Solve，未锁）
   棋盘模式：盘面大小下拉 → startSolve(B)；点棋盘 select()；数字键 inputNum()（X = 0 清格）
② 「🧮 求解」→ useSolveFlow.solve()
     （字符串模式先 applyText()：解析成功后自动切到棋盘模式，方便你看/改）
     本地校验（不调 Worker）：isBlankBoard → sudoku.B > SOLVE_MAX_BOX_SIZE(6) → sudoku.hasConflict
③ services/sudoku/workerClient.solveMultiInWorker(numBoard, maxSolutions)
     → Worker：core/sudoku/multiSolver.solvePuzzleMulti(board, Math.random, max) → NumBoard[]
        （内部复用 solveGrid 引擎；空数组 = 无解/自带冲突）
④ 结果：solutions[] + solutionIndex（都只是页面级 ref，不进 store）
     只读盘 = fromPuzzle(solutions[k], true)（全锁定 → 纯 canvas）
     步骤条 = components/PagerBar(mode="steps")：page = solutionIndex，pageCount = solutions.length
     信息行 = 「第 k / 共 n 个解」；结果行 = 「共找到 n 个解（已达上限 m）」
⑤ 换尺寸 / 清空 / 重新填入 → 立刻清空 solutions（不留过期解）
```

**为什么多解要单独一页**：它是"工具"而不是"玩法"—— 不写库、不记热度、随时清空；所以用 `GAME_MODE.Solve`（与出题共用"手填盘面"那套 `startInput`），但求解结果只活在 composable 里。

### 5.7 导出一盘题面（只在系统生成的盘显示）

```
pages/GamePage.vue → 操作条「📋 导出题目」→ useGameFlow.exportPuzzle()
① core/board/ops.givenBoard(gameStore.board)   ← 只留 lock 的格（玩家填的数自动变成 0）
② core/sudoku/parse.boardToStr(...)            ← 空格分隔、行优先（与 parsePuzzle 完全对称）
③ composables/usePuzzleExport.show(题面串)      ← 只管"遮罩 + 复制 + 说明行"
④ components/Overlay(wide) 里只读 textarea；「📋 复制题面」→ useClipboard → 说明行「题面串已复制」
⑤ 按钮只在 gameStore.origin === GAME_ORIGIN.System 时拼进操作条
```

**为什么只给系统生成**：自定义的题面串本来就是你刚粘进去的；挑战的题有 `pid` / 落地页可分享；只有系统生成的盘**既没有 pid 也没有现成串** —— 导出正好补这个缺口。

### 5.8 游戏页"改一格"的最小闭环（顺带理解历史步骤条）

```
BoardView @cell-click → stores/game.select(pos)          ← 只记 selected（Position）
NumberPad @pick → stores/game.inputNum(n)
      status 必须是 Playing（mode === Game 且未胜利）· 选中格必须存在且 !lock
      cell.v = n → pushHistory()
          snapshots.splice(currentStep + 1)   ← 从当前步之后截断（新分支）
          snapshots.push(cloneBoard(board))   ← 整盘快照（Board，深拷贝）
          currentStep = snapshots.length - 1
渲染：conflictMask = sudoku.findConflicts(numBoard)（store 的 computed，纯函数算）
     isWin = sudoku.isSolved(numBoard) → 通关遮罩（GAME_COPY.win）
历史条：PagerBar(mode="steps")，page = currentStep，pageCount = snapshots.length
     点某一步 → stores/game.jump(step) → board = cloneBoard(snapshots[step])
```

**要点**：整盘快照换来"任意跳步"，几十步 × 1296 格完全可接受；`PagerBar` 对"步"（0 基）与"页"（1 基）做了区分 —— 这曾是一个真 bug（§10.2）。

### 5.9 登录 / 会话 / 401（谁负责清状态）

```
[注册/登录] pages/LoginPage.vue → useAuth → services/api/userApi.register|login
     → POST /api/register | /api/login → { token, user }
     → services/api/session.setToken（localStorage: sudoku.token）+ setLastUid（sudoku.lastUid）
     → stores/user.profile = user → 换 UI（顶栏「👤 用户名」）
[刷新恢复] 路由守卫（受保护页）await stores/user.restore() → GET /api/me（无 token 直接返回 null）
[任何接口 401] services/api/client.request 收到 401 → notifyUnauthorized()
     · clearToken()（删本地 token）
     · 通知订阅者 → stores/user 把 profile 置空（services 不反向依赖 stores，靠回调）
     · 再抛 ApiError(401, 后端文案)（如「登录已过期，请重新登录」）
[受保护路由] router/index.ts beforeEach：requiresAuth 且是游客 → 去 /login?redirect=…；
     redirect 只接受站内路径（useAuth.safeRedirect：startsWith('/') 且不以 '//' 开头）
[改显示名] PATCH /api/me { uname } → 成功后就地更新 stores/user.profile.uname
```

### 5.10 列表查询（URL 是唯一真源）

```
pages/SearchPage.vue / MyPuzzlesPage.vue
① composables/useListQuery({ routeName, load, pageCount })
     watch(() => [route.query.q, route.query.sort, route.query.page])  ← 深链接 / 后退 / 首次进入都走这条路
     把 query 归一化：keyword = q ?? ''，sort = sortOf(query.sort)（core/page），page = Number(...) || 1
② load(q)（由页面注入）
     搜索页：useSearchPuzzle.load —— 20 位输入先当 pid 试（命中就跳 /p/:pid），否则当 uid 搜，其它按标题/uname 模糊
     我的题目：store.loadMine
③ 越界收敛：clampPage(page, pageCount())（core/page）→ 需要就把 URL 改回去（router.replace）
④ 交互 → 只改 URL：换排序/关键词 → applyQuery(1)；翻页/拖滑条 → applyQuery(n)
     → watch 再次触发 → 取数（所以"数据流"只有一个入口，不会一边点按钮一边手动请求）
⑤ 浏览方式（进度条 / 滑动条）是**纯 UI 偏好** → 不进 URL，存本地（services/prefs: sudoku.pagerMode）
```

**为什么这么设计（R15）**：位置放路由（可分享 / 可后退）、过程放 state、影响数据请求的放 query、纯 UI 偏好放本地偏好。副作用是"刷新页面条件不丢、分享链接带条件"。

---

## 6. 状态层（stores：什么需要"记住"）

### 6.1 `stores/game.ts` —— 全项目最核心的 store

| 分组 | 内容 | 说明 |
|---|---|---|
| 配置 | `config{boxSize, blankRatio}` · `mode`（`game`/`create`/`solve`）· `origin`（`system`/`custom`/`challenge`） | `mode` 决定"这块盘是玩 / 是出题 / 是求解"；`origin` 只用来决定游戏页给不给「导出题目」 |
| 盘面 | `board`（`Board`）· `selected` · `snapshots` + `currentStep` · `solution` · `meta{pid,title,uname}` | 全部是 `ref`；`meta` 为空 = 系统生成 / 自定义 |
| 派生（`computed`） | `sudoku`（`getSudoku(B)`）· `numBoard`（`toNum(board)`）· `isWin` · `status` · `conflictMask` · `selectedCell` | 派生全部**调 core 的纯函数**，store 里没有任何算法 |
| 动作 | `startInput`(内部) / `startCreate` / `startSolve` / `startGame` / `startFromTexts` / `lockPuzzle` / `select` / `inputNum` / `jump` / `cheat` / `getCandidates` | 见 §5 的调用链 |

- **`startGame(puzzle, sol, cfg, from, source?)`**：唯一的"开局"入口；`from` 是**必填**的 `GameOrigin`（TS 保证 3 个调用点不漏传，见 §5.1/5.2/5.3）。
- **`startInput(mode, B, puzzle?)`**：出题/求解**共用**的"手填盘面"实现（只有 `mode` 不同）；`startCreate` / `startSolve` 是它的两个薄入口 —— 这是"一份实现两个入口"的去重。
- **历史**：`resetHistory()`（开局/锁题/重建）与 `pushHistory()`（每次落子）都在这里，页面永远不会自己操作 `snapshots`。

### 6.2 `stores/puzzle.ts` —— 列表与详情缓存

- 状态：`items`（搜索结果）· `mine`（我的题目）· `details`（`rowId → MyPuzzleDetail` 缓存）· `total` · `authorUname` · `loading` / `error` · `savedTip`。
- 派生：`pageCount`（`pageCountOf(total, LIST_PAGE_SIZE)`）· `empty`（不在加载中、无错误、无数据）。
- 动作：`search` / `loadMine` / `detailOf` / `dropDetail` / `flashSaved` / `takeSavedTip`。
- **去重设计**：`loadPage(run, empty)` 把"转圈 → 成功由 `run` 写回 → 失败清空 + 统一文案"收成一处；搜索与我的题目只有"打哪个接口 / 写哪些 ref"不同。
- **`savedTip`**：跨页一次性轻提示（"已保存到我的题目"）—— 写入方给文案，读取方 `takeSavedTip()` **取走即清**，保证只提示一次。

### 6.3 `stores/user.ts` —— 登录态

- `profile` + 派生 `isGuest` / `uname` / `uid`；动作 `register` / `login` / `logout` / `restore` / `rename`。
- `restore()` 用 `pending ??=` 保证**同一时刻只发一次** `/api/me`（路由守卫可以 `await` 它再判登录态）。
- 401 由 `services/api/client` 通过 `onUnauthorized` 回调通知（services 不 import stores，保持单向依赖）。

### 6.4 "这条数据该放哪"（速查）

| 数据 | 放哪 | 例子 |
|---|---|---|
| 纯静态、无格式化 | `constants/` | `GAME_COPY.win` · `AUTH_COPY.needLogin` · `RATIO_COPY.bad` |
| 需要按入参拼装 | core 纯函数 | `hintTextOf` · `percentOf` · `metaTextOf`（在 `composables/puzzle/metaText.ts`） |
| 只在模板里出现 | 页面 / 组件模板 | "系统生成 S×S" |
| 位置 / 可分享 | 路由与 query | `/p/:pid` · `/search?q=&sort=&page=` |
| 纯 UI 偏好 | 本地偏好（`services/prefs.ts`） | `sudoku.pagerMode` |
| 过程 / 依赖内存 | state（store 或组件内） | 棋局、出题阶段、求解结果、遮罩开关 |
| 跨页共用界面 | 父路由布局 | `pages/AppLayout.vue` |
| 页面要显示的算好的值 | composable 暴露 | 页面禁用 `Math.` |

## 7. 组合式层（composables：每页一个 flow）

| 文件 | 负责 | 谁在用 | 为什么抽出来 |
|---|---|---|---|
| `useListQuery.ts` | URL(?) ↔ 条件、越界收敛、浏览偏好 | 搜索页 / 我的题目 | 两个列表页的"条件-分页-偏好"完全同构 |
| `game/usePuzzleStage.ts` | 出题/编辑的「题面 → 答案」两阶段状态机（`phase` / `puzzleSnapshot` / `errorMsg` / `showFail` + 4 个动作） | 出题页 / 编辑页 | 两页流程逐字相同，只有标题/缩放/POST/PATCH 不同 |
| `board/useZoom.ts` | `useZoom(initial)`（记住 zoom + 生成 ➖/➕ 的 `zoomActions`）· **`useBoardZoom(boxSize)`**（默认值跟着盘面大小，尺寸变了自动复位） | 所有带棋盘的页面 | R14 要求"有棋盘必须能缩放"；默认缩放必须随 B 变化（§10.3） |
| `puzzle/usePuzzlePreview.ts` | 题目/答案预览遮罩（**自带一份 zoom**，零副作用、不写 store） | 搜索页 / 我的题目 | 预览是"完全只读的一次性动作" |
| `usePuzzleExport.ts` | 导出遮罩：题面串 + 复制 + 说明行（**只导题面**） | 游戏页 | 与"串"有关的交互只有这一处 |
| `useClipboard.ts` | 复制到剪贴板（只关心成没成） | 账号区 / 导出 | 失败文案由调用方决定 |
| `auth/useAuth.ts` · `useAccountMenu.ts` · `useAccountPanel.ts` | 登录/注册表单、`safeRedirect`、顶栏账号位与账号卡 | 登录页 / 顶栏 / 我的页 | 登录相关的校验与跳转只写一遍 |
| `game/useGameFlow.ts` | 游戏页操作条（返回/重开/提示/导出/答案 + DEV 作弊）、答案遮罩、通关遮罩 | 游戏页 | 页面只 `v-for` 渲染 `actions` |
| `game/useDifficultyFlow.ts` | 系统生成（草稿 → Worker → 开局） | 难度页·系统生成 | 生成 + 开局 + 跳转是一条流程 |
| `game/useCustomFlow.ts` | 自定义（两串 → 校验 → 可选入库 → 开局） | 难度页·自定义 | 同上 |
| `game/useCreateFlow.ts` / `useEditFlow.ts` | 出题 / 编辑（标题、POST / PATCH、跳转） | 出题页 / 编辑页 | 只留各自不同点，其余交给 `usePuzzleStage` |
| `solve/useSolveFlow.ts` | 求解页（两种输入、校验、Worker 多解、逐解浏览、两块盘各自的 zoom） | 求解页 | 输入态 + 结果态都只属于这一页 |
| `puzzle/useSearchPuzzle.ts` | 搜索：输入分流（pid → uid → 模糊）+ 预览 + 挑战 | 搜索页 | `useListQuery` 只给条件，业务分流在这 |
| `puzzle/useMyPuzzles.ts` | 我的题目：列表 + `withDetail(rowId, run, failText)`（取 pid → 改 → 清缓存 → 重拉） | 我的题目页 | 四种行内操作共用同一套"取详情-改-刷新" |
| `puzzle/usePuzzleDetail.ts` | 详情（落地页 / 挑战） | 落地页 / 搜索页 | 一次取全题面 + 答案 |
| `puzzle/metaText.ts` | 元信息行文案拼接（时间格式全站唯一一处） | 列表项 / 详情 | 纯文本拼装，不是 composable（登记例外 E8） |

**通用形态**：composable 暴露「一堆 `ref`/`computed` + 一组 `actions/Action[]`」，页面只做"绑定 + 渲染"，页面的 `const` 声明因此能压在 10 个以内（R6）。

---

## 8. 三个适配器（唯一允许碰外界的层）

### 8.1 `services/` —— HTTP / 本地存储 / Worker

**`api/client.ts`（所有请求的唯一出口）**

```ts
request<T>(path, { method='GET', body, auth=true }): Promise<T>
  · headers：有 body 就 content-type: json；auth 时带 Authorization: Bearer <token>
  · fetch(`/api${path}`)                     ← 前缀只有一个地方拼（vite 代理到 8788）
  · 204 → 返回 undefined
  · 401 → notifyUnauthorized()（clearToken + 通知订阅者）**然后照常抛 ApiError**
  · content-type 不含 json → 抛「接口不存在或服务异常」（避免 Unexpected token '<'）
  · !res.ok → 抛 ApiError(status, 后端 error 文案 ?? `请求失败（status）`)
export class ApiError extends Error { status }   ← 上层可区分 401 / 403 / 404 / 429
export const onUnauthorized = cb => …            ← stores/user 订阅（services 不反向依赖 stores）
```

**`api/session.ts`**：`token` 与 `lastUid` 的读写清（键名在 `services/prefs.ts`，统一 `sudoku.` 前缀 → `sudoku.token` / `sudoku.lastUid`）。
**`api/userApi.ts`**：`register` / `login` / `logout` / `me` / `updateMe`（薄封装，`auth:false` 用于注册登录）。
**`api/puzzleApi.ts`**：11 个端点的封装 —— `search`（`?keyword|uid&sort&limit&offset`）、`listMine`（`?mine=1`）、`getOne(pid)`、`getMine(rowId)`、`create`、`update(patch)`、`remove`、`play`。**分页大小与 offset 都来自 `LIST_PAGE_SIZE` 与 `core/page.offsetOf`**（前端不手写算式）。

**`prefs.ts`**：`readPref / writePref / clearPref`（`localStorage`，自动补 `sudoku.` 前缀；键名常量在 `constants/puzzle.ts`）。

**`sudoku/worker.ts` + `workerClient.ts`（生成与多解）**

```ts
types/worker.ts
  WorkerRequest = { kind:'generate'; boxSize; blanks } | { kind:'solve'; board: NumBoard; maxSolutions }
  GenerateResponse = { ok:true; result: PuzzleData } | { ok:false; error }
  SolveResponse    = { ok:true; result: NumBoard[] } | { ok:false; error }

worker.ts（Worker 线程内）：
  按 kind 派活 → core/sudoku/generator.generatePuzzle(...) 或 core/sudoku/multiSolver.solvePuzzleMulti(...)
  随机由这里注入（Math.random）—— services 层才允许碰宿主
  无解 → { ok:false, error: '这盘无解' }；异常 → { ok:false, error: err.message }

workerClient.ts：
  runInWorker<Res>(req, timeoutMs, timeoutCopy, failCopy)   ← 生成/多解共用同一套通道
     · 每次 new Worker + 拿到结果/失败就 terminate（不复用 → 不带上次状态）
     · 超时 / onerror / 回包失败 都只结算一次
  generateInWorker(B, blanks, DEFAULT_TIMEOUT=15s) → Promise<PuzzleData>
  solveMultiInWorker(board, max, SOLVE_TIMEOUT=30s) → Promise<NumBoard[]>
```

**为什么 Worker 协议要判别式**：`kind` 让一个 Worker 文件服务两种重活，且主线程侧的响应类型是窄的（`PuzzleData` vs `NumBoard[]`），不用 `any`。

### 8.2 `render/board.ts` —— 唯一碰 canvas

```
measureContentWidth(parent)          量"内容宽"（clientWidth − 左右 padding）；只在 ResizeObserver/首帧调
setupCanvas(canvas, size, zoom, w?)  dpr = devicePixelRatio；CSS 边长 = boardSideOf(w, zoom)
                                     canvas.width/height = round(side × dpr)（高清屏不糊）
                                     ctx.setTransform(dpr,0,0,dpr,0,0)（之后按 CSS 像素画）
renderBoard(canvas, params, w?)      逐格：底色（冲突格浅红）→ 数字（given 粗体黑 / player 常规蓝）→ 选中框
                                     → 细线（跳过宫线）→ 粗线（每 B 格）
getClickPos(canvas, e, size)         rect → 相对坐标 → core/board/metrics.offsetToCell → Position | null
```

- **为什么 canvas 而不是 DOM 表格**：最大 100×100 = 10000 格，DOM 会同时创建上万个节点；canvas 一次绘制，缩放只改 `style.width/height`。
- **为什么宽度只测一次**：`composables/board/useBoardCanvas` 用 `ResizeObserver` 把宽度写进一个 `ref`，重绘路径不再读布局（避免每次落子触发强制 reflow，登记 E6）。
- `BoardView.vue` 的角色：`interactive=false` → **纯 canvas 不接任何事件**（只读预览）；可玩才接 `@click` → `cell-click`；`zoomActions` 贴棋盘上方居中（不进操作条）。

### 8.3 `functions/` —— 唯一碰 D1（Cloudflare Pages Functions）

```
_middleware.ts         全局兜底：未捕获异常 → fail(msg, 500)（前端 client 只解析 JSON）
types.ts               Env = { DB: D1Database }
utils/json.ts          json(data, status=200) · fail(error, status=400)      ← 统一响应
utils/auth.ts          AUTH_ITERATIONS=10000 · SESSION_TTL=7 天 · MAX_FAILS=5 · LOCK_MS=10 分钟
                       makeSalt/makeToken（crypto 随机）· hashPassword（PBKDF2-SHA256）
                       safeEqual（恒定时间比较）· requireUser(request, env) → {uid,uname} | Response(401)
utils/id.ts            BASE62 + makeId（拒绝采样，无取模偏差）· makeUid/makePid(20 位) · makeRowId(8 位)
                       makeUniqueId(gen, exists)（命中就重生成，最多 5 次）
utils/puzzle.ts        checkPuzzle(puzzleText, solutionText) → {puzzleText, solutionText, sideS, blanks} | Response
                       复用 core：parsePuzzle → 同尺寸 → isBlankRatioOk(40%~65%) → hasEmptyGroup → validatePuzzle
utils/user.ts          toPublicUser(uid, uname)
api/register.ts        POST   注册（uname 2~16 复校 + 密码≥8 → PBKDF2 → 生成唯一 uid → 建 session）
api/login.ts           POST   登录（uid 限流：连败 5 次锁 10 分钟；错误统一「账号 ID 或密码错误」）
api/logout.ts          POST   删 session
api/me.ts              GET/PATCH  恢复登录态 / 改显示名
api/puzzles/index.ts   GET    列表（公开搜索 / ?mine=1 我的题目）· POST 新建（makePid+makeRowId+算 blankCount）
api/puzzles/[pid].ts   GET    详情（三态判定；private 非作者 404；答案按 show_solution 或作者）
                       PATCH  局部更新（改题面/答案时**成对复校** + 重算 blank_count，**不改 created_at**）
                       DELETE 硬删（连带清 puzzle_play）
api/puzzles/mine/[rowId].ts  GET 作者态详情（pid + 题面 + 答案 + 状态）
api/puzzles/[pid]/play.ts    POST 热度 +1（puzzle_play 的 (pid,uid) 唯一 + 1 小时窗口；作者本人不计）
```

**每个接口文件的四步铁律**：校验参数 → 调 core（同一份规则）→ 读写 D1 → 用 `utils/json` 统一响应；列表类接口统一回 `{ items, total }`。

---

## 9. 约定 / 守卫 / 命令（照做就不会破坏架构）

### 9.1 守卫 `scripts/check-arch.mjs`（`pnpm guard`，违规 exit 1）

| 规则 | 机器查什么（一句话） |
|---|---|
| R1 | `src/` 顶层目录白名单 |
| R2 | 依赖矩阵（逐 import 校验 src + functions；外部包白名单；全局禁 `axios`） |
| R3 | core 纯度：宿主 / `new Worker` / `Math.random`·`Date` / `console.` |
| R4 | `stores/` 禁 `for (` · `.forEach(` · `Math.` + 禁 `vue-router` |
| R5 | `components/` 禁 `@/stores`、禁 `vue-router`（含 `RouterLink`） |
| R6 | 页面声明 ≤ 10 + 禁 `Math.` |
| R7 | `composables/` 禁 `Math.` |
| R8 | `constants/` 导出名 `UPPER_SNAKE_CASE` + `composables/**` 文件名必须 `use*` |
| R9 | 单文件 ≤ 200 行（不含结尾换行）· core 单文件导出 2~8 · core 单函数模块 ≥ 50 行 |
| R10 | `types/` 死类型（导出必须 ≥2 处使用）· 禁 `Omit/Pick/Partial` 派生 · `constants/` 不许放类型 |
| R11 | core **可测性**：不许模块级可变状态（顶层 `let` / `Map` / `Set`）——**不查测试、不跑测试** |
| R12 | 禁桶文件（`export * from`） |
| R13 | `types/` 是叶子（只许 types / constants） |
| R14 | `.vue` 里出现 `BoardView` → 必须有 `useZoom(` / `useBoardZoom(` / `:zoom-actions=` |
| R15 | 状态归位 —— **评审**（脚本查不了） |

**例外登记（E1~E8，写在 `ARCHITECTURE.md` §五）**：E1 `rules.ts` 的 `getSudoku` 记忆化缓存（同时是 R11 的例外）· E2 `render/board.ts` 读 `devicePixelRatio`（canvas 适配器）· E3 `GameStore` 类型留在 store（types 是叶子）· E4 预留类型登记 · E5 预览遮罩自己的 zoom 不算违反 R7 · E6 容器宽度单点测量 · E7 `tracker.place` 返回撤销闭包 · E8 `metaText.ts` 不是 composable（R8 文件名例外）。

### 9.2 命令

```bash
pnpm dev                  # 前端（vite，/api 代理到 8788）
pnpm guard                # 架构守卫（红规则）
pnpm typecheck            # vue-tsc 查 src/
pnpm typecheck:functions  # tsc 查 functions/
pnpm build                # vue-tsc -b && tsc(functions) && vite build（**不含 guard**，guard 单独跑）
pnpm format               # prettier（src/**/*.{ts,vue,css}）
# 后端本地联调（6B 起）
npx wrangler types                                    # 生成 worker-configuration.d.ts
npx wrangler d1 create sudoku-db                      # 拿真实 UUID 填 wrangler.toml
npx wrangler d1 execute sudoku-db --local  --file=schema.sql
npx wrangler d1 execute sudoku-db --remote --file=schema.sql   # 部署前必做
npx wrangler pages dev --port 8788                    # 后端 + 本地 D1
```

**改动顺序铁律**（`ARCHITECTURE.md` 开头也写了）：**先改文档的矩阵/规则 → 再改守卫的 `MATRIX` / 预算常量 → 再改代码**。

## 10. 关键决策与踩过的坑（为什么现在长这样）

1. **挖空比例 40%~65%**（`BLANK_RATIO`）：三条逻辑（常量 / 挖空器 / 后端 `isBlankRatioOk`）加上用户可见文案 `RATIO_COPY.bad` 必须**同值** —— 曾经出现"常量 65、文案 70"的自相矛盾（文案说的 70% 根本拖不到）。
2. **`PagerBar` 的 0 基/1 基**：末页「下一页」与滑条末端曾被"吃掉" —— 上界写成了 `next >= pageCount`（那是**步骤条**的 0 基写法）。现在 `go()` 统一收口：页 1..pageCount / 步 0..pageCount-1，越界或原地不动**不发事件**。
3. **默认缩放必须跟着盘面大小**：`useZoom(defaultZoomOf(B))` 只在 setup 求值一次，而 `resetZoom()` 复位的正是那个旧值 → 出题页切到 B=6 仍是 1.25；落地页 setup 时 `B=0` → 全程 1×。现在统一用 **`useBoardZoom(() => B)`**（内部 `watch` 尺寸变化自动复位），默认值收成 `BOARD_ZOOM.default` **字典**（键 = B）。
4. **生成题面不需要唯一解**（需求明文：「**不检查唯一解。**」）：所以 `digger` **不做**解的计数 —— 那要"每挖一格跑一次完整搜索"（数到第 2 个解才停），大棋盘直接超时；**多解是允许的** → "题目求解"的多解浏览因此真有用。**连带约束（容易漏）**：判胜必须是 `isSolved = isFull && !hasConflict`，**不能**写成"和答案相同" —— 否则多解题里玩家填出另一个合法解，会被判"没完成"（永远通不了关）。真要做"唯一解题面"，得在挖空时逐格试算（慢很多），那是另一个决策。
5. **导出的题面不含玩家填数**：`givenBoard` 只看 `lock`（§3 的经验）；顺带保证"分享出去的是原题"。
6. **导出按钮只在系统生成的盘出现**：`GAME_ORIGIN`（system/custom/challenge）＋ `startGame` 的**必填**第 4 参 → 新增开局入口时 TS 会强制你交代来源，不会"忘了传就默认能导出"。
7. **"手选题面"的两条规则只对手选生效**：比例 40%~65%、禁整行/列/宫全空 —— 只对出题 / 编辑 / 自定义的**提交**校验；系统生成不校验（挖空器本来就会每行/列/宫留数）。
8. **B 支持 2~10**（下拉 `BOX_SIZE_OPTIONS`，最大 100×100 = 10000 格）：因此**粘贴上限必须按 100×100 算** —— `CUSTOM_TEXT_MAX = 20000`（早期 4000 只够 B=6，大棋盘串会被 textarea 截断），数字个数提示也要列到 `…/2401/4096/6561/10000`。
9. **Worker 必须"一次性 + 判别式协议"**：复用 Worker 会带上一次的状态；`kind` 让生成/多解的请求与响应类型都是窄的。超时：生成 15s / 求解 30s。
10. **monorepo 陷阱（搬家后最容易被吓到）**：`pnpm-workspace.yaml` 在 `学习资料/vue3`；**lockfile 与 `node_modules` 只在仓库根**；所以包内没有 `pnpm-lock.yaml` / `.modules.yaml`、`.bin/*.CMD` 指向根的 `.pnpm` —— **这些都是正常布局，不是文件丢失**。
11. **文档会腐烂，数值最先烂**：B 范围 / 挖空比例 / 超时 / `build` 是否含 guard 这类"事实型数字"最容易和代码脱节。对策：改完代码按 §11 三处同步；必要时用机器审计（见下）。

## 11. 改需求的正确顺序 + 自检清单

**顺序**（跳步最容易产生"文档说的和代码不一样"）：

1. `REQUIREMENTS.md`：写清"要什么 + 验收标准"（加一条 FR 或一条决策记录）
2. `ARCHITECTURE.md`：判断是否触碰硬约束（矩阵/规则/预算/例外）——**碰了就先改文档**，再改守卫，最后改代码
3. `scripts/check-arch.mjs`：能机器查的新规则就加进去（并同步 §四 表格）
4. `types/` `constants/`：先定形状与文案（值进 constants，类型进 types）
5. `core/`：纯函数（先想"怎么用手写脚本验证它"）
6. `services/` `stores/`：数据来源与"记住什么"
7. `composables/`：编排（ref/watch/router/异步）
8. `components/` `pages/`：最后接线
9. 文档三处同步 + 本文件（若流程/结构/决策有变）

**自检清单**

```bash
pnpm guard && pnpm typecheck && pnpm typecheck:functions && pnpm build   # 四道门禁
```

- 改了 `core` → 用手写脚本跑一遍（例：`cat > tmp.ts` 断言 → `node ../node_modules/.pnpm/node_modules/esbuild/bin/esbuild tmp.ts --bundle --platform=node --format=esm --outfile=tmp.mjs` → `node tmp.mjs` → 删临时文件）。
- 改了页面/组件 → 检查 R6（声明 ≤10）、R14（有棋盘必有缩放）、R5（组件不碰 store）。
- 改了文案/常量 → 用 `grep` 全仓确认没有"同义不同值"的残留（例如 `40%~70%` 与 `40~70%` 是两种写法！）。
- 改了文档 → 用机器审计：把文档里 `` `xxx.ts` `` 的文件名与 `「…」` 引用的文案拿去和 `src` + `functions` 比对（本仓库用过这个办法，能一次抓出全部"引用错"）。

---

> **只记三件事**：
> ① **依赖只能向下**（core 最底、被前后端共用）→ 规则只有一份；
> ② **`NumBoard` 与 `Board` 的转换只在 `core/board/`**，判"是不是题面给的数"看 `lock`；
> ③ 改完代码跑 `pnpm guard && pnpm typecheck && pnpm typecheck:functions && pnpm build`，并让三份文档跟上。






