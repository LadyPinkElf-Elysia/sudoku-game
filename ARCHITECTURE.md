# 架构约束 v1（数据 · 纯函数 · 组合式）

> **硬约束**：`scripts/check-arch.mjs` 是这一页的可执行版本；`pnpm guard` 违规 exit 1，`pnpm build` 已串上它。
> **改规矩的顺序**：先改这一页 → 再改守卫脚本的「规则参数」区 → 再改代码。

## 一、三层 + 两个适配器

| 层 | 目录 | 一句话职责 | 判据 |
|---|---|---|---|
| 数据层 | `types/ constants/ stores/ services/` | 有什么数据、存在哪、从哪来 | 需要「记住」或「出去取」 |
| 纯函数层 | `core/` | 怎么算 | 入参定则输出定，不碰任何外部 |
| 组合式层 | `composables/` | 什么时候算、算完干什么 | 需要 ref / watch / 生命周期 / router / 异步 |
| 渲染适配器 | `render/` | 唯一碰 canvas：算几何、画像素 | 出现 `ctx` / `devicePixelRatio` |
| 服务适配器 | `services/` | 唯一碰 Worker / HTTP / 存储 | 出现 `new Worker` / `fetch` / 定时器 |
| 展示 | `components/ pages/` | 画出来 / 接线 | 不写算式 |

## 二、依赖矩阵（只允许向下）

    core        → constants types core
    services    → constants types core services
    render      → constants types core render
    stores      → constants types core services stores
    composables → constants types core services render stores composables
    components  → constants types components
    pages       → constants types components composables stores
    types       → types 自身 + constants            ← 叶子
    constants   → （无）

一句话记住：**core 不认识 vue；stores 不认识 router；types 谁都不认识（除 types / constants）；组件不认识 store。**

## 三、规则

### R1 顶层目录白名单
`core services render stores composables components pages constants types styles router main.ts App.vue`
新增顶层目录 = 改这一页 + 守卫脚本的 `TOP_ALLOW`。

### R2 依赖只按矩阵向下
`core` 只许 `@/constants`、`@/types`、`@/core` 与相对路径；`types` 只许 `./`、`@/types`、`@/constants`。

### R3 core 纯度
禁 `vue` / `pinia` / `vue-router`、`window` `document` `localStorage` `navigator`、`new Worker`、
`Math.random` / `Date.now`、`console`。
需要随机或时间 → **由调用方注入**：`shuffle(arr, rng)`、`generatePuzzle(boxSize, blanks, rng)`
（生产传 `Math.random`，测试传种子随机 —— 这样出题结果可复现）。

### R4 数据层不写算法
`stores/` 内禁 `for (` / `.forEach(` / `Math.`，禁 `vue-router`。
只做三件事：**取值 → 调 core 的纯函数 → 写回**。
例：`board.value = lockGiven(board.value)`、`board.value = applySolution(board.value, solution.value)`、
`computed(() => statusOf(!!board.value.length, isWin.value))`。

### R5 展示层不碰状态
`components/` 禁 `@/stores`：状态由页面传 props，交互往外 `emit`。

### R6 页面只接线
声明 ≤ 10；只许 `vue`、`vue-router`、`@/components`、`@/composables`、`@/stores`、`@/constants`、`@/types`。
算式与 IO 一律经 composables（页面不 import `core` / `services` / `render`）。

### R7 组合式只编排
禁 `Math.`（算式下沉 core）；`router` 跳转与异步只在这里出现。
一页一份的实例（`useZoom`）**只在页面 setup 顶层调一次**，别的组合式要用靠参数注入
（例：`useCreateFlow(resetZoom)`）。

### R8 命名成套
`xxxOf`（换算）· `is`/`has`/`can`（谓词）· `get`（取对象）· `make`（造结构）· `create`（造实例）·
`generate`（造数据）· `parse`/`xxxToStr`（文本边界）· `clone`（深拷贝）· `use`（组合式）。
展示项：`Action` / `Actions`（按钮条）、`Menu` / `Menus`（菜单），公共字段继承 `ItemBase`。

### R9 体量预算
单文件 ≤ 200 行；`core` 单文件导出 2~8 个；只有 `core` 允许「唯一入口模块」式的 1 个导出，
但必须 ≥ 50 行（例：`generatePuzzle`，私有 helper 全在里面）。

### R10 类型归位
- 共享类型（被 ≥2 个「非父子」文件使用）→ `src/types/`；**types/ 里的类型必须有使用点**，
  没使用点就是死类型（删掉，或登记到守卫的 `RESERVED_TYPES`）
- 组件本地 props / emits → 就地写在 `defineProps<{…}>` / `defineEmits<{…}>`（契约贴在组件上，读组件即知）
- 单文件内部使用且不 export 的私有类型 → 留在原文件（例：`generate.ts` 的 `Change`）
- **一个形状只留一份接口**：需要「少一个字段」时，不要 `extends` / `Omit` 再开一个名字，
  改成把该字段变成函数参数（例：`renderBoard(canvas, input)`）
- `extends` 只用于「不同的东西共享公共字段」（`Action` / `Menu` extends `ItemBase`），
  不用于「同一个东西的两种形态」
- `constants/` 只放值（`as const`）；由实现推导的类型改成**手写契约接口**
  （例：`Sudoku` 写在 `types/sudoku.ts`，`core` 的工厂标注返回类型 `: Sudoku`，实现被契约约束）

### R11 core 必须可测
每个 `core/**/*.ts` 配同名 `.test.ts`，每个导出 ≥ 1 断言（`pnpm guard --strict` 考核）。
vitest 是 `environment: node`：**组件 / 组合式 / DOM 测不了** → 想被测就必须下沉成 core 纯函数。

### R12 禁桶文件
不写 `index.ts` 聚合 `re-export`；不跨层再导出。

### R13 types 是叶子层
只许 import `./xxx`、`@/types/...`、`@/constants/...`。
因此 store 实例类型（`GameStore`）不进 types/：它必须 `ReturnType<typeof useGameStore>`，
放进 types/ 就成了 `types → stores` 反向依赖。

## 四、规则 → 检查方式

| 规则 | 检查方式 |
|---|---|
| R1 R2 R3 R4 R5 R6 R9 R13 | 守卫红规则（违规 exit 1） |
| R7 | 红（`Math.`）+ 评审（实例注入） |
| R10 | 红（死类型 / `Omit`·`Pick` 派生）+ 评审（`extends` 用法） |
| R11 | 黄（`pnpm guard --strict`） |
| R8 R12 | 评审（脚本查不了） |

## 五、例外登记

    E1 core/sudoku/rules.ts 的 getSudoku：模块级 Map 记忆化（对入参可观察等价于纯函数）
    E2 render/board.ts 的 setupCanvas：读 devicePixelRatio / 写 canvas 尺寸（canvas 适配器）
    E3 GameStore 类型放 stores/game.ts 而不是 types/（见 R13）
    E4 预留类型登记在守卫 RESERVED_TYPES：Page / User / SearchResult / Puzzle

## 六、文案归位

    纯静态、无格式化        → constants（待收口：useGameFlow 的胜利文案 → GAME_COPY.win）
    需要按入参拼装          → core 纯函数（例：hintTextOf）
    纯展示、只在模板里出现  → 留在页面 / 组件模板

## 七、新代码骨架

    // core/xxx.ts —— 纯函数层（只许 @/constants、@/types、@/core、相对路径）
    import type { Position } from '@/types/board'
    export const xxxOf = (a: number, b: number): number => Math.min(a, b)

    // stores/xxx.ts —— 数据层：取值 → 调 core → 写回（不 for / 不 Math / 不 router）
    export const useXxxStore = defineStore('xxx', () => {
        // 状态 ref → 派生 computed（调 core 纯函数）→ Actions
        return { /* 用注释分组 */ }
    })

    // composables/<域>/useXxx.ts —— 组合式层：需要别的组合式实例时用参数注入
    export const useXxx = (injected?: () => void) => {
        // store → 本地 ref → 派生 computed → 动作 → 生命周期 → return
    }

    // pages/XxxPage.vue —— 只接线，声明 ≤ 10
    // 接线（store / router / composable）→ v-model 适配 → 展示映射（Action / Actions）

## 八、types/ 索引（全部共享类型集中地）

| 文件 | 导出 | 主要使用方 |
|---|---|---|
| board.ts | `Cell` `Board` `NumBoard` `ConflictMask` `Snapshot` `Position` | core / stores / render / composables / components |
| render.ts | `BoardRenderInput` | BoardView props、页面 boardParams、useBoardCanvas、renderBoard(canvas, input) |
| sudoku.ts | `Sudoku`（手写契约） | core/sudoku/rules 实现它；generate、stores/game 用它 |
| rng.ts | `Rng` | core/array.shuffle、core/sudoku/generate、services/sudoku/worker 注入 Math.random |
| game.ts | `GameConfig` `GameStatus` `GameMode` `CreatePhase` | stores/game、core/game/derive、useCreateFlow、useStartGame |
| item.ts | `ItemBase` `Action` `Actions` `Menu` `Menus` | ActionItem(s) / MenuItem(s)、三个页面、useGameFlow |
| puzzle.ts | `Puzzle` `SearchResult` `PuzzleData` | core/sudoku/generate、services/sudoku/workerClient |
| worker.ts | `GenerateRequest` `GenerateResponse` | services/sudoku/worker 与 workerClient（跨线程边界） |
| page.ts | `Page`（E4 预留） | 暂无 |
| user.ts | `User`（E4 预留） | 暂无 |

## 九、用法

    pnpm guard            # 红规则（违规 exit 1；build 前自动跑）
    pnpm guard --strict   # 额外考核 R11（core 的测试是否齐全）
    pnpm typecheck        # vue-tsc
    pnpm test             # vitest（environment: node，只能测 core 的纯函数）
    pnpm format           # prettier
