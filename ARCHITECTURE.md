# 架构约束 v1.9.6（数据 · 纯函数 · 组合式）

> **硬约束**：`scripts/check-arch.mjs` 是本文 R1~R15 的可执行版本（R15 与 R8 的命名语义为评审规则；
> R11 = core 必须可测但**不强制测试**，见 §三 R11）；`pnpm guard` 违规 exit 1，`pnpm build` 不含它（= vue-tsc -b + typecheck:functions + vite build），guard 单独跑。
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
一页一份的实例（`useBoardZoom` / `useZoom`）只在页面 setup 顶层调一次，其余靠参数注入。
可复用的控件定义（需要闭包）随 composable 返回，由页面 spread（例：`useBoardZoom(…).zoomActions`）。见 E5。

### R8 命名成套　🔴（常量命名）/ 评审（其余）
`xxxOf` / `is`·`has`·`can` / `get` / `make` / `create` / `generate` / `parse`·`xxxToStr` / `clone` / `use`。
展示项：`Action` = **一处可点动作**（`{ key, text, onClick? }`；不给 `onClick` 就是纯文本 —— 禁用态也这么表达）；`Menu` / `Menus` 是首页入口（`key / icon? / message / routeName / disabled?`），两者不再共用基类。
**机器可查部分**：`constants/` 的导出名必须是 `UPPER_SNAKE_CASE`（`BOARD_SIZE` · `AUTH_COPY` · `UID_PATTERN` …）；
`composables/**` 的 `.ts` 文件名必须 `use*`（不是 composable 的纯函数模块登记为例外 E8：`puzzle/metaText.ts`）。

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
- `extends` 只用于「不同的东西共享公共字段」（`MyPuzzleDetail` extends `PuzzleDetail`；`Action` 与 `Menu` 现在字段不同，各自独立）
- 推导类型改成手写契约（例：`Sudoku` 写在 `types/sudoku.ts`，`core` 的工厂标注返回类型）

### R11 core 必须可测　🔴（可测性）/ **不强制测试**
core 是纯函数层，**天然可测**：不碰宿主、不用 `Math.random` / `Date.now`（随机与时间由调用方注入 `rng`）、
**没有模块级可变状态**（顶层 `let` / `Map` / `Set` —— 只有 `rules.ts` 的 `getSudoku` 缓存例外，登记 E1）。

> **与 v1.7 的区别**：v1.7 废止的是「每个 `core/**/*.ts` 配同名 `.test.ts` + `--strict` 考核」那套**强制测试**；
> v1.9.6 恢复的是「**可测**」这条**设计约束**。**不要求**配测试文件、**不要求**跑测试，仓库也不预置测试工具链；
> 想测随时补 `*.test.ts`（守卫豁免，不会拦）。守卫只机器查「模块级可变状态」这一条，其余靠 R3 纯度检查与评审。

### R12 禁桶文件　🔴
**不写 `export * from`**（跨文件再导出）；不跨层再导出。

### R13 types 是叶子层　🔴
只许 `./xxx`、`@/types/...`、`@/constants/...`。store 实例类型（`GameStore`）因此不进 types/（见 E3）。

### R14 有棋盘就必须能缩放　🔴
`.vue` 里 import 了 `BoardView`，就必须给棋盘缩放数据：出现 `useZoom(` / `useBoardZoom(` 或 `:zoom-actions="…"`（数据来自 `useBoardZoom(…)` / `useZoom()` 或预览 composable 的 `…ZoomActions`）。
按钮统一来自 **缩放 composable 的 `zoomActions`**：页面直接用时 `...zoomActions.value` spread；预览遮罩由 `usePuzzlePreview` 一并给出 `previewActions`。**默认缩放按盘面大小取**（`BOARD_ZOOM.default` 字典：键 = 宫边长 B，如 9×9 → 1.25、36×36 → 2.5），且**跟着盘面大小走**（`useBoardZoom` 在尺寸变化时自动复位）；没登记时兜底 `BOARD_ZOOM.min`（= 1）。
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
| R8 命名 | constants 导出名 `UPPER_SNAKE` + composables 文件名 `use*` | 🔴（语义部分评审） |
| R9 体量 | 200 行 / core 2~8 导出 / 单函数模块 ≥50 行 | 🔴 |
| R10 类型归位 | types 死类型 / `Omit·Pick` 派生 / constants 不放类型 | 🔴 |
| R11 core 可测 | 模块级可变状态（顶层 `let` / `Map` / `Set`） | 🔴（可测性；**不查测试**） |
| R12 禁桶文件 | `export * from` | 🔴 |
| R13 types 叶子 | 由 R2 矩阵（单独报 R13） | 🔴 |
| R14 棋盘缩放 | `BoardView` → 必须 `useZoom(` / `useBoardZoom(` / `:zoom-actions=` | 🔴 |
| R15 状态归位 | —— 语义判断，脚本查不了 | 评审 |

> **R11 恢复说明**：v1.7 废止的是**强制测试**（`.test.ts` 配齐 + `--strict` + 黄提醒），那套**不恢复**；
> v1.9.6 恢复的是「core **可测**」这条设计约束（纯函数 · `rng` 注入 · 无模块级可变状态）。「可以测」≠「必须测」。

## 五、例外登记

    E1 core/sudoku/rules.ts 的 getSudoku：模块级 Map 记忆化（对入参可观察等价于纯函数）—— 同时是 R11 的例外
    E2 render/board.ts 的 setupCanvas：读 devicePixelRatio / 写 canvas 尺寸（canvas 适配器）
    E3 GameStore 类型放 stores/game.ts 而不是 types/（见 R13）
    E4 预留类型登记在守卫 RESERVED_TYPES：Page / User / SearchResult / Puzzle
       现状：User / SearchResult / Puzzle 已被真实引用；Page 仍只靠登记存活
       （建议把 types/item.ts 的 Menu.routeName: string 改成 Page，再摘掉这条登记）
    E5 预览遮罩的缩放由 usePuzzlePreview 持有（内部 useZoom）：与页面主盘 zoom 作用域不同（不同
       canvas），不算违反 R7；页面只需接它给的 previewActions / previewInput
    E6 useBoardCanvas 的 ResizeObserver 是容器宽度的唯一测量源（重绘路径不读布局）；
       渲染器仍保留「没传宽度就自己量一次」的兜底分支
    E7 core/sudoku/tracker.ts 的 place() 返回闭包撤销函数（撤销记录不跨模块，Change 保持私有）
    E8 composables/puzzle/metaText.ts 不是 composable（纯文本拼装函数，无 ref / 生命周期），文件名不以 use 开头
       → 登记在守卫 COMPOSABLE_EXEMPT

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
    跨页共用的视觉规格      → 全局样式（styles/*.css）：card / form / overlay（`.text-btn` 就是「可点击文本」的唯一样式）
    跨页共用的流程          → 公共组合式（useListQuery 列表查询 · usePuzzlePreview 预览 · useClipboard 复制 ·
                              usePuzzleStage 出题/编辑的「题面→答案」两阶段 · useSolveFlow 题目求解）
    悬浮提示 / 无障碍名      → **只在传入数据里有才用；没给就不加**（不自行发明文案）

## 八、后端约定（functions/）

    · 复用 core 做服务端校验（同尺寸 / 格式 / 40~65% / 无空行·空列·空宫 / 合法终盘）—— 规则只有一份
    · import core 一律用相对路径（`../../../src/core/...`）（functions 的 tsconfig **没有 paths**，后端只用相对路径）
    · 环境相关逻辑（密码哈希 / 会话 / 限流 / id 生成）只放 functions/utils/
    · 每个接口文件只做四件事：校验参数 → 调 core → 读写 D1 → 用 utils/json 统一响应
    · 列表类接口统一回 { items, total }；可选字段一律走白名单（例：visibility 只认三态常量）
    · 类型检查关卡：pnpm typecheck:functions（同一个 functions/tsconfig.json，esbuild 与 tsc 双用）
    · 限流只按 uid（连败 5 次锁 10 分钟）；PBKDF2 迭代 = 10000（Workers CPU 限额）· 会话 7 天
    · 热度去重：同一人 1 小时 1 次（作者本人不计）
    · 守卫扫描范围含 functions/（矩阵行见 §二）

## 九、types/ 索引

| 文件 | 导出 | 使用方 |
|---|---|---|
| board.ts | `Cell` `Board` `NumBoard` `ConflictMask` `Snapshot` `Position` | core / stores / render / composables / components |
| render.ts | `BoardRenderInput` | BoardView props、页面 boardParams、useBoardCanvas、renderBoard(canvas, input, contentWidth?) |
| sudoku.ts | `Sudoku`（手写契约；`hasEmptyGroup` = 手选题面禁「整行/列/宫全空」） | core/sudoku/rules 实现；fill/generate、stores/game、useCustomFlow、functions 使用 |
| rng.ts | `Rng` | core/array.shuffle、core/sudoku/fill、services/sudoku/worker |
| worker.ts | `WorkerRequest`（判别式：generate / solve 两种活）· `GenerateResponse` · `SolveResponse`（多解 = 解列表 `NumBoard[]`）| services/sudoku/worker 与 workerClient |
| game.ts | `GameConfig` `GameMeta` `GameStatus` `GameMode`（`game` / `create` / `solve`）`GameOrigin`（`system` / `custom` / `challenge`）`CreatePhase` | stores/game、core/game/derive、useCreateFlow/useEditFlow/useDifficultyFlow、GamePage |
| item.ts | `Action` `Actions` `Menu` `Menus` `SelectOption` `ListBar` `ListPager` `MyPuzzleRowControls`（🔸 `Menu.disabled`） | TextAction / FormField / ListSection / HomePage、useZoom / useGameFlow / useMyPuzzles … |
| puzzle.ts | `Visibility` · `ListSort` · `PagerMode` · `SearchResult`（含 `uname`）· `MyPuzzle` · `PuzzleDetail` · `MyPuzzleDetail` · `PuzzlePatch`（可提交字段）· `PuzzleData`（**均不含 uid**） | services/api、stores/puzzle、composables/puzzle、PuzzleCard / MyPuzzleRow / PagerBar |
| page.ts | `Page`（路由名类型） | useListQuery、待 `Menu.routeName` 采用（见 E4） |
| user.ts | `User`（含自己的 `uid`）（🔸 `RegisterPayload` `LoginPayload` `AuthResponse`） | stores/user、services/api |

> 列表/详情类型的具体字段见 `REQUIREMENTS.md` §7。

## 十、目录速览（✅ 现有 · ⛔ 规划）

    src/
      core/                 array · page（分页 + 排序/浏览方式归一化）· message（错误文案 / 40~65% / 提交校验）
                            board/{model,ops,metrics,zoom}
                            sudoku/{shape,rules,groups,generator,digger,solver,multiSolver,tracker,parse} · game/derive
      render/               geometry.ts（几何，纯计算）· board.ts（prepareCanvas / paintBoard / paintDirtyCells / getClickPos）
                            layer.ts（线层纯工厂）· paint.ts（单格绘制）· dirty.ts（脏格 + 重绘决策，全纯函数）
      services/             prefs.ts · api/{client,session,userApi,puzzleApi} · sudoku/{worker,workerClient}
      stores/               {game,user,puzzle}.ts
      composables/          useClipboard · useListQuery · usePuzzleExport（题目串导出）
                            auth/{useAuth,useAccountMenu,useAccountPanel} · board/{useBoardCanvas,useZoom,useBoardZoom}
                            game/{useGameFlow,useCreateFlow,useEditFlow,usePuzzleStage,useCustomFlow,useDifficultyFlow}
                            solve/useSolveFlow（题目求解：输入 → Worker 多解 → 逐解浏览）
                            puzzle/{useSearchPuzzle,usePuzzleDetail,usePuzzlePreview,useMyPuzzles,metaText}
      components/           ——— 两个通用件 ———
                            TextAction(可点击文本；不给 onClick = 纯文本) · Flex(direction/gap/align/justify/wrap)
                            ——— 一个通用件吃掉一族（「传数据 + 传渲染方式」）———
                            FormField(text|textarea|password|select|range)
                            Overlay(文本·遮蔽·转圈·按钮条·插槽·宽度可选) · SecretValue(pid/uid 遮蔽↔明文 + 复制)
                            ListSection(骨架) · PagerBar(一分支一形态：进度条 / 滑动条 / 步骤条)
                            ——— 单一形态 ———
                            BoardView(只读=纯 canvas / 可玩=接点击 · zoomActions 贴棋盘) · RenameText · EyeGlyph
                            NumberPad · MyPuzzleRow(私人列表项) · PuzzleCard(公开列表项)
                            PagerSliderView · PagerStepsView
                            ——— 共 15 个 ———（元信息行文本是 metaText.ts 的活，不占组件）
      pages/                AppLayout · HomePage · DifficultyPage · GamePage · CreatePage · EditPuzzlePage
                            LoginPage · SearchPage · MyPuzzlesPage · PuzzleViewPage · SolvePage
                            difficulty/{SystemPage,CustomPage}
      constants/            board · game · pages · user · puzzle · solve
      types/                见 §九
      styles/               card.css（页面卡片）· form.css（控件 / 状态 / 列表公共 · 子导航 Tab：.sub-nav / .sub-tab）· overlay.css（遮罩文案 / 账号卡）
      router/

    仓库顶层：
      functions/tsconfig.json            esbuild 与 tsc 双用（无 paths：后端只用相对路径）
      functions/types.ts · _middleware.ts · utils/{id,auth,json,user,puzzle}.ts
      functions/api/{register,login,logout,me}.ts
      functions/api/puzzles/{index,[pid],mine/[rowId],[pid]/play}.ts
      schema.sql（幂等：CREATE TABLE / INDEX IF NOT EXISTS）· wrangler.toml
      worker-configuration.d.ts（wrangler types 生成并已提交）· README.md（极简版）
      PROJECT.md（项目全景导读：框架 / 设计 / 为什么这么设计 / 实现细节 / 数据流动 / 决策与坑）
      CODE-GUIDE.md（代码导读：pages / components / composables / stores / core 各层为什么这么写 + 反模式清单）
      REQUIREMENTS.md（需求与验收）· ARCHITECTURE.md（本文）

## 十一、用法

    pnpm guard                # 红规则（违规 exit 1；build **不含**它，需单独跑）
    pnpm typecheck            # vue-tsc（只查 src/）
    pnpm typecheck:functions  # tsc -p functions/tsconfig.json（查后端）
    pnpm format               # prettier（src/**/*.{ts,vue,css}）
    pnpm build                # vue-tsc -b + typecheck:functions + vite build（guard 单独跑）

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
- v1.8.3：**core 新增 `message.ts`**（`errorTextOf` / `blankRatioErrorOf` / `puzzleSubmitErrorOf`，3 个导出；
  全站 11 处错误文案与 3 处 40%~70% 文案收口，出题 / 编辑提交校验合一）；**`Sudoku` 契约 ＋`hasEmptyGroup`**
  （手选题面禁整行 / 整列 / 整宫全空，`functions/utils/puzzle.ts` 同规则复校）；§八 / §九 / §十 同步
- v1.8.4：**组合式去重（P2/P3）**：`core/page.ts` ＋`sortOf` / `pagerModeOf`（条件归一化不再散在
  `useListQuery` 里各写两遍）；`types/puzzle.ts` ＋`PuzzlePatch`（PATCH 字段一份形状）；`stores/game`
  ＋`startFromTexts`（我的题目与落地页的「挑战」共用开局）；`stores/puzzle` 列表取数收成内部
  `loadPage`；`useMyPuzzles` ＋`withDetail`；`tracker.place` 抽内部 `drop`；`render/board` 小整
- v1.8.5：＋**`composables/game/usePuzzleStage.ts`**（出题页 / 编辑页共用的「题面 → 答案」两阶段状态机：
  `phase` / `puzzleSnapshot` / `errorMsg` / `showFail` + `resetStage` / `submitPuzzle` / `checkSolution` /
  `backToEdit`）→ `useCreateFlow` 与 `useEditFlow` 各省 ≈20 行，只留各自不同的部分（标题 / 缩放 /
  POST / PATCH / 跳转）；页面里两个已被 `Action` 去掉的 `title` 字段一并清掉（§六、§十 同步）

- v1.8.6：**拆 `core/sudoku/generate.ts`**（407 行 → 违反 R9）为四件：`generator`（`generateSolution` / `generatePuzzle`）·
  `digger`（`digPuzzle`）· `solver`（一份引擎 `solveGrid` + 单解 `solvePuzzle`）· `multiSolver`（`solveLimitOf` + `solvePuzzleMulti`）；
  原先的 `dfsFill` / `dfsEnumerate` 两套 DFS 合并成一个引擎（回调决定停止策略）；多解器直接回 `NumBoard[]`（不另设结果类型）；
  顺带修掉 4 个页面越层 import `@/core/board/zoom` 的 R2 违规（改用 `constants/board` 的 `BOARD_ZOOM_BY_BOX`）
  另外给 `solvePuzzle` / `solvePuzzleMulti` 补上「题面自带冲突 → null」的入口守卫（原先「填满即算解」，
  一盘自带冲突的满盘会被当成解返回）
- v1.9.0：＋**题目求解页 `/solve`**（主页入口，游客可用）：两种输入（粘题面串 / 手填棋盘，`GAME_MODE ＋solve` 与出题共用
  一套「手填盘面」）→ 本地校验（全空 / 宫边长 > 6 / 有冲突）→ Worker 多解（判别式协议 + `runInWorker` 复用通道）
  → 只读棋盘 + 步骤条逐解切换（`PagerStepsView` / `PagerBar` ＋可选 `infoText`）；＋`constants/solve` ·
  `composables/solve/useSolveFlow`；§九 / §十 同步（`GameMode` 三值 · worker 消息类型（多解 = 解列表）·
  core/sudoku 清单修正：文档里那个 `fill` 其实并不存在）

- v1.9.1：**求解页两种输入方式改为界面各自独立**（字符串模式不再显示棋盘），按钮「⬇ 填入棋盘」→「✏️ 在棋盘里修改」
  （串为空时渲染成纯文本，点不动）；`Overlay` ＋可选 `wide`（长文本更宽的盒子，默认行为不变），`useClipboard` 供
  「复制」类按钮复用
- v1.9.2：＋**游戏页「📋 导出题目」**（玩到有意思的盘可以带走）：core ＋`givenBoard`（只留 `lock` 的已知格 →
  玩家填的数不进题面串）→ 导出**同一盘的题面串**，**不含答案**（不剧透）；导出状态 / 复制 / 说明行收在
  `composables/usePuzzleExport`，只读框直接写在游戏页（组件数不变 15）
- v1.9.3：主页入口改成「图标列（固定 1.6em · 居中）+ 标签列」两列渲染（原先 `icon + 空格 + 文字` 拼成一整个字符串，
  emoji 字宽不一 → 5 条入口标签起点参差）；`REQUIREMENTS.md` FR-2 的「三入口」同步成实况五入口

- v1.9.4：**约束 / 需求 / 守卫三处同步**：R8 补机器项「`composables/**` 文件名必须 `use*`」（守卫 ＋`COMPOSABLE_NAME` /
  `COMPOSABLE_EXEMPT`，`metaText.ts` 登记 E8）；修掉 R8 里早已删除的 `Action.title`；§四 表格同步。
  `REQUIREMENTS.md`：§4 流程 ＋求解（J）/ 导出（K）；§5 分层归属修正 core/sudoku 清单（`fill` / `generate` 早已不在）、
  ＋求解与导出两行；§8 边界与 §9 验收用例 ＋求解 / 导出各条；§12 ＋第 13 批；§13 ＋守卫新检查；决策 73 → 72

- v1.9.5：**「📋 导出题目」只对「系统生成」开局显示**：`constants/game` ＋`GAME_ORIGIN`（system / custom / challenge）、
  `types/game` ＋`GameOrigin`；`startGame()` 增**必填**第 4 参（3 个调用点各自显式传 —— 系统生成 / 自定义 / 挑战，
  挑战走 `startFromTexts`；必填参数让 TS 保证不漏传）；`useGameFlow.trailActions` 按 `origin` 决定给不给导出
  （自定义有串、挑战有 pid / 落地页，都不需要）

- v1.9.6：**R11 恢复为「core 必须可测」（仍不强制测试）**：守卫 ＋`CORE_STATE`（core 里顶层 `let` / `Map` / `Set`
  = 用例互相串味），`rules.ts` 的 `getSudoku` 缓存登记为例外 E1；`--strict` 与黄提醒**不恢复**、仓库**不预置测试工具链**
  （`.test.ts` 继续豁免，想测随时补）；§三 ＋R11 · §四 表格与脚注同步

- v1.9.7：**棋盘默认缩放跟着盘面大小走**：＋`useBoardZoom(boxSize)`（内部 `useZoom(defaultZoomOf(b))` + `watch` 尺寸变化复位），
  出题 / 编辑 / 游戏 / 落地页 4 页改用它 —— **修掉一个真 bug**：原先 `resetZoom()` 复位的是 setup 那次捕获的值（切到 B=6 仍是
  B=3 的 1.25；落地页因 setup 时 `boxSize = 0` 更是全程 1×）；`useCreateFlow` / `useEditFlow` 不再注入缩放，预览遮罩
  `usePuzzlePreview` 的复位改按解析出的尺寸（同类问题）；R7 / R14 措辞、§四 表格与守卫 `ZOOM_ENTRY`（＋`useBoardZoom(`）同步；
  难度页 `.sub-nav` / `.sub-tab` 提为**全局样式**（`styles/form.css`）→ **题目求解页的输入方式改用同一套 Tab 视觉**

- v1.9.8：求解页动作行收成**一行两件**：题面工具（字符串模式「⬇ 填入棋盘」/ 棋盘模式「🧹 清空棋盘」）移到
  「🧮 求解」**左边同一行**，删掉原先单独那一行；按钮名从「✏️ 在棋盘里修改」改回「⬇ 填入棋盘」（以最终名称为准）

- v1.9.9：缩放默认值**收成一个字典**：`BOARD_ZOOM.default` 由标量 `1` 改成**按宫边长 B 的字典**（并入原 `BOARD_ZOOM_BY_BOX`，
  全站只留一个入口），`defaultZoomOf(boxSize)` 缺省兜底 `BOARD_ZOOM.min`；`useZoom()` 的缺省参数与 `BoardView` 的 `zoom`
  默认值都改指 `BOARD_ZOOM.min`（数值仍是 1，只是语义更明确）

- v1.9.10：**文档按文件事实对齐**：盘面大小 B `2~10`、挖空比例 `40%~65%`（`BLANK_RATIO.max` = 0.65，原文档写 70%）、
  生成超时 15s、`pnpm build` 不含 guard；§八 后端约定补「会话 7 天 · 热度去重 1 小时 1 次」；§十一 用法同步

- v1.9.11：**注释与硬编码文案按现状扫一遍**：`tracker.ts` 里早已不存在的 `fill.ts` → `generator.ts / solver.ts`；
  顺带修两个真 bug —— `CUSTOM_TEXT_MAX` 4000 → **20000**（原值只够 B=6 = 1296 格，而盘面支持到 B=10 = 10000 格，
  自定义 / 求解页粘大棋盘串会被截断）；数字个数提示补全到 `…/2401/4096/6561/10000`（`CUSTOM_COPY` · `SOLVE_COPY` ·
  后端 `fail` 文案三处同源）；§九 术语表与 FR-4 同步

- v1.9.12：**文档引用按文件修正（纯文档，不动代码）**：`REQUIREMENTS.md` 四处引用改成文件现值 ——
  FR-8 遮罩补 `wide?`（Overlay 里已有）· FR-7 排序下拉的真实标签「时间优先 / 热度优先」· FR-7 空态是两段文案
  （`MINE_COPY.empty` + `goCreate`）· §8 的「加载失败，点击重试」与 uid 提示改成实际文案（`errorTextOf` 兜底 +
  `ListSection`「重试」按钮 / `AUTH_COPY.uidHint`）。做法：把文档里「」引用的文案全部拿去 `src` + `functions` 里比对，
  逐条分诊（只有 4 条真引用错，其余是行文转述）

- v1.9.13：**需求文档整篇核一遍（第二轮）**：§0 B/S 的取值范围、§1 灰显规则整段（`aria-disabled` / `.is-disabled` /
  `blocked` 早已不在 src 里）、§2 默认 Tab 改「守卫补」（与决策 44 对齐）、§3 条数 14 → 15、§4「弹标题小框」→ 就地展开、
  各处 `40~70%` → `40~65%`；§八 / §十 的「functions tsconfig 的 paths」改正（该文件**没有 paths**）

- v1.9.14：＋**`PROJECT.md`「项目全景导读」**（给自己看的重启记忆文档）：框架与选型理由 · 分层与依赖铁律 ·
  `NumBoard`/`Board` 两种盘面表示 · core 逐模块 · **10 条端到端数据流** · stores / composables / 三个适配器 ·
  守卫与命令 · 关键决策与踩过的坑 · 改需求的正确顺序与自检清单；三份文档互相引用

- v1.9.15：＋**`CODE-GUIDE.md`「代码导读」**（各层为什么这么写）：先整体（一次交互的五个阶段：pages → components → composables → stores → core，含依赖铁律与四个真实痛点）
  → 再逐层（`core` 纯函数与 rng 注入 · `store` 只记"要记住的"与 computed 单一事实源 · `composable` 为什么是
  store 与组件之间的缺环 · `pages` 为什么必须最薄 / `component` 为什么必须"笨"）→ 两条完整链条（游戏页落子 / 求解页）标注各层各自在做的事
  → §6 决策树「这段逻辑该写哪一层」＋ §7 跨层反模式 12 条（每条都对应一条机器检查）

