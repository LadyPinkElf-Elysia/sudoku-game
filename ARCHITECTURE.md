# 架构约束 v1.6（数据 · 纯函数 · 组合式）

> **硬约束**：`scripts/check-arch.mjs` 是 R1~R14 的可执行版本（R15 为评审规则）；`pnpm guard` 违规 exit 1，`pnpm build` 已串上它。
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
    functions   → core types constants                  ← 后端；只用相对路径 import core

> `core` 零 vue / 零 DOM / 零随机 → **前后端共用同一套规则**（`functions/` 直接 import `core` 做服务端校验）。

## 三、规则

### R1 顶层目录白名单（src 内）
`core services render stores composables components pages constants types styles router main.ts App.vue`
新增顶层目录 = 改这一页 + 守卫 `TOP_ALLOW`。（`functions/` 在仓库顶层，不属 src。）

### R2 依赖只按矩阵向下
`core` 只许 `@/constants`、`@/types`、`@/core` 与相对路径；越层即报错。
**`services/` 不许 import `router` / `stores`**（因此 401 只能由 store / composable 处理）。

### R3 core 纯度
禁 `vue` / `pinia` / `vue-router`、`window` `document` `localStorage` `navigator`、`new Worker`、
`Math.random` / `Date.now`、`console`。随机与时间**由调用方注入**（`shuffle(arr, rng)`、`generatePuzzle(boxSize, blanks, rng)`）。

### R4 数据层不写算法
`stores/` 内禁 `for (` / `.forEach(` / `Math.`，禁 `vue-router`。只做：**取值 → 调 core 的纯函数 → 写回**。

### R5 展示层不碰状态
`components/` 禁 `@/stores`（状态由页面传 props，交互往外 `emit`）。
**布局也适用**：需要读 store 的"布局"放 `pages/`（`pages/AppLayout.vue`）。

### R6 页面只接线
声明 ≤ 10；只许 `vue`、`vue-router`、`@/components`、`@/composables`、`@/stores`、`@/constants`、`@/types`。
子页面（`pages/difficulty/*.vue`）同样适用。

### R7 组合式只编排
禁 `Math.`；`router` 跳转与异步只在这里出现。
一页一份的实例（`useZoom`）只在页面 setup 顶层调一次，其余靠参数注入。
可复用的控件定义（需要闭包）随 composable 返回，由页面 spread（例：`useZoom().zoomActions`）。见 E5。

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
- **一个形状只留一份接口**：需要「少一个字段」时不要 `extends` / `Omit` 再开名字，改成把该字段变成函数参数
- **外部资源（canvas / DOM / Worker / 定时器）用参数传，不塞进数据对象**
- **敏感字段不进前端类型**：`uid`（登录凭据）不出现在题目相关类型里；列表不下发题面串
- `extends` 只用于「不同的东西共享公共字段」（`Action` / `Menu` extends `ItemBase`；`MyPuzzleDetail` extends `PuzzleDetail`）
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
按钮统一来自 **`useZoom
