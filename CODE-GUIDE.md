# 数独 · 代码导读（CODE-GUIDE.md）

> **这份文档回答什么**：`pages` / `components` / `composables` / `stores` / `core` **各自是什么意思、为什么这么写**。
> **与其它文档的分工**：`PROJECT.md` 讲"项目怎么串起来"（框架 / 数据流 / 决策）· `REQUIREMENTS.md` 讲"要什么" · `ARCHITECTURE.md` 讲"硬约束（R1~R15）"· **本文讲"每一层为什么长这样"**，并且**先整体、再逐层往下**。
> **读法**：先看 §0 建立全局图 → 然后按依赖方向自下而上读：`core`（§1）→ `stores`（§2）→ `composables`（§3）→ 展示层 `pages` + `components`（§4）→ §5 用两条完整链条把各层串一遍 → §6 是"我该写哪一层"的决策树 + §7 反模式清单。
> **术语别混**（详见 §0.5）：`pages/` = **页面**（只接线）· `components/` = **组件**（只画）· `Pager*` = **分页器**（进度条/滑动条/步骤条）· `PAGE` = 路由名表 · `types/page.ts` 的 `Page` = 路由名**类型**。

---

## 0. 整体：五层其实是"一次交互的五个阶段"

### 0.1 一句话概括

**用户点一下 → 页面接住意图（pages）→ 画出界面（components）→ 决定何时算、算完去哪儿（composables）→ 把结果记成状态（stores）→ 算出新结果（core）。**

```
用户意图（点击 / 输入 / 路由变化）
        │
        ▼
┌─────────────────────────┐
│  pages      只接线        │  R6：声明 ≤ 10、禁 Math.；把 composable 给的数据喂给组件
└───────────┬─────────────┘
            │ props / v-bind
            ▼
┌─────────────────────────┐
│  components 画 + 抛事件    │  只管"长什么样"：props 进来、emit 出去，不做业务判断（R5）
└───────────┬─────────────┘
            │ emit / v-model
            ▼
┌─────────────────────────┐
│  composables 编排         │  ref / watch / onMounted / router / async 只在这里
│  （调 store、调 core、跳路由）│  页面逻辑的"大脑"，一页一个 flow
└───────────┬─────────────┘
            │ 调 action / 读派生
            ▼
┌─────────────────────────┐
│  stores      记住         │  跨页共享且需要"记住"的数据；只做"取值 → 调 core → 写回"
└───────────┬─────────────┘
            │ 调纯函数
            ▼
┌─────────────────────────┐
│  core        算           │  纯函数：入参定则输出定；不碰 vue / 宿主 / 随机 / 时间
└─────────────────────────┘
      ↑ 同一份 core 也被 Worker 与后端 functions 直接 import
```

### 0.2 同一件事在各层各自长什么样

以"**在游戏页点格子、按数字键填一个数**"为例：

| 层 | 它负责的那一小段 | 具体是什么代码 |
|---|---|---|
| `pages/GamePage.vue` | 接线：把 store 的派生 + composable 的动作喂给组件 | `boardParams = computed(() => ({ board, boxSize, selected, conflictMask, zoom }))`；`<BoardView v-bind="boardParams" @cell-click="gameStore.select" />` |
| `pages` 之外不写逻辑 | 页面里**没有** `await` / `watch` / `fetch` / 算式 | 那些都在 composable / store / core |
| `components` | 把"点击"变成"事件" | `BoardView` 的 `@click` → `getClickPos` → `emit('cell-click', [r,c])`；`NumberPad` → `emit('pick', n)` |
| `composables` | 接住事件、决定调哪个 action、给组件现成数据 | `useGameFlow` 把 `actions` 拼成操作条（提示/导出/答案/作弊） |
| `stores` | 记住"选中了哪格"和"盘面变了" | `select(pos)` 记 `selected`；`inputNum(n)` 改 `board[r][c].v` 并 `pushHistory()` |
| `core` | 真正"算"的部分 | `sudoku.findConflicts(numBoard)` 算冲突掩码、`isSolved` 算胜负、`cloneBoard` 做快照 |

**关键**：这几层里**只有 core 是"可复现的计算"**，上面各层都是"把计算接到界面与时间轴上"。所以：

- 要**验证**规则 → 只测 core（不需要浏览器、不需要 Vue）；
- 要**改**规则 → 只改 core（前端即时校验与后端复校同时生效）。

### 0.3 为什么必须分层（四个真实痛点）

| 如果合并会怎样 | 本项目的做法 |
|---|---|
| 规则写进组件 → 后端复校要重写一遍，两边一旦不一致就是"前端说合法、后端拒绝" | 规则只在 `core/`，`functions/utils/puzzle.ts` 直接 import 同一份 |
| 业务状态塞进组件/页面 → 换页面就丢（比如"挑战"要从搜索页把题带到游戏页） | 需要跨页记住的进 `stores/`（game / puzzle / user） |
| 副作用（watch / onMounted / router / await）塞进 store 或页面 → store 离不开路由、页面膨胀 | 全部放 `composables/`（R4：store 禁 `vue-router`；R6：页面声明 ≤10） |
| 组件自己读 store / 跳路由 → 组件不可复用、不能"只画一块只读棋盘" | R5：组件不碰 store / router；数据与闭包由 composable 给，组件只 `props` 进、`emit` 出 |

### 0.4 依赖方向（唯一一条铁律）

```
pages → components → composables → stores → services → core → constants / types
                       ↘ render ↗        （render 是"画"的适配器，只被 composables 用）
functions（后端）→ core → constants / types
Worker（services/sudoku/worker.ts）→ core
```

- **只许向下、不许回头**：core 不知道上面任何一层；`types/` 是叶子（只认识 types/constants）；**页面在组件之上**（页面可以 import 组件，组件不能 import 页面）。
- 守卫 `R2` 逐 import 校验这张表 —— 违反就 `pnpm guard` 报错，不靠自觉。
- **为什么值得**：① 规则只有一份；② 核心逻辑脱离框架可验证；③ 换渲染 / 换后端不碰 core；④ 新人（和半年后的自己）看目录就知道代码该在哪。

> 口径说明：`ARCHITECTURE.md §一` 把 `components/ pages/` 合称**展示层**（一行两目录）；本文按职责把它们拆成两节来讲 ——
> **`pages/` 接线**（R6）与 **`components/` 画**（R5）。守卫的检查也是分开的：R6 只管页面、R5 只管组件。

### 0.5 术语澄清（这四个词最容易混）

| 词 | 是什么 | 在哪 | 别混成 |
|---|---|---|---|
| `pages/` | **页面**：路由的落点，只接线（R6：声明 ≤ 10、禁 `Math.`） | `src/pages/*.vue`（含 `difficulty/SystemPage` · `difficulty/CustomPage`） | 不是"分页" |
| `components/` | **组件**：可复用的"画"，props 进 / emit 出（R5） | `src/components/*.vue` | 不是页面（组件不许跳路由） |
| `Pager*` | **分页器**（"pager"）：`PagerBar`（一分支一形态）+ `PagerSliderView`（滑动条）+ `PagerStepsView`（步骤条） | `src/components/Pager*.vue` | 不是页面（它只画"第几页/第几步"） |
| `PAGE` | **路由名表**：`PAGE.Home` / `PAGE.Game` … 与 `router/index.ts` 的 `name` 一一对应 | `src/constants/pages.ts` | 不是类型 |
| `Page` | **路由名类型**（`Page = typeof PAGE[keyof typeof PAGE]`），供 `Menu.routeName` 等约束取值 | `src/types/page.ts` | 不是组件/页面本身 |

一句话：**`pages/` 是页面，`components/` 是组件，`Pager*` 是分页器，`PAGE`/`Page` 是路由名的值与类型。**


---

## 1. `core/` —— "算"：为什么必须是纯函数

### 1.1 "纯函数"在这里的确切意思

两条：**① 同样入参必得同样输出；② 不产生函数外的可观察影响**（不改外部变量、不写 DOM、不发请求、不读时间/随机）。

为什么它是第一原则：

- **可复现**：任何一次生成/求解都能用固定 `rng` 复现 → 出问题能"录下来重放"。
- **可共用**：同一份代码被 3 个执行环境 import —— 浏览器主线程、Web Worker、Cloudflare Workers（后端）。
- **可验证**：不用起浏览器、不用装测试框架，把 core 打成 mjs 用 `node` 跑断言就够了（本仓库一直这么干）。

### 1.2 命名就是契约（R8 的语义部分）

| 前缀 | 含义 | 例子 |
|---|---|---|
| `xxxOf` | 由某个值算出另一个值（单向换算） | `boxSizeOf(S)` · `cellCountOf(B)` · `blankCountOf(B, ratio)` · `pageCountOf(total, size)` · `offsetOf(page, size)` · `defaultZoomOf(B)` |
| `is` / `has` / `can` | 判断（返回 boolean） | `isBlankRatioOk` · `isBlankBoard` · `isSolved` · `hasConflict` · `hasEmptyGroup` · `canZoomInFrom` |
| `get` | 取一个已经存在的东西（可能有缓存） | `getSudoku(B)`（记忆化）· `getCandidates` · `getClickPos` |
| `make` / `create` / `generate` | 造一个新的 | `makeGrid` · `makeCell` · `createSudoku` · `generateSolution` · `generatePuzzle` |
| `parse` / `xxxToStr` | 串 ↔ 结构 | `parsePuzzle` · `parseNumBoard` · `boardToStr` |
| `clone` | 深拷贝，不共享引用 | `cloneBoard`（历史快照必须用它） |
| `use` | 组合式（只出现在 composables） | `useZoom` · `useGameFlow` |

**为什么较真命名**：这些词自带"要不要 await、会不会改入参、是不是每次结果一样"的信息。比如看到 `isBlankBoard(grid)` 就知道它不改入参；看到 `getSudoku(B)` 就知道它可能走缓存（E1）。

### 1.3 随机与时间必须"注入"，不能自己拿（R3）

```ts
// types/rng.ts
export type Rng = () => number

// core/array.ts
export const shuffle = <T>(arr: T[], rng: Rng): void => { /* Fisher–Yates，每步 rng() */ }

// core/sudoku/generator.ts
export const generatePuzzle = (boxSize: number, blanks: number, rng: Rng): PuzzleData
```

- **禁止**：core 里出现 `Math.random()` / `Date.now()` / `new Date()`（守卫 R3 直接报）。
- **谁注入**：`services/sudoku/worker.ts` 传 `Math.random`（services 层才允许碰宿主）；测试脚本里传固定序列。
- **收益**：同一把 `rng` → 同一道题；"这盘怎么生成的？"可以原样重放。这是"可测"的前提（R11 的另一半见 §1.8）。

### 1.4 数据转换只允许在 core（`NumBoard` ↔ `Board`）

`fromPuzzle` / `toNum` / `givenBoard` / `lockGiven` / `applySolution` / `cloneBoard` 全部集中在 `core/board/`。
**为什么**：`lock`（"这格是不是题面给的"）是全局语义 —— 如果各处自己 `map` 一遍，迟早出现"某处忘了带 lock"导致导出把玩家的数也导出去、或只读盘还能点。**转换只有一处，语义只有一个出处。**

### 1.5 文案与校验为什么也在 core（`message.ts`）

前端即时校验、后端复校、自定义/出题/编辑三处提交，需要的都是**同一条规则 + 同一句文案**：

```ts
errorTextOf(err, fallback)              // 全站 11 处"错误兜底"
blankRatioErrorOf(blanks, B)            // 40%~65% 文案（含"当前 xx%"，所以要按入参拼装）
puzzleSubmitErrorOf(numBoard, B, sudoku) // 提交顺序：全空 → 空行/列/宫 → 冲突 → 比例
```

分工口诀：**纯静态文案 → `constants/`；要按入参拼装的文案 / 规则 → `core/`**。

### 1.6 一个 core 文件的写法（逐步模板）

```ts
import type { NumBoard } from '../../types/board'      // ① types 用 import type
import { BLANK_RATIO } from '../../constants/game'      // ② 值来自 constants
// ③ 不 import 上层（vue / stores / services / composables 一律禁止）

const EPS = 1e-9                                        // ④ 文件私有常量（如浮点容差）

const helper = (x: number): number => x * 2             // ⑤ 私有小函数（不导出）

/** 一句话说清"算什么" */                                  // ⑥ 每个导出都有 JSDoc
export const fooOf = (n: number): number => helper(n) + EPS   // ⑦ 2~8 个导出；单函数模块 ≥50 行
```

规模红线（R9，守卫会查）：**单文件 ≤ 200 行** · **每文件导出 2~8 个**（只有一个导出时该模块要 ≥50 行）· 需要 9 个导出 → 拆文件（例：`board/model.ts`（模型）＋ `board/ops.ts`（操作）；`sudoku/generate.ts` 407 行 → 拆成 `generator` / `digger` / `solver` / `multiSolver`）。

### 1.7 `core` 的边界：什么时候**不**该进来

| 需求 | 去哪 | 判据 |
|---|---|---|
| 要"记住"（跨调用/跨页保持） | `stores/` | 需要活过这一次函数调用 |
| 要"时机"（watch / 生命周期 / 防抖 / await） | `composables/` | 需要知道"什么时候发生" |
| 要"取"（HTTP / localStorage / Worker） | `services/` | 需要外部世界 |
| 要"画"（canvas / DOM / 像素） | `render/` `components/` | 需要屏幕 |
| 剩下那些"喂参数就对"的计算 | **`core/`** | **拿到 node 里只喂参数能跑出确定结果 → core** |

### 1.8 反例对照（本项目真实的取舍）

| 错误写法 | 为什么不行 | 本项目的做法 |
|---|---|---|
| 纯函数里 `fetch` / `localStorage` | 违反 R3（core 不许碰宿主），且无法在 Worker/后端复用 | 由 `services/` 取好，作为参数传进 core |
| core 里 `console.log` 调试 | R3 明令禁止（Worker / 后端日志会脏；且"纯"就破了） | 返回结果，让调用方决定怎么记录 |
| core 里放模块级 `Map` 缓存 | R11：用例会互相串味（状态跨调用泄漏） | 能不放就不放；确有必要的（`rules.ts` 的 `getSudoku`）**登记例外 E1** |
| 一个 core 文件写 400 行 | R9（`generate.ts` 曾是 407 行） | 按"角色"拆：生成器 / 挖空器 / 求解器 / 多解器，并让单解与多解**共用一份引擎** |
| core 里 `import { ref } from 'vue'` | R2 + R3 双违规 | 有状态的东西是 composable，不是 core |

---

## 2. `stores/` —— "记"：什么数据才配进 store

### 2.0 一句话

**store 不是"所有状态"，而是"需要活过这次渲染、并且跨页/跨组件共享的那部分状态"。**

### 2.1 判据：三个问题

1. 换页面 / 换组件之后还需要它吗？（棋局要，遮罩开关不要）
2. 有多个地方读写它吗？（顶栏要读登录态，登录页要写 → 进 store）
3. 刷新后能从别处恢复吗？（能从 URL 恢复的 → 放 URL；能从 localStorage 恢复的 → 放本地偏好）

本项目的三个 store（正好对应三件事）：

| store | 记的是 | 不记的 |
|---|---|---|
| `stores/game.ts` | 当前这一盘：配置 / 模式 / 来源 / 盘面 / 选中 / 历史 / 答案 / 来源信息 | 求解页的解列表（页级）、遮罩开关（页级） |
| `stores/puzzle.ts` | 列表数据（搜索结果 / 我的题目）+ `rowId → 详情` 缓存 + 一次轻提示 | 查询条件（在 URL 里） |
| `stores/user.ts` | 登录态 `profile` | token 本身（在 `services/api/session` → localStorage） |

### 2.2 为什么用 Pinia 的 setup 风格

```ts
export const useGameStore = defineStore('gameStore', () => {
    const board = ref<Board>([])                        // 状态
    const numBoard = computed(() => toNum(board.value))  // 派生
    const select = (pos: Position): void => { /* … */ }  // 动作
    return { board, numBoard, select }                   // ← 只有 return 出去的才是"公开 API"
})
```

- 与 composable **同构**（都是 `ref/computed/函数`）：**写 store 和写 composable 是同一种手感**。
- `return` 就是边界：没 return 的 `resetHistory` / `pushHistory` 外部拿不到 —— 状态只能通过有限入口变化。

### 2.3 三条铁律（R4，守卫会查）

> **stores 只做「取值 → 调 core 的纯函数 → 写回」；禁 `for (` / `.forEach(` / `Math.`；禁 `vue-router`。**

```ts
// ✅ 本项目：算法在 core，store 只是"接线"
const isWin = computed(() => mode.value === GAME_MODE.Game && sudoku.value.isSolved(numBoard.value))
const status = computed(() => statusOf(!!board.value.length, isWin.value))        // statusOf 在 core/game/derive
const conflictMask = computed(() =>
    numBoard.value.length ? sudoku.value.findConflicts(numBoard.value) : sudoku.value.makeEmptyMask())

// ❌ 反例：在 store 里自己扫盘面算冲突
// for (let r = 0; …) for (let c = 0; …) if (…) → 算法必须下沉 core（否则前端算一遍、后端还得再写一遍）
```

**为什么禁 router**：store 要能"脱离路由"存在（否则测试 / Worker 都得先装一个 router）。跳转一律在 composable。

### 2.4 派生值一律用 `computed`（单一事实来源）

`stores/game.ts` 的依赖链是单向的：

```
config.boxSize ─getSudoku─▶ sudoku（B / S / 规则集合）
board ──toNum──▶ numBoard ──isSolved──▶ isWin ─┐
   │                  │                        └─▶ status（Idle / Playing / Won）
   │                  └─findConflicts─▶ conflictMask
   └─ selected ─▶ selectedCell（含 v / lock，供"提示"用）
```

- **只有 `board` 是真源**，其余全是算出来的 → 不可能出现"盘面变了但冲突标记没更新"。
- 页面因此可以"什么都不管"：落子只调 `inputNum`，红色标记与胜负判定自动跟着变。
- 反面教材：把 `numBoard` 也存成一份 `ref` 手动同步 —— 迟早漏一次。

### 2.5 动作要收成少数入口（入口即契约）

`stores/game.ts` 的全部动作（**这就是它能改状态的所有方式**）：

| 类别 | 动作 | 为什么这么设计 |
|---|---|---|
| 进入某种盘面 | `startCreate(B, puzzle?)` / `startSolve(B, puzzle?)`（共用内部 `startInput(mode, B, puzzle)`）、`startGame(puzzle, sol, cfg, from, source?)`、`startFromTexts(puzzleText, solutionText, blankCount, source?)` | 入口对应"来源"；`from: GameOrigin` **必填** → 新增开局入口时 TS 强制交代来源，不会"忘了传就默认能导出" |
| 玩法输入 | `select(pos)` / `inputNum(n)` | 只有这两个能改 `board`（`inputNum` 内含 `lock` / `status` 守卫与 `pushHistory`） |
| 历史 | `resetHistory()` / `pushHistory()` / `jump(step)` | 快照只在这里维护，页面永远不直接操作 `snapshots` |
| 工具 | `lockPuzzle()` / `getCandidates(pos)` / `cheat()` | 锁题 / 提示 / DEV 作弊 |

**为什么不让页面直接改 `board`**：状态一旦有"多条修改路径"，行为就无法推理（例如"改了但没进历史"）。**收窄入口 = 让状态变化可穷举。**

### 2.6 逐步：`stores/game.ts` 该怎么读（三段）

1. **state 段（`ref`）**：`config` / `mode` / `origin` / `board` / `selected` / `snapshots` / `currentStep` / `solution` / `meta`
   - 看点：`mode`（game / create / solve = 这块盘是干嘛的）与 `origin`（system / custom / challenge = 从哪来的）是**两件不同的事**，别混。
2. **computed 段**：`sudoku → numBoard → isWin → status` + `conflictMask` / `selectedCell`（见 §2.4 链）
   - 看点：每个派生都**只调 core 的纯函数**，没有一处自己写循环。
3. **动作段**：进入（`startXxx`）→ 输入（`select` / `inputNum`）→ 历史（`resetHistory` / `pushHistory` / `jump`）→ 工具（`lockPuzzle` / `cheat` / `getCandidates`）
   - 看点：`startInput` 是"一份实现两个薄入口"的去重；`startFromTexts` 把"挑战"的解析+开局收成一处。

### 2.7 什么时候**不**该放 store（本项目的真实分配）

| 数据 | 放哪 | 为什么 |
|---|---|---|
| 求解页的解列表 `solutions` / 当前解号 `solutionIndex` | `useSolveFlow` 内的 `ref` | 只属于那一页；离开就该没了（否则下次进来看到上次的解，会误导） |
| 遮罩开关（`answerOpen` / `previewOpen` / `exportOpen`） | 各自的 composable | 纯 UI 过程状态；放 store 会"跨页污染"（回游戏页发现遮罩还开着） |
| 列表条件（`q` / `sort` / `page`） | **URL** | 可分享、可后退、刷新不丢（R15） |
| 浏览方式偏好（进度条 / 滑动条） | **本地偏好** `sudoku.pagerMode` | 纯 UI 偏好，不该污染 URL |
| 只读棋盘 / 预览的数据 | composable 现取 | 零副作用、用完即弃 |

### 2.8 反例对照

| 错误写法 | 为什么不行 | 正确做法 |
|---|---|---|
| store 里 `fetch` 并直接改 `board` | 数据来源与状态变化混在一起；Worker / 后端也要生成时就只能复制逻辑 | `services` 取数 → action 只负责"写回" |
| store 里存"算好的展示文案"（如 `metaText`） | 会与源数据不同步（改了标题文案没变） | 由组件 / composable 的 `computed` 现算（`metaTextOf`） |
| 两个 store 互相 import | 循环依赖、职责糊 | 由 composable 编排（谁需要谁调用） |
| store 里 `router.push` | R4 禁止（store 要能脱离路由） | composable 里跳转 |
| 把 `snapshots` 放到页面里 | 换页就丢；"重开 / 跳步"逻辑会散落各处 | 放 store 的动作里（`pushHistory` / `jump`） |

---

## 3. `composables/` —— "编排"：为什么需要这一层

### 3.0 一句话

**composable = 一段"有状态、有副作用、可复用"的逻辑** —— 用 `use*` 开头，返回**数据 + 动作**（不是模板、不是工具函数）。

### 3.1 `useXxx` 到底意味着什么

```ts
export const useSolveFlow = () => {
    const loading = ref(false)                       // 有状态
    onMounted(() => { … })                           // 有生命周期（若需要）
    watch(() => …, () => { … })                      // 有副作用时机
    const solve = async (): Promise<void> => { … }   // 有异步
    return { loading, solve }                        // ← 对外只给"数据 + 动作"
}
```

三条隐含约定：

1. **必须在 setup 上下文里调用**（页面顶层、或另一个 composable 内）—— 因为它可能用 `onMounted` / `watch` / `inject`。
2. **调用一次就产生一份独立状态** —— 所以"一页一份的实例"（如 `useZoom`）只在页面 setup 顶层调一次（R7）。
3. **它不返回 DOM、不返回组件** —— 页面拿它返回的数据去 `v-bind` / `v-for`。

### 3.2 为什么必须有这一层（store 与组件之间的"缺环"）

`watch` / `onMounted` / `router` / `await` 这些能力**既不能放 store**（R4：store 要能脱离路由存在），**也不能放组件**（R5：组件要"只画"）。所以中间必须有一层专门放它们。

反例：如果没有 composable，"点求解 → 转圈 → 叫 Worker → 出错写文案 → 成功后摆结果"这一整段只能塞进页面：

- 页面会立刻膨胀到 200+ 行（R9 上限），并且**这段逻辑无法被别处复用**（落地页/游戏页也想要"只读盘 + 缩放"时就得复制）。
- 副作用（转圈、清空旧结果、超时文案）散在模板与 `onMounted` 之间，改一处要翻三处。

### 3.3 本项目 composable 的三类

| 类型 | 特征 | 例子 |
|---|---|---|
| **页面流程**（一页一份） | 只服务一个页面；把该页的"状态 + 动作 + 遮罩数据"打包 | `useGameFlow` · `useCreateFlow` · `useEditFlow` · `useCustomFlow` · `useDifficultyFlow` · `useSolveFlow` · `useSearchPuzzle` · `useMyPuzzles` · `usePuzzleDetail` · `useAuth` |
| **通用能力**（跨页复用） | 不带业务，只解决一类问题 | `useListQuery`（URL ↔ 条件）· `useZoom` / `useBoardZoom`（缩放）· `useClipboard`（复制）· `usePuzzlePreview`（预览遮罩）· `usePuzzleExport`（导出遮罩）· `useBoardCanvas`（canvas 绑定与重绘） |
| **域助手（非 composable）** | 纯文本拼装，没有 ref / 生命周期 | `puzzle/metaText.ts` 的 `metaTextOf`（登记例外 E8：文件名不满足 `use*` 的原因就在这） |

### 3.4 形态约定（本项目统一写法）

```ts
export const useXxx = () => {
    const store = useGameStore()      // ① 顶层拿依赖（store / router / 别的 composable）
    const zoom = useBoardZoom(() => store.sudoku.B)

    const loading = ref(false)         // ② 状态用 ref
    const total = computed(() => …)    // ③ 派生用 computed（不存第二份）

    const doIt = async (): Promise<void> => { … }   // ④ 动作 = async function（错误统一 errorTextOf）

    return { loading, total, doIt }    // ⑤ 对外"数据 + 动作"；要按钮条就返回 Action[]
}
```

### 3.5 为什么"一页一个 flow"

页面因此只剩"接线"：

```vue
<!-- GamePage.vue 的 script 只有 7 个声明（R6 上限 10） -->
const gameStore = useGameStore()
const { zoom, zoomActions } = useBoardZoom(() => gameStore.config.boxSize)
const { tip, answerOpen, …, leadActions, trailActions, … } = useGameFlow()
const items = computed(() => [...leadActions.value, ...trailActions.value])
const stepLabel = (i: number) => `${i}步`
const infoText = computed(() => …)
const boardParams = computed<BoardRenderInput>(() => ({ … }))
```

页面里没有 `await`、没有 `watch`、没有错误兜底 → 出问题去 composable 找，规则问题去 core 找，**排查路径固定**。

### 3.6 逐步：把 `useSolveFlow` 拆开读（一个真实例子）

| 段 | 内容 | 为什么这么切 |
|---|---|---|
| ① 状态 | `inputMode` · `puzzleText` · `maxSolutions` · `solutions` · `solutionIndex` · `loading` · `error` | 全是"这一页的过程状态" → 只活在这里（不进 store，§2.7） |
| ② 两块缩放 | `inputZoom`（输入盘）· `resultZoom`（结果盘） | 两块盘尺寸相同但**视角独立**：调结果盘不会把输入盘也放大（对应 FR-14"各有各的缩放"）；换盘面时 `resetZoom(defaultZoomOf(B))` |
| ③ 校验 | `validate()`（全空 / `B > SOLVE_MAX_BOX_SIZE` / 有冲突） | 与 `solve()` 分开：**"该不该拦"和"怎么求解"是两件事**，将来别处也能单独复用校验 |
| ④ 输入 | `setInputMode` · `setBoxSize` · `clearBoard` · `applyText`（解析 + 回填 + 切到棋盘模式）· `selectCell` · `inputNum` | 每个动作对应**用户的一次明确意图**；`applyText` 成功就切模式，是因为"要去棋盘里看/改" |
| ⑤ 求解 | `solve()` = 本地校验 → `solveMultiInWorker` → 写 `solutions` → 复位 resultZoom；`resetResult()` 单独抽出 | `resetResult` 被 4 个入口（换尺寸/清空/回填/再求解）复用，抽出来才不会漏 |
| ⑥ 输出 | `boardInput` · `solutionInput` · `resultInfo` · `pagerInfo` · `stepLabel` · `inputZoomActions` / `resultZoomActions` | 输出全是"组件能直接 `v-bind` 的现成数据"（页面不许自己拼字符串/算式） |

### 3.7 composable 之间怎么复用（三种真实形态）

| 形态 | 例子 | 说明 |
|---|---|---|
| **跨页共用流程** | `usePuzzleStage` ← `useCreateFlow` / `useEditFlow` | 两页"题面 → 答案"流程逐字相同，抽出来各省 ≈20 行；各自只留标题 / 缩放 / POST / PATCH / 跳转 |
| **通用能力 + 参数注入** | `useListQuery({ routeName, load, pageCount })` ← 搜索页 / 我的题目 | 通用件不 import 具体 store；页面把"取数"和"页数"注入进来 |
| **薄包装** | `useZoom` → `useBoardZoom(boxSize)` | 底层只管"记住 zoom"，上层补"默认值跟着盘面大小 + 尺寸变了自动复位" |

### 3.8 边界与常见错误（R7 会查）

| 错误写法 | 为什么不行 | 正确做法 |
|---|---|---|
| composable 里写 `Math.`（如 `Math.round(p*100)`） | R7 禁（算式下沉 core）；同一算式前端/后端会各写一遍 | 用 core 的 `percentOf` / `clampPage` / `defaultZoomOf` |
| 在函数体里调 `useZoom()`（不是 setup 顶层） | 每次调用会**新建一份状态**，按钮控制的不是同一份 zoom | 一页一份：在 setup 顶层调一次，需要共享就 `return` 出去 |
| 把一个 composable 的 `ref` 当参数传给另一个 | 绕过单一事实来源，谁改的说不清 | 传 store 动作，或让上层 composable 组合两者 |
| composable 里 `import BoardView` / 操作 DOM | 它是"逻辑层"，不是"渲染层"（R2 也不允许） | 需要画的东西交给组件；DOM 只在 `render/` 与 `useBoardCanvas` |
| 错误文案自己拼 `'失败'` | 全站文案会散（曾有 11 处重复） | `errorTextOf(err, '兜底文案')`（`core/message`） |
| 页面/composable 里直接 `try { await fetch }` | 越层（R2）且 401 / 非 JSON 等分支会被漏掉 | 一律走 `services/api` 的封装 |

---

## 4. 展示层：`pages/` 接线 + `components/` 画

### 4.0 一句话 + 页面为什么必须最薄

**`pages/`（页面）只接线、`components/`（组件）只管画：组件 = props 进来、事件出去，不做业务判断。**

**`pages/` 才是"页面"** —— 路由的落点（`router/index.ts` 里每个 `component: () => import('@/pages/…')`）。它的职责只有一件：**把 composable / store 给的数据喂给组件，把组件抛出的事件转给动作**。

守卫 R6 对页面的三条硬要求：

| 要求 | 具体 | 为什么 |
|---|---|---|
| 声明（`const` / `function`）**≤ 10 个** | 逻辑一多就超出 → 逼你搬去 composable | 页面越薄，"这页在干什么"越一眼可见 |
| **禁 `Math.`** | 要显示算好的值 → 由 composable 暴露 | 算式只有一份（在 core），页面不会长出第二套算法 |
| 只许 import `pages/` `components/` `composables/` `stores/` `constants/` `types/` + `vue` `vue-router` | **不许 import `core/`、`services/`、`render/`** | 直接碰 core 会让"展示层不写算式"破功；直接碰 services 会绕过 401 与错误兜底 |

一个健康的页面长这样（`GamePage.vue` 的全部声明，7 个）：

```ts
const gameStore = useGameStore()                                             // ① 读 store
const { zoom, zoomActions } = useBoardZoom(() => gameStore.config.boxSize)    // ② 缩放（R14）
const { tip, answerOpen, …, leadActions, trailActions, … } = useGameFlow()    // ③ 流程
const items = computed(() => [...leadActions.value, ...trailActions.value])   // ④ 拼按钮条
const stepLabel = (i: number): string => `${i}步`                             // ⑤ 纯展示回调
const infoText = computed(() => …)                                            // ⑥ 信息行
const boardParams = computed<BoardRenderInput>(() => ({ … }))                 // ⑦ 渲染入参
```

**页面 vs 组件（最容易混的一对）**

| | `pages/` | `components/` |
|---|---|---|
| 是不是"页面" | ✅ 是（路由落点） | ❌ 不是（可复用的"画"） |
| 能用 `vue-router` 吗 | 能（`RouterLink` / `useRouter`） | **不能**（R5） |
| 能读 store 吗 | 能 | **不能**（R5） |
| 约束 | 声明 ≤ 10 个 / 禁 `Math.`（R6） | 无数量限制，但同样不该写算式 |
| 典型文件 | `GamePage` · `SolvePage` · `MyPuzzlesPage` · `difficulty/{SystemPage,CustomPage}` | `BoardView` · `Overlay` · `FormField` · `MyPuzzleRow` |

> 子页面也算页面：`pages/difficulty/SystemPage.vue` / `CustomPage.vue` 是难度壳（`DifficultyPage.vue`）的两个 Tab 页，同样受 R6 约束。

### 4.1 两条禁令（R5，守卫会查）

| 禁令 | 为什么 |
|---|---|
| 组件**不许** `import @/stores` | 组件要能在"没有 store 的场合"复用：同一个 `Overlay` 里塞只读棋盘、塞加载转圈、塞确认框；如果它自己去 store 取数，就没法被别的页面/别的数据源用 |
| 组件**不许** `vue-router`（含全局的 `RouterLink` / `RouterView`） | 路由属于 pages / composables；组件一旦跳转就绑死了"页面上下文"，不再可复用（守卫会单独报 R5） |

配套纪律：**组件也不写算式**（R6 的语义是"展示层不写算式"；守卫对 `pages` / `composables` 机器查 `Math.`，组件同样不该有）。需要"算好的值" → 由 composable 暴露。

### 4.2 "传数据 + 传渲染方式"：本项目的组件哲学

判据：**传数据 + 传渲染方式，组件按一张渲染表决定画什么** —— 既避免"上帝组件（一堆开关参数）"，也避免碎片化（拆成十几个只能看不能改的小件）。历史上组件因此从 31 个收到 **15 个**。

| 组件 | 接什么数据 | 用什么方式渲染 | 为什么合并 |
|---|---|---|---|
| `TextAction` | `text?` + `onClick?` | 可点 → `<button class="text-btn">`；不给 `onClick` → `<span>`（纯文本） | **全站唯一的"按钮"**：取消 `disabled` 字段（"禁用"= 不给点击函数），也取消了 4 种按钮变体 |
| `Flex` | `direction / gap / align / justify / wrap` | 一行或一列的 flex 容器 | 唯一布局件：各组件里那些 `display:flex; gap` 全部改用它 |
| `FormField` | `type`（`text`｜`textarea`｜`password`｜`select`｜`range`）+ `modelValue` + `options/min/max/step` | 按 `type` 选控件 | 一个组件吃掉一族输入（原来 6 个 Field 组件） |
| `Overlay` | `show / text? / desc? / shade? / spinning? / actions? / wide?` + 默认插槽 | 遮罩框：转圈 / 文案 / 按钮条 / 插槽内容 | **全站唯一遮罩**：加载中、确认删除、题目/答案预览、通关，全是它 + 不同数据 |
| `SecretValue` | `label` + `load: () => Promise<string \| null>` | 遮蔽 `pid ▮▮▮▮…`；👁 现取明文、📋 复制 | 遮蔽/明文/复制这套状态**收进组件自己**：`MyPuzzleRow`（pid）与账号区（uid）不用各写一遍 |
| `ListSection` | `items / loading / error / emptyText / keyOf? / bar / pager` + `#top` / `#empty` / `#item` 插槽 | 工具条 → 三态（加载/错误可重试/空）→ 列表 → 分页条 | 列表骨架只此一套；**条目渲染方式由页面用 `#item` 选**（私人列表 → `MyPuzzleRow`，公开列表 → `PuzzleCard`） |
| `PagerBar` | `page / pageCount / mode`（`bar`｜`slider`｜`steps`）+ `stepLabel? / infoText?` | 一分支一形态：进度条内联 / `PagerSliderView` / `PagerStepsView` | 分页与"历史步骤条"是**同一件事的两种数轴**（页 1 基、步 0 基），收在一个组件里才好统一处理边界 |

### 4.3 两类组件

| 类别 | 特征 | 例子 |
|---|---|---|
| **通用件** | 不认识业务数据，只认"形状"；可被任意页面用 | `TextAction` · `Flex` · `FormField` · `Overlay` · `SecretValue` · `ListSection` · `PagerBar` · `PagerSliderView` · `PagerStepsView` · `RenameText` · `EyeGlyph` · `NumberPad` |
| **业务件** | 认识业务数据形状，但**只接数据 + 闭包**，自己不做判断 | `MyPuzzleRow`（`item: MyPuzzle` + `controls: MyPuzzleRowControls`）· `PuzzleCard`（`item: SearchResult` + `emit preview/challenge`） |

`MyPuzzleRow` 是最好的例子：它拿到一个"控件闭包包"（`loadPid` / `onRenameCommit` / `onVisibility` / `onPreview` / `onChallenge` / …），点击时**只负责转调**；真正的"取 pid → PATCH → 清缓存 → 重拉"在 `useMyPuzzles` 里。所以组件可预览、可测试、不依赖 store。

### 4.4 `Action` 为什么存在（把"按钮条"数据化）

```ts
export interface Action { key: string; text: string; onClick?: () => void }
```

- 页面 / 组件只 `v-for` 渲染 `actions`，不关心有几个按钮、什么文案；
- **文案集中在 `constants`**（`MINE_COPY.edit` / `EXPORT_COPY.button` / `GAME_COPY…`）；
- **"不可用" = 不给 `onClick`** → 渲染成纯文本（不用 `disabled`，也就没有"灰按钮"缺口）；
- 条件拼装全部在 composable：`useGameFlow.trailActions` 就是"提示 +（只有系统生成才有的）导出 +（有答案才有的）答案 +（DEV 才有的）作弊"。

### 4.5 逐步：怎么读 `BoardView.vue`

```vue
props:  board / boxSize / selected? / conflictMask? / zoom? / interactive?（默认 true）/ zoomActions?
emits:  cell-click: [pos]
```

1. **只读 = 纯 canvas**：`interactive=false` 时 `v-on="{}"`（不绑 click）、不加手型样式 → 预览/答案/解题结果都用它，**零副作用**（不写 store、不改状态）。
2. **zoom 贴棋盘**：`zoomActions` 渲染在 `.board-scroll-container` **外面**的 `.board-zoom` 行（所以放大后横向滚动时，➖/➕ 不会跟着滚走，见 E2/E6 与决策 63）。
3. **canvas 的一切留在 `useBoardCanvas`**：绑定 canvas、随入参重绘、`ResizeObserver` 量宽度、把点击换算成行列 —— 这些是**副作用**，不属于"画"的职责；组件只给两个 `ref`（canvas 与滚动框）。
4. **渲染细节全在 `render/`（五文件、无状态）**：`geometry.ts` 算几何（纯）→ `paint.ts` 画一格（纯）→ `layer.ts` 给线层（纯工厂）→ `dirty.ts` 算脏格与决策（纯）→ `board.ts` 只留"适配 DOM + 调用绘制"；`devicePixelRatio` 处理高清屏。状态（快照 / 线层 / 上次边长）都在 `useBoardCanvas`。

### 4.6 什么时候该拆组件（体量判据）

| 信号 | 处理 |
|---|---|
| 同一段模板被两处用 | 抽成通用件（如 `PagerStepsView` 从游戏页历史条抽出来） |
| 一个组件既"取数据"又"画" | 把取数搬进 composable（组件只留 props/emits） |
| 组件 > ~150 行 | 看是不是"两个职责"（例：列表项 + 行内控件 → 控件闭包抽到 composable，行变短） |
| 参数越加越多（"上帝组件"苗头） | 改成"传数据 + 传渲染方式"（把开关收成一张渲染表） |
| 新组件说不清"接什么数据、怎么渲染" | 说明职责没定清楚，先别写 |

### 4.7 反例对照

| 错误写法 | 为什么不行 | 正确做法 |
|---|---|---|
| 组件里 `const store = useGameStore()` 并改 `board` | R5 直接违规；组件不再可复用（换个数据源就废） | props 进、emit 出；需要动作就传闭包（`controls`） |
| 组件里 `<RouterLink :to="…">` | R5：路由属于 pages / composables | 页面用 `RouterLink`，或组件 `emit('go')` 由页面跳转 |
| 组件里 `fetch` / `import @/services` | R2 矩阵不允许（components 只许 components/composables/constants/types + `vue`） | 数据由 composable 取好传进来 |
| 组件里 `import BoardView` 却没给缩放 | R14：有棋盘必须给缩放数据 | 传 `zoom` + `:zoom-actions`（数据来自 `useBoardZoom` / `usePuzzlePreview`） |
| 组件里存"业务缓存" | 组件会被销毁/重建，状态会丢；也没法和别处共享 | 放 store 或 composable |
| 组件里自己拼文案（`'删除'`、`'取消'`） | 文案会散落（历史上重复 11 处） | 从 `constants/*_COPY` 取 |
| **页面**里 `await` / `watch` / `onMounted` / 直接调 `services` | R6 + R2：页面要"只接线"；直接请求会绕过 401 与统一错误兜底 | 搬进 composable（`useXxxFlow`），页面只 `v-for` 渲染它给的 `actions` |
| **页面**里写 `Math.`（如自己算百分比/页数） | R6：算式只有一份（在 core） | 由 composable 暴露算好的值（`percentOf` / `pageCountOf` …） |

---

## 5. 一条完整链条（各层同时出现）

### 5.1 游戏页：点一格 → 填一个数 → 冲突变红 → 历史 +1

| 步 | 用户/浏览器 | component | composable | store | core |
|---|---|---|---|---|---|
| 1 | 点棋盘 | `BoardView` 的 `@click` → `useBoardCanvas.onCanvasClick` → `getClickPos` → `emit('cell-click', [r,c])` | | | `metrics.offsetToCell`（坐标 → 行列，越界返回 null） |
| 2 | | | （页面直接 `@cell-click="gameStore.select"`） | `select([r,c])` 只写 `selected` | |
| 3 | 点数字键 | `NumberPad` → `emit('pick', n)` | | `inputNum(n)`：查 `status`、查 `!cell.lock` → 写 `cell.v` → `pushHistory()` | `cloneBoard`（快照深拷贝） |
| 4 | 界面重绘 | `BoardView` 收到新 `props`（`board` / `conflictMask`） | | `computed`：`numBoard = toNum(board)` → `conflictMask = sudoku.findConflicts(numBoard)` | `toNum` / `findConflicts`（全在 core） |
| 5 | 胜负 | 通关遮罩 `Overlay` | `useGameFlow.winOverlay` 转成文案 | `isWin = sudoku.isSolved(numBoard)` → `status = statusOf(...)` | `isSolved`、`statusOf` |
| 6 | 发历史 | 历史步骤条 | 页面 `stepLabel` | `snapshots` / `currentStep` | |
| 7 | 拖步骤条 | `PagerBar(mode="steps")` → `emit('change', step)` | | `jump(step)` → `board = cloneBoard(snapshots[step])` | `cloneBoard` |

**注意每一列都在做"自己那一件事"**：组件只发事件、composable 只把现成数据交给组件、store 只改状态与历史、core 只算。**没有任何一列跨界。**

### 5.2 求解页：点「求解」

| 步 | component | composable | store | core / services |
|---|---|---|---|---|
| 1 | `SolvePage` 的「🧮 求解」`TextAction` | `useSolveFlow.solve()` | | |
| 2 | | 字符串模式先 `applyText()` → `parsePuzzle` → `store.startSolve(B, board)` | 切到 `mode=Solve`，写入 `board`（未锁） | `parsePuzzle`（core） |
| 3 | | `validate()`：全空 / `B > 6` / 有冲突 | 读 `numBoard` / `sudoku` | `isBlankBoard`、`sudoku.hasConflict`（core） |
| 4 | 转圈遮罩 | `loading = true` | | `solveMultiInWorker`（services → Worker → `solvePuzzleMulti`） |
| 5 | 只读棋盘 + 步骤条 | 写 `solutions` / `solutionIndex`，复位 `resultZoom` | （不写 store） | `PuzzleData`/`NumBoard[]` 从 Worker 回来 |
| 6 | 切解 | `PagerBar(mode="steps")` → `changeSolution(i)` | | |

**同一个模式**：`services` 负责"出去取/丢进 Worker"，`core` 负责"算"，`store` 负责"记住输入盘"，`composable` 负责"把结果摆好给组件"。所以"求解结果要不要进 store"这个问题的答案从结构上就定了：**它是页过程 → 不进**。

---

## 6. 速查：这段逻辑该写在哪一层？

| 我要做的事 | 写在哪 | 一句话理由 |
|---|---|---|
| 新规则（例如"题面不许有整行全空"） | `core/sudoku/rules.ts` + `core/message.ts`（文案） | 前后端都要用同一份 |
| 新的换算（如"总格数 → 挖空数"） | `core/`（`xxxOf`） | 纯计算，喂参数就对 |
| 新接口 | `functions/api/**` + `services/api/*` | 唯一碰 D1 的地方 + 前端唯一碰 fetch 的地方 |
| 新页面 | `pages/XxxPage.vue`（只接线）+ `composables/xxx/useXxxFlow.ts` | 页面 ≤10 声明（R6），逻辑进 composable |
| 新按钮 | `constants` 里的文案 + 在 composable 里拼 `Action` | 文案集中、"不可用"= 不给 `onClick` |
| 新列表 | `ListSection` + 页面用 `#item` 插槽 + `useListQuery` | 列表骨架与查询条件都已通用化 |
| 新遮罩 | 复用 `Overlay`（数据 + 插槽） | 全站唯一遮罩 |
| 新棋盘 | 复用 `BoardView` + `useBoardZoom`（R14） | 有棋盘必须给缩放 |
| 新的跨页数据 | `stores/`（先问 §2.1 三个问题） | 只有"要记住"的才进 |
| 新偏好开关 | `constants/puzzle.ts` 键名 + `services/prefs.ts` | 纯 UI 偏好放本地偏好 |
| 新的"什么时候发生" | `composables/`（`watch` / `onMounted`） | 副作用时机只在这一层 |

**决策树（遇到不确定时就问）**

```
它只是"把现成数据摆到页面上"吗？ ── 是 → pages（R6：只接线 · 声明 ≤10 · 禁 Math.）
        │否
它能只靠入参算出确定结果吗？ ── 能 → core
        │不能
它需要"记住"并跨页/跨组件共享吗？ ── 是 → stores（动作入口尽量少）
        │否
它需要"时机"（watch/生命周期/路由/await）吗？ ── 是 → composables
        │否
它要碰 canvas / DOM 吗？ ── 是 → render（+ 组件里只留 ref）
        │否
它要碰网络 / 存储 / Worker 吗？ ── 是 → services
        │否
它是"画出来"的吗？ ── 是 → components（props 进、emit 出）
        └─ 都不是 → 多半是 constants（静态值）或 types（形状）
```

---

## 7. 反模式总清单（跨层的 13 条）

| # | 反模式 | 违反 | 正确姿势 |
|---|---|---|---|
| 1 | core 里 `Math.random` / `Date.now` / `console` / 宿主 | R3 | 注入 `rng`；返回结果让调用方记录 |
| 2 | core 里放模块级可变状态 | R11 | 能不放就不放；必要则登记例外（E1） |
| 3 | core 文件 >200 行或导出 >8 个 | R9 | 按角色拆文件（生成器 / 挖空器 / 求解器 / 多解器） |
| 4 | store 里写 `for` / `Math.` / 算法 | R4 | 算法下沉 core，store 只"取值 → 调 → 写回" |
| 5 | store 里 `router.push` | R4 | 跳转放 composable |
| 6 | 页面里 `Math.` / 自己拼文案 | R6 | 算式进 core；文案进 constants |
| 7 | 页面声明 >10 个 | R6 | 逻辑搬进 composable |
| 8 | composable 里 `Math.` | R7 | 用 core 的 `percentOf` / `clampPage` / `defaultZoomOf` |
| 9 | 组件里取 store / 跳路由 / fetch | R5 / R2 | props + emit；数据由 composable 给 |
| 10 | 组件显示棋盘却不给缩放 | R14 | `useBoardZoom` + `:zoom-actions` |
| 11 | types 里出现"只有定义没人用"的类型 / `Omit·Pick` 派生 | R10 | 删掉或登记；改成"把字段变成函数参数" |
| 12 | 跨文件 `export * from`（桶文件） | R12 | 谁用谁直接 import |
| 13 | **页面**里写 `await` / `watch` / `fetch`（或声明超过 10 个） | R6 / R2 | 逻辑搬进 composable，页面只接线 |

> 这 13 条都有**机器检查**（`pnpm guard`），所以它们不是"风格建议"，而是会挡发布的红线。

---

> **只记四句话**：
> ① **core 算**（纯函数、随机/时间注入、规则只有一份）；
> ② **store 记**（跨页共享 + 要活过这次渲染的，才进来；派生用 `computed`）；
> ③ **composable 编排**（ref / watch / 生命周期 / router / async 只在这里）；
> ④ **组件画**（props 进、emit 出；文案来自 constants，动作来自闭包）。
> 判断不了就先跑 §6 的决策树，最后 `pnpm guard && pnpm typecheck && pnpm typecheck:functions && pnpm build`。


