# 架构约束 v1.8.1（数据 · 纯函数 · 组合式）

> **硬约束**：`scripts/check-arch.mjs` 是本文 R1~R15 的可执行版本（R15 与 R8 的命名语义为评审规则；
> R11 已废止，见 §四 脚注）；`pnpm guard` 违规 exit 1，`pnpm build` 已串上它。
> **改规矩的顺序**：先改这一页（矩阵/规则）→ 再改守卫脚本的 `MATRIX` 与预算常量 → 再改代码。

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

> 这张表就是守卫脚本里的 `MATRIX`（机器可查版）——加层或改依赖必须同时改两处。

| 目录 | 允许的 src 前缀 | 允许的外部包 |
|---|---|---|
| `src/constants/` | （无） | （无） |
| `src/types/` | `src/types/`　`src/constants/` | （无） |
| `src/core/` | ＋`src/core/` | （无） |
| `src/services/` | ＋`src/services/` | （无） |
| `src/render/` | ＋`src/render/` | （无） |
| `src/stores/` | ＋`src/services/`　`src/stores/` | `vue`　`pinia` |
| `src/composables/` | ＋`src/render/`　`src/stores/`　`src/composables/` | `vue`　`vue-router` |
| `src/components/` | `src/components/`　`src/composables/`　`src/constants/`　`src/types/` | `vue`（**禁 `vue-router`**：RouterLink/RouterView 是全局组件） |
| `src/pages/` | `src/pages/`　`src/components/`　`src/composables/`　`src/stores/`　`src/constants/`　`src/types/` | `vue`　`vue-router` |
| `src/router/` | `src/router/`　`src/stores/`　`src/constants/`　`src/types/` | `vue-router` |
| `src/`（`main.ts` / `App.vue`） | 组合根：允许一切 | 允许一切 |
| `functions/` | `functions/`　`src/core/`　`src/constants/`　`src/types/` | （无） |

- 相对路径导入按"解析后的仓库路径"判定（例：`core/sudoku/rules.ts` 里 `../array` = `src/core/array` ✅）
- **全局禁用**：`axios`（统一 `fetch`）；`node:` 前缀允许
- `core` 零 vue / 零 DOM / 零随机 → **前后端共用同一套规则**（`functions/` 直接 import `core` 做服务端校验）

## 三、规则

### R1 顶层目录白名单（src 内）　🔴
`core services render stores composables components pages constants types styles router main.ts App.vue`
新增顶层目录 = 改这一页 + 守卫 `TOP_ALLOW`。（`functions/` 在仓库顶层，不属 src。）

### R2 依赖只按矩阵向下　🔴
按 §二 逐 import 校验（含 `src/` 与 `functions/`）；外部包也按白名单查。
**`services/` 不许 import `router` / `stores`**（因此 401 只能由 store / composable 处理）。

### R3 core 纯度　🔴
禁 `vue` / `pinia` / `vue-router`、`window` `document` `localStorage` `navigator`、`new Worker`、
`Math.random` / `Date.now`、`console`。
随机与时间**由调用方注入**：`shuffle(arr, rng)`、`generatePuzzle(boxSize, blanks, rng)`。

### R4 数据层不写算法　🔴
`stores/` 内禁 `for (` / `.forEach(` / `Math.`，禁 `vue-router`。只做：**取值 → 调 core 的纯函数 → 写回**。

### R5 展示层不碰状态　🔴
`components/` 禁 `@/stores`；**也禁 `vue-router`**（路由只属于 pages / composables）。
**布局也适用**：需要读 store 的"布局"放 `pages/`（`pages/AppLayout.vue`）。

### R6 页面只接线　🔴
声明 ≤ 10；只许 `vue`、`vue-router`、`@/components`、`@/composables`、`@/stores`、`@/constants`、`@/types`；
**禁 `Math.`**（要显示算好的值 → 由 composable 暴露，composable 才能 import core）。
子页面（`pages/difficulty/*.vue`）同样适用。

### R7 组合式只编排　🔴
禁 `Math.`（算式下沉 core）；`router` 跳转与异步只在这里出现。
一页一份的实例（`useZoom`）只在页面 setup 顶层调一次，其余靠参数注入。
可复用的控件定义（需要闭包）随 composable 返回，由页面 spread（例：`useZoom().zoomActions`）。见 E5。

### R8 命名成套　🔴（常量命名）/ 评审（其余）
`xxxOf` / `is`·`has`·`can` / `get` / `make` / `create` / `generate` / `parse`·`xxxToStr` / `clone` / `use`。
展示项：`Action` / `Actions`（按钮条）、`Menu` / `Menus`（菜单），公共字段继承 `ItemBase`。
**机器可查部分**：`constants/` 的导出名必须是 `UPPER_SNAKE_CASE`（`BOARD_SIZE` · `AUTH_COPY` · `UID_PATTERN` …）。

### R9 体量预算　🔴
单文件 ≤ 200 行（**行数按"不含结尾换行"计**，守卫已修正 off-by-one）；`core` 单文件导出 2~8 个；
只有 `core` 允许「唯一入口模块」式的 1 个导出（≥ 50 行）。
**要加第 9 个导出时不要放宽限制，改拆文件**（例：`board/model.ts` 转换 + `board/ops.ts` 操作）。

### R10 类型归位　🔴（多数）/ 评审（`extends` 用法）
- 共享类型（≥2 个「非父子」文件使用）→ `types/`；**types/ 里的类型必须有使用点**（死类型删掉或登记 `RESERVED_TYPES`）
- 组件本地 props / emits → 就地写在 `defineProps<{…}>` / `defineEmits<{…}>`
- 单文件私有类型 → 留在原文件（例：`core/sudoku/tracker.ts` 的 `Change`）
- **一个形状只留一份接口**：需要「少一个字段」时不要 `extends` / `Omit` 再开名字，改成把该字段变成函数参数
- **外部资源（canvas / DOM / Worker / 定时器）用参数传，不塞进数据对象**
- **敏感字段不进前端类型**：`uid`（登录凭据）不出现在题目相关类型里；列表不下发题面串
- **`constants/` 不许导出类型**（类型一律放 `types/`）
- `extends` 只用于「不同的东西共享公共字段」（`Action`/`Menu` extends `ItemBase`；`MyPuzzleDetail` extends `PuzzleDetail`）
- 推导类型改成手写契约（例：`Sudoku` 写在 `types/sudoku.ts`，`core` 的工厂标注返回类型）

### R12 禁桶文件　🔴
**不写 `export * from`**（跨文件再导出）；不跨层再导出。

### R13 types 是叶子层　🔴
只许 `./xxx`、`@/types/...`、`@/constants/...`。store 实例类型（`GameStore`）因此不进 types/（见 E3）。

### R14 有棋盘就必须能缩放　🔴
`.vue` 里 import 了 `BoardView`，就必须出现 `useZoom(` 或使用 `BoardOverlay`。
按钮统一来自 **`useZoom().zoomActions`**，页面 `...zoomActions.value` spread；不设默认缩放（默认 1）。
列表项**不渲染棋盘**。

### R15 状态归位　评审
**位置放路由，过程放 state；影响数据请求的放 query，纯 UI 偏好的放本地偏好。**
- **子页面用子路由**：难度页 `system` / `custom`（`'' → redirect` 实现"不记忆"）
- **带参数用路径参数**：`/p/:pid`（分享落地）、`/puzzle/:pid/edit`（编辑）
- **影响数据请求 → query**：`/search?q=&sort=&page=`、`/my-puzzles?sort=&page=`、`/login?mode=&redirect=`
- **纯 UI 偏好 → 本地偏好**（`services/prefs.ts`，键名统一 `sudoku.` 前缀）：`pagerMode`
- **保持 state**：流程阶段（题面→答案）、弹层（预览 / 答案预览 / 参考答案 / 确认框）、游戏状态
- **布局用父路由**：`AppLayout` 作为 `/` 的父路由，主内容由 `<RouterView/>` 渲
- **重置与收敛**：换排序/关键词 → `page` 重置 1；`page` 越界 → 收敛最后一页；`pageCount ≤ 1` → 隐藏分页条
- **返回来源靠历史**：`router.back()`，无历史兜底 `/difficulty`（不把来源写进 URL）

## 四、规则 → 检查方式（守卫）

| 规则 | 机器检查 | 级别 |
|---|---|---|
| R1 顶层白名单 | 扫描 `src/` 顶层名 | 🔴 |
| R2 依赖矩阵 | `MATRIX` 逐 import 校验（`src/**` + `functions/**`，含外部包白名单、全局禁 `axios`） | 🔴 |
| R3 core 纯度 | 宿主 / `new Worker` / `Math.random`·`Date` / `console` | 🔴 |
| R4 数据层 | `for(`·`.forEach(`·`Math.` + `vue-router` | 🔴 |
| R5 展示层 | `@/stores`；组件禁 `vue-router` | 🔴 |
| R6 页面 | 声明 ≤10 + 禁 `Math.` | 🔴 |
| R7 组合式 | 禁 `Math.` | 🔴 |
| R8 命名 | constants 导出名 `UPPER_SNAKE` | 🔴（语义部分评审） |
| R9 体量 | 200 行 / core 2~8 导出 / 单函数模块 ≥50 行 | 🔴 |
| R10 类型归位 | types 死类型 / `Omit·Pick` 派生 / constants 不放类型 | 🔴 |
| R12 禁桶文件 | `export * from` | 🔴 |
| R13 types 叶子 | 由 R2 矩阵（单独报 R13） | 🔴 |
| R14 棋盘缩放 | `BoardView` → 必须 `useZoom(`/`BoardOverlay` | 🔴 |
| R15 状态归位 | —— 语义判断，脚本查不了 | 评审 |

> **R11 已废止**（v1.7 起）：原「core 必须可测（每个 `core/**/*.ts` 配同名 `.test.ts`，`--strict` 考核）」
> 不再作为约束；守卫里的 `--strict` 参数与黄提醒机制已一并移除。编号留空，避免与既有引用冲突。

## 五、例外登记

    E1 core/sudoku/rules.ts 的 getSudoku：模块级 Map 记忆化（对入参可观察等价于纯函数）
    E2 render/board.ts 的 setupCanvas：读 devicePixelRatio / 写 canvas 尺寸（canvas 适配器）
    E3 GameStore 类型放 stores/game.ts 而不是 types/（见 R13）
    E4 预留类型登记在守卫 RESERVED_TYPES：Page / User / SearchResult / Puzzle
       现状：User / SearchResult / Puzzle 已被真实引用；Page 仍只靠登记存活
       （建议把 types/item.ts 的 Menu.routeName: string 改成 Page，再摘掉这条登记）
    E5 BoardOverlay 自持 useZoom：与页面主盘 zoom 作用域不同（不同 canvas），不算违反 R7
    E6 useBoardCanvas 的 ResizeObserver 是容器宽度的唯一测量源（重绘路径不读布局）；
       渲染器仍保留「没传宽度就自己量一次」的兜底分支
    E7 core/sudoku/tracker.ts 的 place() 返回闭包撤销函数（撤销记录不跨模块，Change 保持私有）

## 六、归位原则

    纯静态、无格式化        → constants（GAME_COPY.win · AUTH_COPY.needLogin · RATIO_COPY.bad）
    需要按入参拼装          → core 纯函数（hintTextOf · percentOf）
    纯展示、只在模板里出现  → 留在页面 / 组件模板
    可复用的控件定义        → 随 composable 返回，由页面 spread（zoomActions）
    位置 / 可分享的状态     → 路由与 query（R15）
    纯 UI 偏好              → 本地偏好（services/prefs.ts）
    过程 / 依赖内存的状态   → state（store 或组件内）
    全站共用的界面          → 父路由布局（AppLayout），主内容在 <RouterView/>
    页面要显示的"算好的值"  → 由 composable 暴露（composable 才能 import core；页面禁 Math.）
    跨页共用的视觉规格      → 全局样式（styles/*.css）：card / form / overlay
    跨页共用的流程          → 公共组合式（useListQuery 列表查询 · usePuzzlePreview 预览 · useClipboard 复制）

## 八、后端约定（functions/）

    · 复用 core 做服务端校验（同尺寸 / 格式 / 40~70% / 合法终盘）—— 规则只有一份
    · import core 一律用相对路径（`../../../src/core/...`）；别名靠 functions/tsconfig.json 的 paths
    · 环境相关逻辑（密码哈希 / 会话 / 限流 / id 生成）只放 functions/utils/
    · 每个接口文件只做四件事：校验参数 → 调 core → 读写 D1 → 用 utils/json 统一响应
    · 列表类接口统一回 { items, total }；可选字段一律走白名单（例：visibility 只认三态常量）
    · 类型检查关卡：pnpm typecheck:functions（同一个 functions/tsconfig.json，esbuild 与 tsc 双用）
    · 限流只按 uid（连败 5 次锁 10 分钟）；PBKDF2 迭代 = 10000（Workers CPU 限额）
    · 守卫扫描范围含 functions/（矩阵行见 §二）

## 九、types/ 索引

| 文件 | 导出 | 使用方 |
|---|---|---|
| board.ts | `Cell` `Board` `NumBoard` `ConflictMask` `Snapshot` `Position` | core / stores / render / composables / components |
| render.ts | `BoardRenderInput` | BoardView props、页面 boardParams、useBoardCanvas、renderBoard(canvas, input, contentWidth?) |
| sudoku.ts | `Sudoku`（手写契约） | core/sudoku/rules 实现；fill/generate、stores/game 使用 |
| rng.ts | `Rng` | core/array.shuffle、core/sudoku/fill、services/sudoku/worker |
| worker.ts | `GenerateRequest` `GenerateResponse` | services/sudoku/worker 与 workerClient |
| game.ts | `GameConfig` `GameMeta` `GameStatus` `GameMode` `CreatePhase` | stores/game、core/game/derive、useCreateFlow/useEditFlow/useDifficultyFlow、GamePage |
| item.ts | `ItemBase` `Action` `Actions` `Menu` `Menus`（🔸 `Menu.disabled`） | ActionItem(s) / MenuItem(s)、各页面、useGameFlow / useMyPuzzles |
| puzzle.ts | `Visibility` · `ListSort` · `PagerMode` · `SearchResult`（含 `uname`）· `MyPuzzle` · `PuzzleDetail` · `MyPuzzleDetail` · `PuzzleData`（**均不含 uid**） | services/api、stores/puzzle、composables/puzzle、PuzzleCard / MyPuzzleRow / PagerBar |
| page.ts | `Page`（路由名类型） | useListQuery、待 `Menu.routeName` 采用（见 E4） |
| user.ts | `User`（含自己的 `uid`）（🔸 `RegisterPayload` `LoginPayload` `AuthResponse`） | stores/user、services/api |

> 列表/详情类型的具体字段见 `REQUIREMENTS.md` §7。

## 十、目录速览（✅ 现有 · ⛔ 规划）

    src/
      core/                 array · page · board/{model,ops,metrics,zoom}
                            sudoku/{shape,rules,generate,fill,tracker,parse} · game/derive
      render/board.ts       renderBoard(canvas, input, contentWidth?) · measureContentWidth(parent) · getClickPos(canvas, e, size)
      services/             prefs.ts · api/{client,session,userApi,puzzleApi} · sudoku/{worker,workerClient}
      stores/               {game,user,puzzle}.ts
      composables/          useClipboard · useListQuery · useSecretValue
                            auth/{useAuth,useAccountMenu} · board/{useBoardCanvas,useZoom}
                            game/{useGameFlow,useCreateFlow,useEditFlow,useCustomFlow,useDifficultyFlow}
                            puzzle/{useSearchPuzzle,usePuzzleDetail,usePuzzlePreview,useMyPuzzles}
      components/           ActionItem(s) · MenuItem(s) · TextButtons · ValueIcons · EyeGlyph
                            BoardView · BoardOverlay · LoadingOverlay · Overlay · SpinnerIcon · NumberPad
                            HistoryBar/Step · SecretField · PagerBar
                            PuzzleCardShell · PuzzleMeta · PuzzleSettings · RenameText · SecretValue
                            PuzzleCard · MyPuzzleRow
      pages/                AppLayout · HomePage · DifficultyPage · GamePage · CreatePage · EditPuzzlePage
                            LoginPage · SearchPage · MyPuzzlesPage · PuzzleViewPage
                            difficulty/{SystemPage,CustomPage}
      constants/            board · game · pages · user · puzzle
      types/                见 §九
      styles/               card.css（页面卡片）· form.css（控件 / 状态 / 列表公共）· overlay.css（遮罩文案 / 账号卡）
      router/

    仓库顶层：
      functions/tsconfig.json            esbuild 与 tsc 双用（paths 让 @/ 可解析）
      functions/types.ts · _middleware.ts · utils/{id,auth,json,user,puzzle}.ts
      functions/api/{register,login,logout,me}.ts
      functions/api/puzzles/{index,[pid],mine/[rowId],[pid]/play}.ts
      schema.sql（幂等：CREATE TABLE / INDEX IF NOT EXISTS）· wrangler.toml
      worker-configuration.d.ts（wrangler types 生成并已提交）· README.md（极简版）

## 十一、用法

    pnpm guard                # 红规则（违规 exit 1；build 前自动跑）
    pnpm typecheck            # vue-tsc（只查 src/）
    pnpm typecheck:functions  # tsc -p functions/tsconfig.json（查后端）
    pnpm format               # prettier（src/**/*.{ts,vue,css}）
    pnpm build                # guard + vue-tsc + typecheck:functions + vite build

    后端本地联调（6B 起）：
    npx wrangler types                                    # 生成 worker-configuration.d.ts
    npx wrangler d1 create sudoku-db                      # 拿真实 UUID 填进 wrangler.toml
    npx wrangler d1 execute sudoku-db --local  --file=schema.sql        # 本地库建表
    npx wrangler d1 execute sudoku-db --remote --file=schema.sql        # 云端库建表（部署前必做）
    npx wrangler pages dev --port 8788                    # 后端 + 本地 D1
    pnpm dev                                              # 前端（vite /api 代理到 8788）

## 十二、变更记录

- v1：R1~R13
- v1.1：＋R14（有棋盘必须有缩放）；矩阵补 `router`；＋E5
- v1.2：矩阵补 `functions`；R7 补「控件随 composable 返回」；R14 明确不设默认缩放
- v1.3：＋R15（路由/状态归位）；R5 明确"读 store 的布局放 pages/"
- v1.4：R10 补「敏感字段不进前端类型」；R15 补「影响数据请求→query / UI 偏好→本地偏好」
- v1.5：R2 补「services 不许 import router/stores」；types 索引定稿
- v1.6：＋**§八 后端约定**；R5 补「组件禁 vue-router」；R6 补「页面禁 Math.」；
  R8 常量命名机器化；R12 从评审升为机器可查；矩阵表格化并与守卫 `MATRIX` 一一对应
- v1.7：**废止 R11（测试）**，守卫移除 `--strict` 与黄提醒机制；§八 补「列表接口统一回 `{ items, total }`」；
  ＋E6（容器宽度单点测量）
- v1.8：**补回 §八~§十二**（v1.7 曾被截断）；R9 明确行数口径（不含结尾换行，守卫已修 off-by-one）；
  ＋E7（tracker 的撤销闭包）；§六 补「跨页共用流程 → 公共组合式」；§九 补 `GameMeta`；
  §十 目录速览与 §十一 用法按实况更新
- v1.8.1：**删除 §七「新代码骨架」**（示例已由真实文件承担，看 §十 目录速览即可）；
  为保持既有引用（§八 后端约定 / §九 types 索引 / §十 目录速览 / §十一 用法 / §十二 变更记录）
  编号留空，不回移
- v1.8.2：§十 目录速览把 `worker-configuration.d.ts` / `README.md` 的 ⛔ 划掉（两者均已落地）
