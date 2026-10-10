# 架构约束 v1.2（数据 · 纯函数 · 组合式）

> **硬约束**：`scripts/check-arch.mjs` 是这一页的可执行版本；`pnpm guard` 违规 exit 1，`pnpm build` 已串上它。
> **改规矩的顺序**：先改这一页 → 再改守卫脚本的「规则参数」区 → 再改代码。

## 一、三层 + 三类适配器

| 层 | 目录 | 一句话职责 | 判据 |
|---|---|---|---|
| 数据层 | `types/ constants/ stores/ services/` | 有什么数据、存在哪、从哪来 | 需要「记住」或「出去取」 |
| 纯函数层 | `core/` | 怎么算 | 入参定则输出定，不碰任何外部 |
| 组合式层 | `composables/` | 什么时候算、算完干什么 | 需要 ref / watch / 生命周期 / router / 异步 |
| 渲染适配器 | `render/` | 唯一碰 canvas | 出现 `ctx` / `devicePixelRatio` |
| 服务适配器 | `services/` | 唯一碰 Worker / HTTP / 本地存储 | 出现 `new Worker` / `fetch` / `localStorage` |
| 后端适配器 | `functions/`（仓库顶层） | Cloudflare Functions + D1 | 出现 `D1Database` / `PagesFunction` |
| 展示 | `components/ pages/` | 画出来 / 接线 | 不写算式 |

一句话记住：**core 不认识 vue；stores 不认识 router；types 谁都不认识（除 types / constants）；组件不认识 store。**

## 二、依赖矩阵（只允许向下）

    core        → constants types core
    services    → constants types core services
    render      → constants types core render
    stores      → constants types core services stores
    composables → constants types core services render stores composables
    components  → constants types components
    pages       → constants types components composables stores
    router      → constants types stores
    types       → types 自身 + constants                ← 叶子
    constants   → （无）
    functions   → core types constants                  ← 后端；只能相对路径，不能用 @/ 别名

> `core` 零 vue / 零 DOM / 零随机 → **前后端共用同一套规则**（`functions/` 直接 import `core` 做服务端校验）。

## 三、规则 R1~R14

### R1 顶层目录白名单（src 内）
`core services render stores composables components pages constants types styles router main.ts App.vue`
新增顶层目录 = 改这一页 + 守卫 `TOP_ALLOW`。

### R2 依赖只按矩阵向下
`core` 只许 `@/constants`、`@/types`、`@/core` 与相对路径；越层即报错。

### R3 core 纯度
禁 `vue` / `pinia` / `vue-router`、`window` `document` `localStorage` `navigator`、`new Worker`、
`Math.random` / `Date.now`、`console`。
随机与时间**由调用方注入**：`shuffle(arr, rng)`、`generatePuzzle(boxSize, blanks, rng)`
（生产传 `Math.random`，测试传种子随机）。

### R4 数据层不写算法
`stores/` 内禁 `for (` / `.forEach(` / `Math.`，禁 `vue-router`。只做：
**取值 → 调 core 的纯函数 → 写回**。

### R5 展示层不碰状态
`components/` 禁 `@/stores`：状态由页面传 props，交互往外 `emit`。

### R6 页面只接线
声明 ≤ 10；只许 `vue`、`vue-router`、`@/components`、`@/composables`、`@/stores`、`@/constants`、`@/types`。

### R7 组合式只编排
禁 `Math.`；`router` 与异步只在这里出现。
一页一份的实例（`useZoom`）**只在页面 setup 顶层调一次**，其余靠参数注入（见 E5）。
可复用的控件定义（需要闭包）随 composable 返回，由页面 spread（例：`useZoom().zoomActions`）。

### R8 命名成套
`xxxOf` / `is`·`has`·`can` / `get` / `make` / `create` / `generate` / `parse`·`xxxToStr` / `clone` / `use`。
展示项：`Action` / `Actions`（按钮条）、`Menu` / `Menus`（菜单），公共字段继承 `ItemBase`。

### R9 体量预算
单文件 ≤ 200 行；`core` 单文件导出 2~8 个；只有 `core` 允许「唯一入口模块」式的 1 个导出（≥ 50 行）。
**要加第 9 个导出时不要放宽限制，改拆文件**（例：`board/model.ts` 转换 + `board/ops.ts` 操作）。

### R10 类型归位
- 共享类型（≥2 个「非父子」文件使用）→ `types/`；**types/ 里的类型必须有使用点**（死类型删掉或登记 `RESERVED_TYPES`）
- 组件本地 props / emits → 就地写在 `defineProps<{…}>` / `defineEmits<{…}>`
- 单文件私有类型 → 留在原文件（例：`generate.ts` 的 `Change`）
- **一个形状只留一份接口**：需要「少一个字段」时不要 `extends` / `Omit` 再开名字，改成把该字段变成函数参数（例：`renderBoard(canvas, input)`）
- **外部资源（canvas / DOM / Worker / 定时器）用参数传，不塞进数据对象**
- `extends` 只用于「不同的东西共享公共字段」（`Action` / `Menu` extends `ItemBase`）
- `constants/` 只放值（`as const` / `Record`）；推导类型改成手写契约（例：`Sudoku`）

### R11 core 必须可测
每个 `core/**/*.ts` 配同名 `.test.ts`，每个导出 ≥ 1 断言（`pnpm guard --strict`）。
vitest 是 `environment: node` → **想被测就必须下沉成 core 纯函数**。

### R12 禁桶文件
不写 `index.ts` 聚合 `re-export`；不跨层再导出。

### R13 types 是叶子层
只许 `./xxx`、`@/types/...`、`@/constants/...`。store 实例类型（`GameStore`）因此不进 types/（见 E3）。

### R14 有棋盘就必须能缩放
`.vue` 里 import 了 `BoardView`，就必须出现 `useZoom(` 或使用 `BoardOverlay`。
按钮统一来自 **`useZoom().zoomActions`**，页面 `...zoomActions.value` spread；不设默认缩放（默认 1）。
列表项**不渲染棋盘**。

## 四、规则 → 检查方式

| 规则 | 检查方式 |
|---|---|
| R1 R2 R3 R4 R5 R6 R9 R13 R14 | 守卫红规则（违规 exit 1） |
| R7 | 红（`Math.`）+ 评审（实例注入） |
| R10 | 红（死类型 / `Omit`·`Pick` 派生）+ 评审（`extends` 用法） |
| R11 | 黄（`--strict`） |
| R8 R12 | 评审 |

## 五、例外登记

    E1 core/sudoku/rules.ts 的 getSudoku：模块级 Map 记忆化（对入参可观察等价于纯函数）
    E2 render/board.ts 的 setupCanvas：读 devicePixelRatio / 写 canvas 尺寸（canvas 适配器）
    E3 GameStore 类型放 stores/game.ts 而不是 types/（见 R13）
    E4 预留类型登记在守卫 RESERVED_TYPES：Page / User / SearchResult / Puzzle
    E5 BoardOverlay 自持 useZoom：与页面主盘 zoom 作用域不同（不同 canvas），不算违反 R7

## 六、文案与控件归位

    纯静态、无格式化        → constants（GAME_COPY.win · AUTH_COPY.needLogin · PUZZLE_VISIBILITY_COPY）
    需要按入参拼装          → core 纯函数（hintTextOf）
    纯展示、只在模板里出现  → 留在页面 / 组件模板
    可复用的控件定义        → 随 composable 返回，由页面 spread（zoomActions）

## 七、新代码骨架

```ts
// core/xxx.ts
import type { Position } from '@/types/board'
export const xxxOf = (a: number, b: number): number => Math.min(a, b)
```

```ts
// stores/xxx.ts —— 取值 → 调 core → 写回
export const useXxxStore = defineStore('xxx', () => {
    // 状态 ref → 派生 computed（调 core 纯函数）→ Actions（不 for / 不 Math / 不 router）
    return { /* 注释分组 */ }
})
```

```ts
// composables/<域>/useXxx.ts
export const useXxx = (injected?: () => void) => {
    // store → 本地 ref → 派生 computed → 动作 → 生命周期 → return
}
```

```ts
// 页面：缩放按钮（R14）+ 渲染入参
const { zoom, zoomActions } = useZoom()
const actions = computed<Actions>(() => [
    { key: 'home', icon: '🏠', message: '返回', onClick: goHome },
    ...zoomActions.value,
])
const boardParams = computed<BoardRenderInput>(() => ({ board: gameStore.board, boxSize: gameStore.sudoku.B, zoom: zoom.value }))
```

```vue
<!-- 遮罩：只读、不动任何游戏状态 -->
<BoardOverlay :show="!!preview" :board="previewBoard" :box-size="previewBoxSize"
              title="参考答案" close-text="回到挑战" @close="preview = null" />
```

## 八、types/ 索引

| 文件 | 导出 | 使用方 |
|---|---|---|
| board.ts | `Cell` `Board` `NumBoard` `ConflictMask` `Snapshot` `Position` | core / stores / render / composables / components |
| render.ts | `BoardRenderInput` | BoardView props、页面 boardParams、useBoardCanvas、renderBoard(canvas, input) |
| sudoku.ts | `Sudoku`（手写契约） | core/sudoku/rules 实现；generate、stores/game 使用 |
| rng.ts | `Rng` | core/array.shuffle、core/sudoku/generate、services/sudoku/worker |
| game.ts | `GameConfig` `GameStatus` `GameMode` `CreatePhase` | stores/game、core/game/derive、useCreateFlow、useDifficultyFlow |
| item.ts | `ItemBase` `Action` `Actions` `Menu` `Menus` | ActionItem(s) / MenuItem(s)、各页面、useGameFlow |
| puzzle.ts | `Puzzle` `SearchResult` `PuzzleData`（🔸 规划：`Visibility` `PlayCount` 等字段） | core/sudoku/generate、services/sudoku/workerClient、将来 services/api |
| worker.ts | `GenerateRequest` `GenerateResponse` | services/sudoku/worker 与 workerClient |
| page.ts | `Page`（E4 预留） | 暂无 |
| user.ts | `User`（🔸 规划：`RegisterPayload` `LoginPayload` `AuthResponse`） | 将来 stores/user、services/api |

## 九、目录速览（✅ 现有 · ⛔ 规划）

    src/
      core/                 array · board/{model,ops,metrics,zoom} · sudoku/{shape,rules,generate,parse} · game/derive
      render/board.ts       renderBoard(canvas, input) · getClickPos(canvas, e, size)
      services/sudoku/      worker · workerClient           ⛔ api/{client,token,userApi,puzzleApi}
      stores/game.ts        ⛔ stores/{user,puzzle}.ts
      composables/          board/{useBoardCanvas,useZoom} · game/{useGameFlow,useCreateFlow,useDifficultyFlow}
                            ⛔ auth/useAuth · puzzle/{usePuzzleList,useSearchPuzzle,usePuzzlePreview} · game/useCustomFlow
      components/           ActionItem(s) · MenuItem(s) · BoardView · NumberPad · HistoryBar/Step · Overlay · SpinnerIcon
                            ⛔ BoardOverlay · PuzzleCard · SecretField
      pages/                HomePage · DifficultyPage · GamePage · CreatePage
                            ⛔ LoginPage · SearchPage · MyPuzzlesPage
      constants/            board · game · pages            ⛔ user（AUTH_COPY） · puzzle（可见性）
      types/                见 §八
      styles/ router/

    仓库顶层：functions/api/*（CF Functions）· schema.sql · wrangler.toml

## 十、用法

    pnpm guard            # 红规则（违规 exit 1；build 前自动跑）
    pnpm guard --strict   # 额外考核 R11
    pnpm typecheck / pnpm test / pnpm format / pnpm build

    后端本地联调（6B 起）：
    pnpm wrangler pages dev dist --d1 DB=sudoku-db --port 8788   # 后端 + 本地 D1
    pnpm dev                                                     # 前端（/api 代理到 8788）

## 十一、变更记录

- v1：R1~R13
- v1.1：＋R14（有棋盘必须有缩放）；矩阵补 `router`；＋E5；types 索引更新；目录速览
- v1.2：矩阵补 `functions`；R7 补「控件随 composable 返回」；R14 明确不设默认缩放；
  types 索引标注 `puzzle.ts` / `user.ts` 的规划字段
