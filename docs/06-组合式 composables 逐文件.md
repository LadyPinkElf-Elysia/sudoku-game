# 06 · composables 逐文件详解

> **这一册讲什么**：`src/composables/` **21 个 `use*` 组合式 + 1 个文本 helper（`metaText.ts`，E8 例外）**，逐个讲透 —— 它们是**"编排层"**：把 `stores`（状态）与 `core`（算法）、`services`（取数）**串成用户流程**。
> **前置**：01 册（`ref`/`watch`/生命周期/router）、04 册（core 各函数）、05 册（三个 store）。
> **本册要回答的核心问题**：**"这段逻辑为什么不放 store、也不放组件，而要单独写成一个 composable？"**

> **⚠️ 2026-10 结构变化（读本册前必看）**：按**"只抽可复用的"**原则，**单页专用**的组合式已经**就地写进各自页面**
> （页面预算放宽到 ≤30 顶层声明 / ≤400 行）：
> `auth/useAuth`→LoginPage · `auth/useAccountMenu`→AppLayout · `auth/useAccountPanel`→MyPuzzlesPage ·
> `game/useDifficultyFlow`→SystemPage · `game/useCreateFlow`→CreatePage · `game/useEditFlow`→EditPuzzlePage ·
> `game/useCustomFlow`→CustomPage · `game/useGameFlow`→GamePage · `puzzle/useSearchPuzzle`→SearchPage ·
> `puzzle/useMyPuzzles`→MyPuzzlesPage · `solve/useSolveFlow`→SolvePage · `usePuzzleExport` 并入 `useGameFlow`。
> **下面相应小节保留作"设计说明"**（讲的是同一份逻辑，只是搬到了页面里）；仍留在 `composables/` 的只有：
> `useListQuery` · `useClipboard` · `useZoom`/`useBoardZoom` · `useBoardCanvas`（组件级基础设施）· `usePuzzleStage` ·
> `usePuzzlePreview` · `usePuzzleDetail` · `useStartFromTexts` · `useGameSave` · `metaText`（E8）。

---

## 0. 这一册的固定结构

| 段 | 内容 |
|---|---|
| **① 它编排什么流程** | 一句话 + 输入输出（返回值） |
| **② 逐段解释** | 贴真实代码：`ref` / `computed` / `watch` / 生命周期 / router 各用在哪、为什么 |
| **③ 为什么在这一层** | 为什么不放 store、不放组件、不直接写在页面里 |
| **④ 调用点与传导** | 谁用它、它改了谁、谁跟着变 |

---

## 1. 全景：21 个组合式 + 1 个 helper 的分工

### 1.1 清单

| 分组 | 文件 | 行 | 一句话 |
|---|---|---|---|
| **通用** | `useClipboard.ts` | 23 | 复制到剪贴板（只关心成没成） |
| | `useListQuery.ts` | 80 | 列表页公共查询状态：URL ↔ 本地条件 + 越界收敛 + 浏览偏好 |
| | `usePuzzleExport.ts` | 39 | 题目串导出遮罩（复制题面） |
| **auth** | `auth/useAuth.ts` | 102 | 登录/注册页流程（表单、预校验、提交、回跳） |
| | `auth/useAccountMenu.ts` | 23 | 顶栏账号位（游客/登录两种显示） |
| | `auth/useAccountPanel.ts` | 48 | 「我的」页账号区（就地重命名、退出、uid 取值） |
| **board** | `board/useZoom.ts` | 34 | 缩放状态 + 按钮数据（01 册已细讲） |
| | `board/useBoardCanvas.ts` | 61 | 棋盘画布：绑 canvas、随入参重绘、点击换算（01 册已细讲） |
| **game** | `game/useGameFlow.ts` | 110 | 游玩页：提示、存档、答案遮罩、导出、按钮条、通关（01 册已细讲） |
| | `game/useGameSave.ts` | 69 | **一局存档**：游戏页写入 / 主页读回（真源 → localStorage → `restoreGame`，见 §5.8） |
| | `game/useDifficultyFlow.ts` | 43 | 难度页：草稿配置 → Worker 生成 → 开局跳转 |
| | `game/useCreateFlow.ts` | 94 | 出题页：标题 + 两阶段 + POST 入库 |
| | `game/useEditFlow.ts` | 77 | 编辑页：载入自己的题面 → 两阶段 → PATCH |
| | `game/usePuzzleStage.ts` | 66 | **出题/编辑共用的"题面 → 答案"两阶段状态机** |
| | `game/useCustomFlow.ts` | 129 | 自定义开局：两串校验 → 可选提交 → 开局 |
| | `game/useStartFromTexts.ts` | 32 | **「挑战」开局**（题面/答案串 → 真源：解析 + 比例 + 来源=Challenge）—— 从 store 归位出来的业务 |
| **puzzle** | `puzzle/useSearchPuzzle.ts` | 79 | 搜索页：搜索框分流（pid/uid/关键词）+ 预览 + 挑战 |
| | `puzzle/useMyPuzzles.ts` | 165 | 我的题目页：行内改动（重命名/可见性/答案/删除）+ 预览/挑战/编辑 |
| | `puzzle/usePuzzleDetail.ts` | 81 | 题目详情取数 + 挑战（预览遮罩 / `/p/:pid` 落地页共用） |
| | `puzzle/usePuzzlePreview.ts` | 64 | 预览遮罩（题目/答案共用，只读零副作用） |
| | `puzzle/metaText.ts` | 32 | 元信息行文案（**不是 composable**，见 §2.3 的 E8） |
| **solve** | `solve/useSolveFlow.ts` | 172 | 题目求解：输入（串/手填）→ 本地校验 → Worker 多解 → 逐解浏览 |

### 1.2 依赖图：composable 能依赖什么（R2 矩阵）

```
composables/ 允许依赖：
  ✅ vue（ref/computed/watch/生命周期）· vue-router（useRouter/useRoute）   ← 唯一"两者都有"的层
  ✅ @/stores/**       ← 状态
  ✅ @/services/**     ← 取数（HTTP / Worker / 本地存储）
  ✅ @/core/**         ← 算法
  ✅ @/render/**       ← canvas（只有 useBoardCanvas 用）
  ✅ @/composables/**  ← 互相组合（useCreateFlow 用 usePuzzleStage）
  ✅ @/constants/** · @/types/**
  ❌ @/components/** · @/pages/**   ← 不许反向依赖展示层
```

**一句话**：**composable 是五层里"权力最大"的一层** —— 它同时拿得到状态、算法、网络、路由和响应式。
**所以它也最需要纪律**：R7 只禁了 `Math.`（算式下沉 core），其余靠**约定**（§8 会总结）。

### 1.3 三条"什么该放 composable"的判据

| 判据 | 例子 | 反例（该放别处） |
|---|---|---|
| **它需要 `ref`/`watch`/生命周期/router 吗？** | `useListQuery` 用 `watch` 监听 URL；`useCreateFlow` 在 `onMounted` 重建空盘 | 纯函数（如 `metaTextOf`）→ core 或就近模块 |
| **多个页面/组件共用同一套流程吗？** | `usePuzzleStage`（出题页 + 编辑页）；`usePuzzlePreview`（我的题目页 + 搜索页） | 只有一个页面用一次 → 也可以直接写在页面里（但会顶到 R6 的"声明 ≤10"） |
| **它是"编排"（什么时候算、算完干什么）吗？** | `useDifficultyFlow.apply`：草稿 → Worker → `startGame` → `router.replace` | "怎么算" → core；"记住什么" → store；"画成什么样" → component |

**再加一条**（对应 R7 的"一页一份"）：**页面级唯一实例的 composable 必须在页面 setup 顶层只调一次** —— 例如 `useBoardZoom`（§4）。

---

## 2. 通用三件 + `useListQuery`

### 2.1 `useClipboard.ts`（23 行）—— 复制到剪贴板

```ts
import { ref } from 'vue'

/**
 * 复制到剪贴板：只关心「成没成」，成败文案由调用方决定
 * （登录页写入表单 error，顶栏弹层写入提示条 tip）
 */
export const useClipboard = () => {
    /** 最近一次是否复制成功（供按钮文案「复制 / 已复制」） */
    const copied = ref(false)

    const copy = async (text: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(text)
            copied.value = true
            return true
        } catch {
            copied.value = false
            return false
        }
    }

    return { copied, copy }
}
```

**四个知识点**：

1. **`navigator.clipboard.writeText` 是"可能失败"的浏览器 API**：
   - 需要**安全上下文**（https 或 localhost）；
   - 需要**用户手势**（不能在页面加载时自动复制）；
   - 用户/浏览器策略可能**直接拒绝**。
   → **必须 `try/catch`**（不接住就是未处理异常）。
2. **`catch {}` 不接错误对象**：失败原因（NotAllowedError / 权限…）**对用户没有价值** —— 统一交给调用方给文案。**"这个错误值有用吗？没用就别接。"**
3. **返回 `boolean` 而不是抛错**：与 core 的策略一致（04 册 §3.13，"预期内的失败用返回值表达"）。调用方写法极简（`useAuth.ts:89`）：
   ```ts
   if (!(await copy(createdUid.value))) error.value = AUTH_COPY.copyFailed
   ```
4. **为什么文案不写在这里**：同一个"复制失败"，**两个消费方要放在不同位置**：
   - 登录页 → 写进**表单的 `error`**（内联提示）；
   - 导出遮罩（`usePuzzleExport`）→ 写进**遮罩的说明行 `tip`**。
   → **composable 只给"事实"，调用方决定"怎么呈现"。**

**`copied` 的用途**：给按钮文案用（"📋 复制" ↔ "已复制"）。注意它**不会被自动重置** —— 本项目里因为遮罩用完即关，不需要定时清（**"够用就好"，不提前设计**）。

### 2.2 `usePuzzleExport.ts`（39 行）—— 题目串导出遮罩

```ts
/**
 * 题目串导出（游戏页「📋 导出题目」用；系统出题页不放导出）
 * · **只导题面**：答案不外泄，所以这里只持有题面串
 * · 复制成败写进遮罩说明行（不弹系统提示）
 */
export const usePuzzleExport = () => {
    const open = ref(false)
    const puzzleText = ref('')
    const tip = ref('')
    const { copy } = useClipboard()

    /** 打开遮罩：传题面串（调用方自己决定串从哪来） */
    const show = (nextPuzzleText: string): void => {
        puzzleText.value = nextPuzzleText
        tip.value = ''            // ★ 打开时清掉上一次的「已复制」
        open.value = true
    }

    const close = (): void => { open.value = false }

    const copyPuzzle = async (): Promise<void> => {
        tip.value = (await copy(puzzleText.value))
            ? `${EXPORT_COPY.puzzleShort}已复制`
            : EXPORT_COPY.copyFail
    }

    /** 按钮条：复制题面 + 返回 */
    const actions = computed<Actions>(() => [
        { key: 'puzzle', text: EXPORT_COPY.copyPuzzle, onClick: () => { void copyPuzzle() } },
        { key: 'close', text: EXPORT_COPY.close, onClick: close },
    ])

    return { open, puzzleText, tip, actions, show, close }
}
```

**五个要点**：

1. **`show(nextPuzzleText)` 由调用方传串** → 本文件**不知道**串从哪来（不 import store、不 import core）。
   真实调用点（`useGameFlow.ts:34-37`）：
   ```ts
   const exportPuzzle = (): void => {
       if (!gameStore.board.length) return
       showExport(boardToStr(givenBoard(gameStore.board)))   // ← 谁有数据谁构造串
   }
   ```
   > **职责分离**：`useGameFlow` 有 `gameStore`，所以它负责"取题面串"（04 册 §5.6 的 `givenBoard`）；`usePuzzleExport` 只负责"展示 + 复制"。
2. **打开时 `tip.value = ''`**：清掉上一次的"已复制"（否则用户第二次打开会看到假状态）。
3. **`void copyPuzzle()`**：在事件回调里调用 async 函数 → `void` 显式表示"**故意不 await**"（这是团队约定，也让 lint 的 `no-floating-promises` 满意）。
4. **`actions` 数据化**（`Action[]`）→ 页面 `v-for` 渲染（01 册 §1.9）。
5. **只导题面**（注释）：`solutionText` 根本不进来 —— **"不持有"就是最好的"不外泄"**。

### 2.3 `puzzle/metaText.ts`（32 行）—— **不是 composable 的组合式目录成员（E8）**

```ts
import { PUZZLE_META_COPY } from '@/constants/puzzle'

/** 题目元信息一行的字段（列表项 / 题目详情共用） */
export interface MetaParts {
    sideS: number
    blankCount: number
    /** 出题时间戳；缺（旧数据 / 旧后端未返回）→ 按「现在」显示 */
    createdAt: number
    /** 热度；不传就不显示（详情接口没有这个字段） */
    playCount?: number
    /** 出题人；传了才显示（题目详情用） */
    author?: string
}

/** 出题时间（本地时区、24 小时制、带分钟）；没记录就按「现在」—— **全站唯一**的格式化实现 */
const createdTextOf = (createdAt: number): string => new Date(createdAt || Date.now()).toLocaleString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

/**
 * 元信息行文本：「盘面大小 9×9 · 挖空 N 格 · 创建时间 … · 热度 N · 出题人 X」
 * 组件只负责画一行 `<p class="meta-line">`；文案与时间格式**都在这里**（列表项 / 详情 / 游戏页同一份）
 */
export const metaTextOf = (parts: MetaParts): string => [
    `${PUZZLE_META_COPY.size} ${parts.sideS}×${parts.sideS}`,
    `${PUZZLE_META_COPY.blank} ${parts.blankCount} 格`,
    `${PUZZLE_META_COPY.created} ${createdTextOf(parts.createdAt)}`,
    ...(parts.playCount === undefined ? [] : [`${PUZZLE_META_COPY.hot} ${parts.playCount}`]),
    ...(parts.author ? [`${PUZZLE_META_COPY.author} ${parts.author}`] : []),
].join(' · ')
```

**① 它为什么"不是 composable"（E8 登记的那个例外）**：
它**没有 `ref`、没有生命周期、没有副作用** —— 就是两个纯函数 + 一个接口。
**为什么放在 `composables/` 目录下**：因为它是"**跨页共用的展示逻辑**"（列表项、详情、游戏页信息行**同一份**），按"跨页共用的视觉/文本规格"的归位原则，它天然属于 composable 这一带；但按 R8 的文件命名规则（`composables/**` 的 `.ts` 必须 `use` 开头）它"不该"在这儿 → 于是**登记为例外**（03 册 §5 的 E8，守卫 `COMPOSABLE_EXEMPT`）。
> **这是一个很好的"规则与现实"案例**：规则说"文件名要 `use` 开头"，但更重要的原则是"**这个模块不该被塞进别的层**"。**显式登记例外**比"为了合规把它塞进 core/或 components"更好。

**② `createdTextOf` 的三件事（值得记）**：

| 做法 | 为什么 |
|---|---|
| `toLocaleString('zh-CN', { year, month, day, hour, minute, hourCycle: 'h23' })` | **本地时区 + 24 小时制**（`h23` 明确避免"上午/下午"歧义）；比手拼 `getFullYear()` 等更短也更不容易出错 |
| `createdAt \|\| Date.now()` | 注释写明了："缺（旧数据 / 旧后端未返回）→ 按「现在」显示"。**这里用 `\|\|` 反而是对的**：`createdAt = 0` 也是"没有时间"的哨兵值，需要走兜底（对比 00 册 §3.5 讲的 `\|\|` 坑 —— **知道什么时候该用 `??`、什么时候该用 `\|\|` 才是真懂**） |
| **"全站唯一的格式化实现"**（注释） | 列表、详情、游戏页三处显示同一个时间格式 → 改格式只改一行 |

**③ `Date.now()` 出现在这里合规吗**：合规 —— **R3（core 纯度）只约束 `core/`**；`composables/` 是"边界层"，本来就是"把外部世界（时间、随机、网络）接进来"的地方。
> **"不确定性只允许出现在边界"**：core 里禁 `Date.now`/`Math.random`，正是因为**注入点**就在这里（或 `services/`）。

**④ 可选字段的拼接手法**（与 01 册 §3.8 同源）：
```ts
...(parts.playCount === undefined ? [] : [`${PUZZLE_META_COPY.hot} ${parts.playCount}`]),
...(parts.author ? [`${PUZZLE_META_COPY.author} ${parts.author}`] : []),
```
- **`playCount` 用 `=== undefined` 判断**（允许 `0` —— "热度 0" 是要显示的！）；
- **`author` 用真值判断**（空串 = 没有作者，不显示）。
> **两种判断方式的差别在这里被用得恰到好处** —— 这也是"读懂别人的代码"时最该注意的细节。

### 2.4 `useListQuery.ts`（80 行）—— 列表页的"URL 框架"（**本节最值得学的一个**）

**① 它编排什么**：搜索页与我的题目页共用的"**查询条件 ↔ URL ↔ 取数 ↔ 越界收敛**"。
**关键设计**：它**不自己取数**，而是把取数交给调用方注入。

```ts
interface ListQueryOptions {
    /** 本页路由名（用于 router.replace 留在本页） */
    routeName: Page
    /**
     * 取数：关键词/排序/页码已就绪时调用，由各页决定用 store 还是 API
     * 返回 true = 数据已就绪（可继续做页码收敛）；false = 已跳走或无需收敛
     */
    load: (q: { keyword: string; sort: ListSort; page: number }) => Promise<boolean>
    /** 当前总页数（通常来自 store 的 computed） */
    pageCount: () => number
}

/**
 * 列表页公共查询状态：URL(?q&sort&page) ↔ 本地条件、越界收敛、浏览偏好
 * 搜索页与我的题目页共用；页面只管渲染，取数逻辑由 load 注入（R15）
 */
export const useListQuery = (opts: ListQueryOptions) => {
    const route = useRoute()
    const router = useRouter()

    /** 条件（由 URL 驱动） */
    const keyword = ref('')
    const sort = ref<ListSort>(SORT.Time)
    const page = ref(1)
```

**② 依赖注入的三个参数**（这就是"框架 vs 业务"的切分）：

| 参数 | 谁提供 | 为什么不是这个 composable 自己决定 |
|---|---|---|
| `routeName` | 页面 | 两个页面的路由名不同（`PAGE.Search` / `PAGE.MyPuzzles`） |
| `load` | 页面 | **取数方式不同**：搜索页走 `puzzleStore.search`，我的题目走 `puzzleStore.loadMine`（而且搜索页还要处理"pid 命中就跳走"） |
| `pageCount` | 页面 | 页数来自 store 的 `computed`（`puzzleStore.pageCount`） |

> **这就是"抽公共流程"的正确姿势**：**抽取的是"不变的机制"（URL 读写、收敛、偏好），把"会变的业务"作为参数传进来。**（04 册 §4.10 的 `onSolution`、05 册 §3.3 的 `loadPage` 都是同一个套路。）

**③ 浏览偏好：走 localStorage，不进 URL**

```ts
    /** 分页形态：纯 UI 偏好，存本地（不进 URL）；由「浏览方式」下拉选择 */
    const pagerMode = ref<PagerMode>(pagerModeOf(readPref(PREF_KEY_PAGER_MODE)))

    const changePagerMode = (value: string): void => {
        pagerMode.value = pagerModeOf(value)
        writePref(PREF_KEY_PAGER_MODE, pagerMode.value)
    }
```
- **读出来先归一化**（`pagerModeOf`，04 册 §17.2）：localStorage 里的值可能是旧版本 / 被手改过；
- **写回去的是"归一化之后的值"**（`pagerMode.value`）→ **本地存储里永远是合法值**（不会因为写入脏值而埋雷）。

**④ 核心：URL 是唯一真源（单向数据流）**

```ts
    /** 只改 URL；真正的请求交给下面的 watch 统一发出（深链接、浏览器后退同一条路） */
    const applyQuery = (nextPage: number, nextSort?: ListSort): void => {
        const query: Record<string, string | number> = { sort: nextSort ?? sort.value, page: nextPage }
        if (keyword.value) query.q = keyword.value
        void router.replace({ name: opts.routeName, query })
    }

    const onSearch = (): void => applyQuery(1)                        // 搜索 → 回第 1 页
    const changeSort = (value: string): void => applyQuery(1, sortOf(value))   // 换排序 → 回第 1 页
    const changePage = (next: number): void => applyQuery(next)
```

**三个动作都只做一件事：改 URL**（注意 `onSearch` / `changeSort` 都传 `1` = **重置到第 1 页**，这就是 R15 的"换条件要重置页码"）。

**⑤ watch：唯一取数入口（四条路径合一）**

```ts
    watch(
        () => [route.query.q, route.query.sort, route.query.page],
        () => {
            keyword.value = String(route.query.q ?? '')
            sort.value = sortOf(route.query.sort)
            page.value = Number(route.query.page ?? 1) || 1
            void loadAndClamp()
        },
        { immediate: true },
    )
```

**为什么必须"只改 URL、由 watch 统一取数"**（这是本节的精髓）：

| 用户路径 | 走哪条代码 |
|---|---|
| 点搜索按钮 / 换排序 / 翻页 | `applyQuery` → 改 URL → **watch 触发** |
| 浏览器**后退/前进** | URL 变 → **watch 触发** |
| **粘贴深链接**（`/search?q=xxx&page=2`） | 首次进入 → `immediate: true` → **watch 触发** |
| 点"重试" | `retry()` → 直接调 `loadAndClamp()` |

**四条路径全部汇聚到同一个 `loadAndClamp()`** —— 如果让按钮"直接发请求"，那后退和深链接就**不会**取数（这是新手最常见的 bug：手点没问题，一刷新就空白）。

**三个解析细节**：
- `String(route.query.q ?? '')`：query 值可能是数组（`?q=a&q=b`）→ `String` 归一化；
- `sortOf(...)`：**URL 是不可信输入** → 白名单归一化（04 册 §17.2）；
- `Number(route.query.page ?? 1) || 1`：转数字 + **`NaN`/`0` 兜底成 1**（`||` 在这里正好合适）。

**⑥ 取数 + 越界收敛**

```ts
    /** 取数 + 越界收敛（页数由各页给出；跳走时不做收敛） */
    const loadAndClamp = async (): Promise<void> => {
        const ready = await opts.load({ keyword: keyword.value, sort: sort.value, page: page.value })
        if (!ready) return
        const bounded = clampPage(page.value, opts.pageCount())
        if (bounded !== page.value) applyQuery(bounded)
    }

    const retry = (): void => { void loadAndClamp() }
```

**两个关键点**：

1. **`load` 返回 `boolean`（ready）**：搜索页有一种情况是"**已经跳走了**" —— 用户粘的是 20 位 pid，命中后就 `router.push` 去落地页：
   ```ts
   // useSearchPuzzle.load 里
   await router.push({ name: PAGE.PuzzleView, params: { pid: text } })
   return false                      // 已跳落地页 → 不做页码收敛
   ```
   **如果此时还去收敛页码**，就会用"上一页的 `pageCount`"去改 URL，**把用户从落地页"拽回"搜索页**（因为 `router.replace` 会改当前路由）。**`ready = false` 就是"别管我了"。**
2. **`if (bounded !== page.value)` 是"防自激"的关键**：
   ```
   applyQuery(bounded) → URL 的 page 变 → watch 触发 → loadAndClamp
     → clampPage 算出同一个 bounded → 相等 → 不再 applyQuery → 停止 ✅
   ```
   **不加这个判断**：只要 `page > pageCount`，就会"改 URL → 触发 → 再改 URL"**无限循环**（浏览器卡死）。

> **知识点：任何"读状态 → 写状态"的回调都必须有"值真的变了才写"的守卫** —— 这是响应式编程里防死循环的通用手法（05 册 §3.3 的 `width !== contentWidth.value`、01 册 §3.4 的 `measure()` 都是同一招）。

**⑦ 返回值**：`keyword / sort / page / pagerMode / changePagerMode / onSearch / changeSort / changePage / retry`
**没暴露** `applyQuery` 与 `loadAndClamp` → **内部机制不外泄**（同 05 册的"私有动作"思路）；页面只能用**语义化入口**改状态。

**⑧ 为什么用 `router.replace` 而不是 `push`**：搜索/换排序/翻页会频繁改 URL，用 `push` 会让浏览器历史塞满（用户按一次后退只退回"上一个搜索条件"，要按很多次才能回上一页）；`replace` 让**后退直接回上一个页面**，而**深链接与前进后退依然可用**（URL 里始终有完整状态）。

---

## 3. auth 三件：登录注册、顶栏账号位、「我的」页账号区

### 3.1 `auth/useAuth.ts`（102 行）—— 登录 / 注册页流程

**① 它编排什么**：表单（4 个输入）→ 本地预校验 → 提交（注册/登录两条路）→ 错误显示 → 回跳。

**② `safeRedirect`：防"开放重定向"（安全知识点，值得单独讲）**

```ts
/** redirect 只接受站内路径（防开放重定向） */
const safeRedirect = (raw: unknown): string =>
    typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : ''
```

| 判断 | 挡住的攻击 |
|---|---|
| `typeof raw === 'string'` | 参数可能是数组 / `undefined`（`?redirect=a&redirect=b`） |
| `raw.startsWith('/')` | `?redirect=https://evil.com` —— 直接跳到**外部钓鱼站** |
| **`!raw.startsWith('//')`** | `?redirect=//evil.com` —— **协议相对 URL**！浏览器会解析成 `https://evil.com` → **只判断 `startsWith('/')` 是漏洞** |

**真实风险场景**：攻击者发一个"本站登录页"链接 `…/login?redirect=//evil.com`；用户看到域名是本站、放心登录 → **登录成功后被跳到钓鱼站**（而且用户以为还在本站）。
**这叫开放重定向（Open Redirect）** —— 常见于"登录后回跳"这类功能，**必须做白名单/路径校验**。

**用法**（`submit` / `doneAfterSignUp` 各一次）：

```ts
await router.replace(safeRedirect(route.query.redirect) || { name: PAGE.Home })
```
`safeRedirect` 返回 `''`（假值）→ `||` 兜底回首页 ✅

**③ `mode` 跟随 query（可深链接、可后退）**

```ts
/** 模式跟随 query（可深链接、可后退） */
const mode = computed<AuthMode>(() => (route.query.mode === 'sign-up' ? 'sign-up' : 'sign-in'))
const isSignUp = computed<boolean>(() => mode.value === 'sign-up')

const switchMode = async (next: AuthMode): Promise<void> => {
    error.value = ''
    await router.replace({ name: PAGE.Login, query: { ...route.query, mode: next } })
}
```
- **模式存 URL**（R15：位置放路由）：`/login?mode=sign-up` 可分享、可收藏、可刷新；
- **切模式 = 改 URL**（不是改本地 ref）→ 浏览器后退能回到"登录"那个 tab；
- `AuthMode` 是**字面量联合类型**（00 册 §4.3）→ 传错字符串会被类型检查拦下。

**④ 表单状态与"上次账号预填"**

```ts
const uname = ref('')
const uid = ref(isSignUp.value ? '' : getLastUid())   // 登录模式预填上次账号 ID
const password = ref('')
const password2 = ref('')
const error = ref('')
const loading = ref(false)
/** 注册成功后的「账号 ID」卡片（仅本次会话） */
const createdUid = ref('')
```
- `getLastUid()` 从 localStorage 读（02 册 §3.6）→ **登录模式预填**，用户不用每次去找账号 ID；
- `createdUid` 是"**注册成功但还没确认保存**"的临时状态 → 控制那张"账号 ID 卡片"。

**⑤ `onUidPaste`：粘贴时去掉所有空白（很实用的一招）**

```ts
/**
 * 粘贴账号 ID：去掉所有空白字符（从备忘录 / 聊天里复制常带空格与换行）
 * · 大小写敏感 → 不做任何大小写转换
 * · preventDefault 后自行写回，避免把空白一起塞进输入框
 */
const onUidPaste = (e: ClipboardEvent): void => {
    const text = e.clipboardData?.getData('text') ?? ''
    if (!text) return
    e.preventDefault()
    uid.value = text.replace(/\s/g, '')
}
```
- **为什么要自己处理粘贴**：账号 ID 从聊天/备忘录复制时**常带换行与空格**；不管它，用户会看到"看起来对的 ID"却**登录失败**；
- `e.preventDefault()`：阻止浏览器先插入原文（否则会闪一下再被替换）；
- **不做大小写转换**：注释点明"大小写敏感" → uid 是 **base62**（02 册 §4.5），大小写是不同字符，转了就是另一个账号。

**⑥ `validate`：与服务端共用同一套规则常量**

```ts
/** 本地预校验：与服务端共用同一套规则常量 */
const validate = (): string => {
    if (isSignUp.value) {
        if (!UNAME_PATTERN.test(uname.value.trim())) return AUTH_COPY.unameInvalid
        if (password.value.length < PASSWORD_MIN) return AUTH_COPY.passwordTooShort
        if (password.value !== password2.value) return AUTH_COPY.passwordMismatch
    } else {
        if (!UID_PATTERN.test(uid.value.trim())) return AUTH_COPY.uidInvalid
        if (!password.value) return AUTH_COPY.passwordTooShort
    }
    return ''
}
```
- 常量都来自 `constants/user.ts`（**后端用的是同一批**，02 册 §5.1）→ 前后端规则**不可能不一致**；
- 返回 `''` 表示通过（"错误即文案"，04 册 §16.2）；
- **注册多一道"两次密码一致"**（登录错了能重试，注册错了账号就锁死了）。

**⑦ `submit`：本页最完整的一段（把上面全部串起来）**

```ts
const submit = async (): Promise<void> => {
    if (loading.value) return                     // ① 双击保护
    error.value = validate()                      // ② 本地预校验（失败即返回）
    if (error.value) return

    loading.value = true
    try {
        if (isSignUp.value) {
            await userStore.register({ uname: uname.value.trim(), password: password.value })
            createdUid.value = userStore.uid      // ③ 先弹卡片，等用户确认已保存
            return                                //     ★ 注册成功【不跳页】
        }
        await userStore.login({ uid: uid.value.trim(), password: password.value })
        await router.replace(safeRedirect(route.query.redirect) || { name: PAGE.Home })   // ④ 登录成功回跳
    } catch (err) {
        error.value = errorTextOf(err, '请求失败，请重试')     // ⑤ 统一文案（后端原因原样显示）
    } finally {
        loading.value = false                     // ⑥ 无论如何都复位
    }
}
```

| # | 做法 | 为什么 |
|---|---|---|
| ① | `if (loading.value) return` | **双击保护**：请求进行中再点一次不会重复提交（否则可能"注册两次"） |
| ② | 先 `validate()` 再发请求 | 本地能查出来的错**不必要消耗一次往返**，也更快给用户反馈 |
| ③ | 注册成功**弹卡片、不跳页** | **账号 ID 是登录凭据，只在这一刻能拿到**（`AUTH_COPY.uidHint`："登录需要它，请保存到安全的地方"）→ 必须给用户"复制 / 确认已保存"的机会 |
| ④ | 登录成功 → `safeRedirect(...) \|\| 首页` | 支持"从受保护页被弹到登录页，登录后自动回去" |
| ⑤ | `errorTextOf(err, '请求失败，请重试')` | 后端返回的"账号 ID 或密码错误"会**原样显示**（04 册 §16.1） |
| ⑥ | `finally` 复位 `loading` | **成功 / 失败 / 早退都不能让按钮卡在转圈**（与 05 册 §3.3 同一纪律） |

**⑧ 收尾两个动作**

```ts
/** 复制账号 ID */
const copyUid = async (): Promise<void> => {
    if (!(await copy(createdUid.value))) error.value = AUTH_COPY.copyFailed
}

/** 「我已保存」→ 关卡片并回跳 */
const doneAfterSignUp = async (): Promise<void> => {
    createdUid.value = ''
    await router.replace(safeRedirect(route.query.redirect) || { name: PAGE.Home })
}
```
- `copyUid` 失败写 `error`（表单内错误行）—— 与 `usePuzzleExport` 写 `tip` 形成对照（§2.1 第 4 点）；
- `doneAfterSignUp` 一次做完"关卡片 + 回跳"（关掉后那个 ID 就再也看不到了 → **所以必须先复制/记下来**）。

### 3.2 `auth/useAccountMenu.ts`（23 行）—— 顶栏账号位（**一句注释价值千金**）

```ts
/**
 * 顶栏右侧账号位（AppLayout 专用）：
 * · 游客「👤 登录」→ 登录页；登录后「👤 用户名」→「我的」页（账号区 + 我的题目）
 * · 退出登录已移到「我的」页账号区（显示名左边），顶栏不再放退出
 */
export const useAccountMenu = () => {
    const userStore = useUserStore()
    const route = useRoute()

    /** 登录页自己就是入口 → 隐藏右侧那组 */
    const showNav = computed<boolean>(() => route.name !== PAGE.Login)

    // store 里取出的已是「解包后的值」→ 包一层 computed 才能保持响应
    const isGuest = computed<boolean>(() => userStore.isGuest)
    const uname = computed<string>(() => userStore.uname)

    return { isGuest, uname, showNav }
}
```

**① 那句注释为什么价值千金**（把 05 册 §2.5 的坑 1 说透）：

```ts
// ❌ 丢响应式：读到的只是"这一瞬间的值"
return { isGuest: userStore.isGuest }

// ✅ 包一层 computed：getter 每次读取都现取 → 永远跟着 store 变
const isGuest = computed(() => userStore.isGuest)
```
Pinia setup store 里的 `isGuest` 本身是 `computed`，但**一旦你把它的当前值取出来当普通值用，就断了响应式连接**。
**包一层 `computed` = 把"值"变成"取值函数"** —— 与 01 册 §1.11 的"跨层传取值函数而不是快照值"是同一原理的两种写法。
（也可以用 `storeToRefs(userStore)`；本项目选"显式包 computed"：更直观、还能顺手做转换。）

**② `showNav` 体现 composable 的特权**：它用 `useRoute()` 判断"当前是不是登录页" —— **组件不许用 `vue-router`**（R5）→ 这类"依赖当前路由"的判断只能写在 composable 里。

### 3.3 `auth/useAccountPanel.ts`（48 行）——「我的」页账号区

```ts
/** uid 的取值（uid 是登录凭据，默认不给出去） */
const loadUid = async (): Promise<string | null> => userStore.uid
```

**① 为什么是 `async` 且返回 `string | null`**：
注释点明分工 —— "整套在 `SecretValue` 组件里，**这里只给「怎么取真值」**"。
`SecretValue`（遮蔽 ↔ 明文 + 复制）需要一个"**点击时才取真值**"的接口 → `loadUid` 就是**供给它的形状**（**接口形状由消费方决定**）；返回 `string | null` 是**允许"取不到"**（如未登录），组件据此显示失败。

**② 就地重命名：四个状态 + 四个动作**

```ts
/** 就地重命名：非法（2~16 位）→ 留在输入框并给提示；没改 → 直接收起 */
const renaming = ref(false)
const renameText = ref('')
const renameError = ref('')
const startRename = (): void => { renaming.value = true; renameText.value = userStore.uname; renameError.value = '' }
const cancelRename = (): void => { renaming.value = false; renameError.value = '' }
const onRenameInput = (text: string): void => { renameText.value = text; renameError.value = '' }
const commitRename = async (): Promise<void> => {
    if (!renaming.value) return
    const name = renameText.value.trim()
    if (!UNAME_PATTERN.test(name)) { renameError.value = AUTH_COPY.unameInvalid; return }   // ① 非法 → 留在输入框
    renaming.value = false                                                                   // ② 先收起
    if (name !== userStore.uname) await userStore.rename(name)                               // ③ 真变了才请求
}
```

**三个要点**：
1. **`renameText` 由组件通过 `onRenameInput` 回写**（受控输入）→ **组件不碰 store，只回调**（R5 的落地）；
2. **校验失败"留在输入框 + 给提示"**（不关掉重来）→ 用户不用重新点"重命名"；
3. **`if (name !== userStore.uname)` 值真的变了才 PATCH** —— 与 `useListQuery` 的"防自激"、`useMyPuzzles.setVisibility` 的"值真的变了才 PATCH"是**同一条纪律**：**别发无意义的请求**（`startRename` 预填了当前名字，用户不改直接点确定时就是它挡住空请求）。

**③ 退出登录**

```ts
/** 退出：先删后端 session，再回主页（受保护页不会自己退出） */
const logout = async (): Promise<void> => {
    await userStore.logout()
    await router.replace({ name: PAGE.Home })
}
```
- **先 `await userStore.logout()`**：它内部 `try { await apiLogout() } finally { profile.value = null }`（01 册 §2.3 ⑤）→ 确保**后端 session 真的被删**，不只是本地清状态；
- **`router.replace`**（不是 `push`）：登出后不该还能"后退回到刚才那个页面"；
- 注释"受保护页不会自己退出"：登出动作**只在这里**（顶栏早就不放退出了，见 §3.2 的注释）。

---

## 4. board 两件：缩放与画布

### 4.1 `board/useZoom.ts`（34 行）—— **为什么缩放必须是 composable 而不是 store**

```ts
/** 缺省 = 不放大（`min`）；「按盘面大小给默认缩放」走 `useBoardZoom` / `defaultZoomOf` */
export const useZoom = (initial: number = BOARD_ZOOM.min) => {
    const zoom = ref<number>(clampZoom(initial))
    const zoomIn = (): void => { zoom.value = zoomInOf(zoom.value) }
    const zoomOut = (): void => { zoom.value = zoomOutOf(zoom.value) }
    const resetZoom = (to: number = initial): void => { zoom.value = clampZoom(to) }
    const canZoomIn = computed(() => canZoomInFrom(zoom.value))
    const canZoomOut = computed(() => canZoomOutFrom(zoom.value))
    /** 缩放这一对按钮的数据：到界就不给点击函数（组件就渲染成纯文本） */
    const zoomActions: ComputedRef<Actions> = computed(() => [
        actionOf(ACTION.zoomOut, canZoomOut.value ? zoomOut : undefined),
        actionOf(ACTION.zoomIn, canZoomIn.value ? zoomIn : undefined),
    ])
    return { zoom, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut, zoomActions }
}

/**
 * 棋盘缩放（**默认值跟着盘面大小走**）：传一个「当前盘面大小」的取值函数，
 * 尺寸一变就复位到该尺寸的默认缩放（`BOARD_ZOOM.default` 字典）。
 */
export const useBoardZoom = (boxSize: () => number) => {
    const state = useZoom(defaultZoomOf(boxSize()))
    watch(() => boxSize(), (next) => { state.resetZoom(defaultZoomOf(next)) })
    return state
}
```

**① 它为什么不是 store**（05 册 §1.2 判据的又一次应用）：

| 现象 | 说明 |
|---|---|
| **同一时刻存在多份缩放** | 游玩盘、答案遮罩、预览遮罩、（求解页的）输入盘与结果盘 —— **各自独立** |
| 进 store 会怎样 | 要开 5 个字段（`gameZoom` / `answerZoom` / `previewZoom` / …）或一个 `Record<用途, number>`，而"用途"还是动态的 |
| 用 composable | **各调一份，各自跟着自己的组件生命周期**：遮罩关了，它的 `zoom` 就随组件一起没了 |

> **判据升级版**：**"多份实例、生命周期跟组件走"的状态 → composable；"全局唯一"的状态 → store。**
> 本项目的三个 store 全是"全局唯一"的（一局游戏、一份列表、一个登录态）。

**② 一个 composable = 一块 UI 的完整能力**（状态 + 派生 + 动作 + 控件数据）：

| 返回项 | 类别 | 谁用 |
|---|---|---|
| `zoom` | 状态（`ref`） | 页面 → `BoardRenderInput.zoom`（→ canvas 尺寸） |
| `canZoomIn` / `canZoomOut` | 派生 | 内部用 |
| `zoomIn` / `zoomOut` / `resetZoom` | 动作 | 按钮点击 / 流程复位用它 |
| **`zoomActions`** | **控件数据**（`Action[]`） | 直接 `:zoom-actions="zoomActions"` 传进棋盘 |

**R7 的原话说得正是这件事**："可复用的控件定义（需要闭包）随 composable 返回，由页面 spread"。

**③ `onClick: canZoomOut.value ? zoomOut : undefined` —— `Action` 契约的妙用**：
- **到界了就不给 `onClick`** → 组件按契约渲染成"**纯文本**"（03 册 R8 的 `Action` 契约、01 册 §1.9 的 `.zoom-btn`）；
- **好处**：**"能不能点"这个业务判断留在 composable，组件完全没有 `disabled` 逻辑**（组件保持"笨"）。

**④ `useBoardZoom` 的两个关键点**（01 册 §1.5 / §1.11 已细讲，这里点题）：
1. **参数是"取值函数"`() => number`**：页面首次渲染时 `boxSize` 可能还是 0，之后变成 16（载入大盘面）→ **传"值"会永远拿到旧值**；
2. **`watch(() => boxSize(), …)` 复位**：盘面变了就把缩放重置成新尺寸的默认值（`defaultZoomOf` 字典，04 册 §6.4）—— 否则"16×16 的盘 + 9×9 的缩放"会显示成半个棋盘。

**⑤ "一页一份只调一次"（R7）**：
页面顶层调一次 `useBoardZoom(() => gameStore.config.boxSize)`，再把 `zoomActions` 传进 `BoardView`。
**如果 `BoardView` 内部自己调 `useZoom()`**：就会出现"**两个互不相干的缩放**" —— 按钮改的是 A，画布读的是 B → **点了没反应**（这类 bug 极难查）。
**E5 的例外**：`usePuzzlePreview` 内部自己调 `useZoom` 是合法的 —— 那是**另一块 canvas**（作用域本来就不同）。

### 4.2 `board/useBoardCanvas.ts`（61 行）—— "绑定画布 + 调度重绘 + 点击换算"

```ts
/**
 * 棋盘画布：绑定 canvas、随入参重绘、容器尺寸变化重绘、点击换算成行列
 * 容器宽度只由 ResizeObserver 量一次写入 ref —— 重绘路径不再读布局（避免每次输入强制 reflow）
 * `boxEl` 是外层滚动框（量它的宽度）；canvas 的直接父级会随棋盘收缩，量它会形成反馈
 */
export const useBoardCanvas = (
    canvasEl: Ref<HTMLCanvasElement | null>,
    boxEl: Ref<HTMLElement | null>,
    input: () => BoardRenderInput,
    onCellClick?: (pos: Position) => void,
) => {
    /** 容器内容宽（0 = 还没量到，交由渲染器自己兜底量一次） */
    const contentWidth = ref(0)

    /** 按当前入参重绘；缺省值由 renderBoard 兜底 */
    const draw = (): void => {
        // 先读一遍依赖，保证 watchEffect 建立追踪（哪怕本次提前返回）
        const canvas = canvasEl.value
        const { board, boxSize, selected, conflictMask, zoom } = input()
        if (!canvas || !board.length) return

        renderBoard(canvas, { board, boxSize, selected, conflictMask, zoom }, contentWidth.value || undefined)
    }

    /** 量外层滚动框的内容宽；值变了才会触发重绘（watchEffect 追踪 contentWidth） */
    const measure = (): void => {
        const box = boxEl.value
        const width = box ? measureContentWidth(box) : 0
        if (width !== contentWidth.value) contentWidth.value = width
    }

    watchEffect(draw)

    let ro: ResizeObserver | null = null
    onMounted(() => {
        const box = boxEl.value
        if (!box) return
        ro = new ResizeObserver(measure)
        ro.observe(box)
        measure()
    })
    onBeforeUnmount(() => { ro?.disconnect(); ro = null })

    /** canvas 点击 → 行列坐标；越界或关闭交互则不发事件 */
    const onCanvasClick = (e: MouseEvent): void => {
        const canvas = canvasEl.value
        const { board, interactive } = input()
        if (!canvas || interactive === false || !board.length) return
        const pos = getClickPos(canvas, e, board.length)
        if (pos) onCellClick?.(pos)
    }

    return { onCanvasClick }
}
```

**① 四个参数都是"注入"的（依赖注入的教科书示例）**：

| 参数 | 为什么不让它自己找 |
|---|---|
| `canvasEl` / `boxEl` | **模板 ref 只有组件才有**（`ref<HTMLCanvasElement\|null>(null)` + `ref="canvasEl"`）→ 由组件传进来；composable 只"操作"，不"寻找" |
| `input: () => BoardRenderInput` | **取值函数**（01 册 §1.11 坑 2）：每次重绘都现读最新 props |
| `onCellClick` | **回调**：点击之后干什么由调用方决定（游戏页落子 / 求解页填格 / 预览不接） |

> **这套签名的意义**：它**完全不认识业务** —— 不知道数独规则、不知道 store、不知道路由。
> **所以 `BoardView`（可玩）、答案遮罩（只读）、预览遮罩、求解页的输入盘与结果盘能共用同一个 composable。**

**② `draw()` 里那句"先读一遍依赖"（最容易踩的坑）**：

```ts
const canvas = canvasEl.value
const { board, boxSize, selected, conflictMask, zoom } = input()
if (!canvas || !board.length) return     // ← 早退
```
`watchEffect` 靠"**执行时读了谁**"决定追踪谁。**如果先写 `if (!canvas) return`**：
- canvas 还没挂载时，这次执行只读到了 `canvasEl` → **只追踪它**；
- 之后 `board` 更新 → **不会触发重绘**（依赖里没有 `board`）。
**结论**：**要追踪的依赖必须在任何分支之前读到**（01 册 §3.5）。

**③ `measure()` 的"值变了才写"**（与 `useListQuery` 的防自激同一招）：
```ts
if (width !== contentWidth.value) contentWidth.value = width
```
否则 `ResizeObserver` 回调 → 改 `contentWidth` → 触发 `watchEffect` → 重绘 → 尺寸可能再变 → …… **形成循环**。

**④ 为什么"量外层滚动框"而不是"canvas 的直接父级"（E6）**：
`canvas` 的直接父级宽度**由 canvas 决定**（`display:flex` + 内容宽度）→ "量它 → 决定棋盘大小 → 又决定它"是**反馈循环**（棋盘会越缩越小）。
**量外层滚动框**（`.board-scroll-container`，宽度由页面决定）→ 参照物稳定。
**代码里的对应**：`BoardView.vue` 把 `boxEl` 绑在 `.board-scroll-container` 上，注释也写明了原因（01 册 §3.4）。

**⑤ 生命周期与清理**：
```ts
onMounted(() => { … ro = new ResizeObserver(measure); ro.observe(box); measure() })
onBeforeUnmount(() => { ro?.disconnect(); ro = null })
```
- **`onMounted` 之后模板 ref 才有值**（01 册 §1.6）；
- **`onBeforeUnmount` 必须 `disconnect()`**：否则组件销毁后回调还挂着（内存泄漏 + 对已卸载组件的无意义操作）；
- **`measure()` 在 `onMounted` 里手动调一次**：不等首次回调（注释说"observe 时会先回调一次 → 完成首测"，但显式调更稳）；
- **`watchEffect` 不用手动停**：它在组件作用域内创建 → **随组件卸载自动停止**（这是 composable 相对"手写 addEventListener"的一大优势）。

**⑥ `onCanvasClick` 的三个守卫**：
```ts
if (!canvas || interactive === false || !board.length) return
const pos = getClickPos(canvas, e, board.length)
if (pos) onCellClick?.(pos)
```
- `interactive === false`：预览/答案盘是只读的 → 点了不发事件（`BoardView` 甚至写了 `v-on="interactive ? { click } : {}"`，01 册 §1.9 双保险）；
- `!board.length`：空盘没有格子可点；
- **`getClickPos` 返回 `null`（越界 / 尺寸为 0）就不发事件**（04 册 §3.4 的回调链）；
- **`onCellClick?.()`**：回调**可选** → 只读场景可以不传（预览只传渲染入参）。

---

## 5. game 七件：从难度页到游玩页的全部流程

**① 这一组的分工（先看这张表，再看细节）**：

| 文件 | 页面 | 它管什么 | 它不管什么 |
|---|---|---|---|
| `useDifficultyFlow` | 难度页 | 配置草稿 → Worker 生成 → 开局 → 跳转 | 缩放（页面自己的 `useBoardZoom`） |
| `usePuzzleStage` | **出题页 + 编辑页共用** | "题面 → 答案"两阶段状态机 + 两个校验 | 标题、POST/PATCH、跳转 |
| `useCreateFlow` | 出题页 | 标题 + `usePuzzleStage` + POST 入库 | 两阶段细节 |
| `useEditFlow` | 编辑页 | 载入自己的题面 + `usePuzzleStage` + PATCH | 同上 |
| `useCustomFlow` | 自定义页 | 两串校验 → 可选提交 → 开局 | 手填盘（自定义走"粘串"路线） |
| `useStartFromTexts` | **我的题目页 + 落地页共用** | 题面/答案串 → 开局（解析 + 算比例 + 来源 = Challenge） | 取详情、跳页（由调用方决定） |
| `useGameFlow` | 游戏页 | 提示 / 答案遮罩 / 导出 / 按钮条 / 通关 | 盘面状态（都在 `gameStore`） |

**② 一条重要的结构性事实**：**出题与编辑共用同一个状态机（`usePuzzleStage`），但各自持有自己的"页面级"逻辑**（标题、入库、跳转）。
这正是 03 册 §六 归位原则里那句"**跨页共用的流程 → 公共组合式**"的落地。

### 5.1 `game/useDifficultyFlow.ts`（43 行）—— 难度页：配置 → 生成 → 开局

```ts
/** 难度页：配置草稿 → 后台生成题目 → 开局并跳转；每页一份 */
export const useDifficultyFlow = () => {
    const gameStore = useGameStore()
    const router = useRouter()

    /** 配置草稿（可变：盘面大小走下拉、挖空比例走滑杆）—— 用 GameConfig 放宽字面量类型 */
    const draft = ref<GameConfig>({ ...GAME_INIT_CONFIG })
    const loading = ref(false)
    const error = ref('')

    const totalCells = computed(() => cellCountOf(draft.value.boxSize))
    const blankCount = computed(() => blankCountOf(draft.value.boxSize, draft.value.blankRatio))
    const blankPercent = computed<number>(() => percentOf(draft.value.blankRatio))

    /** 生成并开局 */
    const apply = async (): Promise<void> => {
        if (loading.value) return
        error.value = ''
        loading.value = true
        try {
            const cfg: GameConfig = { boxSize: draft.value.boxSize, blankRatio: draft.value.blankRatio }
            const { puzzle, solution } = await generateInWorker(cfg.boxSize, blankCount.value)
            gameStore.startGame(puzzle, solution, cfg, GAME_ORIGIN.System)
            router.replace({ name: PAGE.Game })
        } catch (err) {
            error.value = errorTextOf(err, '生成失败，请重试')
        } finally {
            loading.value = false        // ← 修复：原先成功路径不复位，overlay 会残留
        }
    }

    return { draft, loading, error, totalCells, blankCount, blankPercent, apply }
}
```

**① `draft` 为什么不进 store（"草稿"模式）**：
用户还没点"开始"，配置只是**正在输入的东西** → 按 05 册 §5.2 的判据（"表单里正在输入的临时值 → 页面 / composable"）它属于本页。
**更实际的理由**：进 store 会让"上次没提交的草稿"**跨页面残留**（用户下次进难度页看到的是上次的临时值，而不是默认值）—— **"临时"就该有临时的生命周期**。

**② 三个派生全部来自 core**（页面禁 `Math.`，R6）：

| 派生 | 来自 core | 用途 |
|---|---|---|
| `totalCells` | `cellCountOf(B)` | 显示"共 81 格" |
| `blankCount` | `blankCountOf(B, ratio)` | **传给 Worker 的挖空数**（04 册 §7.1：`floor(cells × ratio)`） |
| `blankPercent` | `percentOf(ratio)` | 显示"挖空 45%"（04 册 §15.3） |

**③ `apply` 的五步（一个标准的"防重复 + 异步 + 复位"流程）**：

```
if (loading) return                 ① 双击保护
error = ''                          ② 清旧错误（开始就清）
loading = true
try:
    await generateInWorker(...)     ③ 送进 Worker（01 册 §3.7：不冻结 UI）
    gameStore.startGame(...)        ④ 开局（05 册 §2.11：唯一入口，7 个字段一起重置）
    router.replace(Game)            ⑤ 跳页
catch: error = errorTextOf(err, '生成失败，请重试')
finally: loading = false
```

**④ `cfg` 是"另外构造"的**：
`startGame` 只需要 `GameConfig`（两个字段）→ 这里**现造一个干净的 cfg**，而不是把 `draft` 整个塞进去。
**好处**：将来 `draft` 加了纯 UI 字段（比如"预览开关"）也不会漏进 store 的 `config`。

**⑤ 那句 `finally` 注释是一条真实 bug 记录**：
> `// ← 修复：原先成功路径不复位，overlay 会残留`

原实现只在失败分支复位 `loading` → 成功时因为立刻 `router.replace` 跳走，**看起来**没问题；但跳转一旦被延迟/打断（或将来改成 `push` 后用户返回），转圈遮罩就会**一直转**。
> **纪律**：**`try` 里有异步，`finally` 就必须复位所有"进行中"标志**（05 册 §3.3、本册 §3.1 都是同一条）。

**⑥ `GAME_ORIGIN.System`**：开局来源决定游戏页给不给"📋 导出题目"（01 册 §3.8 那段条件拼装）。

### 5.2 `game/usePuzzleStage.ts`（66 行）—— **出题/编辑共用的两阶段状态机**（本组最值得学）

```ts
/**
 * 出题页 / 编辑页共用的「题面 → 答案」两阶段状态机（§六：跨页共用的流程 → 公共组合式）
 * · 阶段与阶段数据：`phase` · `puzzleSnapshot`（提交题面时的快照，答案要与它成对）
 * · 提交题面：全空 / 空行空列空宫 / 冲突 / 40%~65% —— 规则全在 `core/message`
 * · 提交答案前：题面 + 答案成对校验（不成立就亮失败遮罩）
 * 页面级的东西（标题、缩放、POST / PATCH、跳转）留在各自流程里，不进这里
 */
export const usePuzzleStage = () => {
    const gameStore = useGameStore()

    /** 当前阶段：填题面 / 填答案 */
    const phase = ref<CreatePhase>(CREATE_PHASE.Puzzle)
    /** 提交题面时快照的题面 */
    const puzzleSnapshot = ref<NumBoard>([])
    const errorMsg = ref('')
    /** 失败遮罩（submit 类错误才弹） */
    const showFail = ref(false)

    /** 回到「填题面」阶段并清掉报错（重建 / 重新载入时用） */
    const resetStage = (): void => {
        phase.value = CREATE_PHASE.Puzzle
        puzzleSnapshot.value = []
        errorMsg.value = ''
        showFail.value = false
    }

    /** 提交题面：校验 → 锁题（规则在 core）→ 进入填答案阶段；false = 校验没过 */
    const submitPuzzle = (): boolean => {
        const bad = puzzleSubmitErrorOf(gameStore.numBoard, gameStore.config.boxSize, gameStore.sudoku)
        if (bad) {
            errorMsg.value = bad
            return false
        }
        errorMsg.value = ''
        puzzleSnapshot.value = gameStore.numBoard     // ★ 存快照（见下面的解释）
        gameStore.lockPuzzle()                        // ★ 锁题（05 册 §2.14）
        phase.value = CREATE_PHASE.Solution
        return true
    }

    /** 提交答案前的成对校验：不成立就亮失败遮罩；false = 校验没过 */
    const checkSolution = (): boolean => {
        if (gameStore.sudoku.validatePuzzle(puzzleSnapshot.value, gameStore.numBoard)) return true
        errorMsg.value = '答案不完整、有冲突，或与题面不符'
        showFail.value = true
        return false
    }

    /** 关掉失败遮罩，继续修改 */
    const backToEdit = (): void => {
        showFail.value = false
        errorMsg.value = ''
    }

    return { phase, puzzleSnapshot, errorMsg, showFail, resetStage, submitPuzzle, checkSolution, backToEdit }
}
```

**① 为什么这个状态机必须独立出来**：
"填题面 → 提交（锁定）→ 填答案 → 成对校验"这两阶段**在出题页和编辑页完全一样**；不同的只是"入库用哪个接口"（POST vs PATCH）。
**共用一份 → 两个页面的流程不可能走偏**（这正是"公共组合式"的价值）。

**② `puzzleSnapshot.value = gameStore.numBoard` 为什么**不需要**拷贝（一个容易看漏的细节）**

表面上这像"存了一个数组引用"（危险），但它安全 —— 因为紧接着的 `gameStore.lockPuzzle()` 会：

```ts
board.value = lockGiven(board.value)     // 返回一个【全新的盘】（04 册 §5.3）
```

- `lockGiven` 用 `mapGrid` **逐格开了新对象** → `board.value` 换成了新数组 + 新 `Cell`；
- 于是 `puzzleSnapshot` 持有的**旧数组再也不会被改动**（后续落子改的是新盘）；
- 同时 `gameStore.numBoard` 是 `computed`，会重算出新数组 → 两者互不干扰 ✅

> **但要记住这个前提**：**它之所以安全，是因为 `lockPuzzle` 是"替换"而不是"就地改"。**
> 如果哪天有人把 `lockPuzzle` 改成"就地遍历改 `lock` 字段"，这一行就会**立刻变成 bug**（快照会跟着当前盘一起变）→ 那时必须补 `cloneBoard`。
> **"读懂一行代码为什么现在是对的"，比记住"这行是对的"重要得多。**

**③ `submitPuzzle` 的四步**：

```
① 校验：core/message.puzzleSubmitErrorOf（全空 → 空行/列/宫 → 冲突 → 40%~65%，04 册 §16.3）
② 存题面快照（答案要与它成对）
③ gameStore.lockPuzzle()（锁死题面格 + 重置历史 —— 阶段不该跨阶段回退，05 册 §2.14）
④ 切到"填答案"阶段
返回 boolean → 让页面决定"校验没过时要额外做什么"（这里只写 errorMsg，不弹遮罩）
```

**④ `checkSolution`：答案的"成对校验"**

```ts
gameStore.sudoku.validatePuzzle(puzzleSnapshot.value, gameStore.numBoard)
```
用的是 core 的**四步校验**（04 册 §9.8）：同形 → 题面无冲突 → 题面 ⊆ 答案 → 答案是合法终盘。
**失败才弹遮罩**（`showFail = true`）—— 它属于"提交类错误"（用户在"提交答案"那一刻触发）；而 `submitPuzzle` 的失败是**就地提示**（`errorMsg`）。
> **同一套 errorMsg，两种呈现方式** —— **由"这一步是提交还是动作"决定**。

**⑤ 职责边界（注释原文）**："标题、缩放、POST / PATCH、跳转留在各自流程里，不进这里"。
这正是"**公共组合式只放共性**"的纪律：一旦把"标题"塞进来，编辑页就得带着一个用不上的 `title` 字段（**污染了公共组件的接口**）。

**⑥ `resetStage` 被谁调用**：
- `useCreateFlow.restart`（切换盘面大小时重建）；
- `useEditFlow.load`（重新载入题目时清掉上一轮残留）。
→ **"回到起点"这件事也只有一份实现。**

### 5.3 `game/useCreateFlow.ts`（94 行）—— 出题页：标题 + 两阶段 + POST

```ts
/** 默认标题「我的题目 9×9」（边长来自 core，不写字面量） */
const defaultTitleOf = (boxSize: number): string => {
    const s = sideOf(boxSize)
    return `${TITLE_PREFIX} ${s}×${s}`
}

/**
 * 出题页流程：标题 + POST 入库；题面/答案两阶段与校验交给 usePuzzleStage（编辑页共用）
 * 每页一份；缩放不在这里管（页面的 `useBoardZoom` 跟着盘面大小走）
 */
export const useCreateFlow = () => {
    const gameStore = useGameStore()
    const router = useRouter()

    /** 两阶段状态机（阶段 / 题面快照 / 报错 / 失败遮罩）—— 与编辑页共用一份 */
    const { phase, puzzleSnapshot, errorMsg, showFail, resetStage, submitPuzzle, checkSolution, backToEdit } =
        usePuzzleStage()

    const title = ref(defaultTitleOf(GAME_INIT_CONFIG.boxSize))
    const loading = ref(false)
    const showSuccess = ref(false)

    /** 重置本地流程状态（阶段那部分交给 usePuzzleStage） */
    const reset = (): void => {
        resetStage()
        showSuccess.value = false
    }

    /** 重建一盘空题（切盘面用）：缩放由页面的 useBoardZoom 跟着盘面大小自动复位 */
    const restart = (boxSize: number): void => {
        reset()
        gameStore.startInput(GAME_MODE.Create, boxSize)   // mode 由调用方给（05 册 §2.13 的归位）
    }

    /** 切换盘面大小：必须重建 board，否则键盘与盘面尺寸不一致 */
    const changeBoxSize = (b: number): void => {
        if (b === gameStore.config.boxSize) return
        const custom = title.value.trim() && title.value !== defaultTitleOf(gameStore.config.boxSize)
            ? title.value
            : ''
        restart(b)
        // 用户改过标题就保留，否则跟随新尺寸给默认名
        title.value = custom || defaultTitleOf(b)
    }

    /** 出题完成 → 去「我的题目」（与编辑完成一致；回主页走顶栏那一个入口） */
    const goMine = (): void => { void router.replace({ name: PAGE.MyPuzzles }) }

    /** 提交答案 → 成对校验（含标题）→ 转圈入库 → 完成遮罩 */
    const submitSolution = async (): Promise<void> => {
        if (loading.value) return
        if (!checkSolution()) return
        const name = title.value.trim()
        if (!name || name.length > TITLE_MAX) {
            errorMsg.value = `标题必填（1~${TITLE_MAX} 位）`
            showFail.value = true
            return
        }

        loading.value = true
        try {
            await create({
                title: name,
                puzzleText: boardToStr(puzzleSnapshot.value),
                solutionText: boardToStr(gameStore.numBoard),
            })
            showSuccess.value = true
        } catch (err) {
            errorMsg.value = errorTextOf(err, '提交失败，请重试')
            showFail.value = true
        } finally {
            loading.value = false
        }
    }

    onMounted(() => restart(GAME_INIT_CONFIG.boxSize))

    return {
        phase, title, errorMsg, loading, showSuccess, showFail,
        changeBoxSize, goMine,
        submitPuzzle, submitSolution, backToEdit,
    }
}
```

**① `defaultTitleOf` 放在模块顶层**（不是 composable 内部）：
它是**纯函数**（没有 `ref`）→ 放外层不会每次调用都重建，也便于**模块内多个函数共用**（`changeBoxSize` 用了两次）。
**注释"边长来自 core，不写字面量"**：标题里的 `9×9` 由 `sideOf(boxSize)` 算出来（**页面禁 `Math.`**，所以"乘方"也必须来自 core）。

**② `changeBoxSize`：一个很贴心的 UX 细节（逐行读）**

```ts
if (b === gameStore.config.boxSize) return                        // ① 没变就不折腾
const custom = title.value.trim() && title.value !== defaultTitleOf(gameStore.config.boxSize)
    ? title.value
    : ''                                                          // ② "用户改过标题吗？"
restart(b)                                                        // ③ 重建盘面（boxSize 变了）
title.value = custom || defaultTitleOf(b)                         // ④ 保留自定义 or 给新默认名
```

**② 那行三元的意思**：当前标题**不等于"旧尺寸的默认标题"** → 说明**用户手动改过** → 保留；否则视为"还没改"→ 换掉。
**⚠️ 顺序不能乱**：必须先算 `custom`（**用旧的 `config.boxSize` 比较**），再 `restart(b)`，最后写 `title`。
若先 `restart` 再比较，`defaultTitleOf(gameStore.config.boxSize)` 已经是**新尺寸的默认名** → 判断永远错。

**③ `restart` 为什么必须重建盘（走 `gameStore.startInput(GAME_MODE.Create, boxSize)`）**：
注释写明："切换盘面大小：**必须重建 board，否则键盘与盘面尺寸不一致**"。
想象：盘面从 9×9 换成 16×16，但 `board` 还是 9×9 → `NumberPad` 按 16 格渲染、盘面只有 9 列 → 点第 12 列时**越界**（`board[r][11]` 是 `undefined`）。
> **"尺寸变了就要重建数据"** —— 凡"尺寸/形状是数据的一部分"的地方都要有这条意识（04 册 §12.1 的 `solveLimitOf`、这里的 `changeBoxSize`）。
> **2026-10 归位**：这里原写 `gameStore.startCreate(boxSize)`；现在 store 只留 `startInput`，**mode 由调用方给**（05 册 §2.13 讲了为什么删掉那两个薄封装）。

**④ `onMounted(() => restart(GAME_INIT_CONFIG.boxSize))`**：
**进页面就重建一盘空题** → 不带上次出题的残留（旧盘面、阶段、成功遮罩全清）。
顺序也有讲究：`restart` 里先 `reset()`（清阶段与遮罩）再 `startInput(...)`（重建盘）—— 与 05 册 §2.11 的 `startGame` 里"最后 `resetHistory()`"是同一种"先立数据、后立状态"。

**⑤ `submitSolution` 的三道关卡（顺序有意义）**

```
① if (loading) return           双击保护
② if (!checkSolution()) return  ★ 题面 + 答案成对校验（来自 usePuzzleStage）
③ 标题校验（非空 + 长度 ≤ TITLE_MAX）→ 失败：写 errorMsg + 弹遮罩
④ POST → showSuccess = true
```

**为什么标题校验放在 `checkSolution` 之后**：**先保证"题本身合法"，再管"名字取好没"**。
用户既没填满答案、又没写标题时，**先告诉他"答案不完整"** —— 那才是更根本的问题（04 册 §16.3 的"顺序即优先级"同一思路）。

**⑥ 两个关键字段的用法（容易记反）**

```ts
puzzleText: boardToStr(puzzleSnapshot.value),      // ★ 题面 = 快照（提交题面那一刻的）
solutionText: boardToStr(gameStore.numBoard),      // ★ 答案 = 当前盘（填满后的）
```
- `puzzleSnapshot` 是"**提交题面时**"存下的（§5.2）；
- `gameStore.board` 现在是"锁定的题面 + 用户填的答案" → `numBoard` 正好是**完整答案**。
**记反的后果**：题面里混进答案（题目失去意义），或答案里全是 0（后端 `validatePuzzle` 直接拒绝，02 册 §5.5）。

**⑦ 成功不是"立刻跳页"，而是 `showSuccess = true`**：
给用户一个**"出题完成"遮罩**（上面有"去我的题目"按钮 `goMine`）→ 明确的完成感 + 告诉用户"接下来去哪"。

### 5.4 `game/useEditFlow.ts`（77 行）—— 编辑页：载入 + 两阶段 + PATCH

```ts
/**
 * 编辑页流程（FR-10）：进入预填自己的题面（未锁定）→（提交题面 / 提交答案与校验交给
 * usePuzzleStage，出题页共用）→ PATCH → 回「我的题目」；不改 created_at，也不含标题/可见性
 */
export const useEditFlow = () => {
    const route = useRoute()
    const router = useRouter()
    const gameStore = useGameStore()

    /** 两阶段状态机（阶段 / 题面快照 / 报错 / 失败遮罩）—— 与出题页共用一份 */
    const { phase, puzzleSnapshot, errorMsg, showFail, resetStage, submitPuzzle, checkSolution, backToEdit } =
        usePuzzleStage()

    const pid = ref('')
    const loading = ref(false)

    const goMyPuzzles = (): void => { void router.replace({ name: PAGE.MyPuzzles }) }

    /** 载入自己的题面（不预填旧答案） */
    const load = async (): Promise<void> => {
        const id = String(route.params.pid ?? '')
        if (!id) { goMyPuzzles(); return }          // ① 没有 pid → 直接回列表

        loading.value = true
        resetStage()       // ② 回到「填题面」阶段（清掉上一轮残留）
        try {
            const detail = await getOne(id)
            const parsed = parsePuzzle(detail.puzzleText)
            if (!parsed) {
                errorMsg.value = '题目数据异常，无法编辑'
                showFail.value = true
                return
            }
            pid.value = id
            gameStore.startInput(GAME_MODE.Create, parsed.boxSize, parsed.board)   // 未锁定 → 可增量改
        } catch (err) {
            errorMsg.value = errorTextOf(err, '题目加载失败')
            showFail.value = true
        } finally {
            loading.value = false
        }
    }

    /** 提交答案：成对校验 → 转圈 PATCH（题面/答案成对提交）→ 回「我的题目」 */
    const submitSolution = async (): Promise<void> => {
        if (loading.value) return
        if (!checkSolution()) return

        loading.value = true
        try {
            await update(pid.value, {
                puzzleText: boardToStr(puzzleSnapshot.value),
                solutionText: boardToStr(gameStore.numBoard),
            })
            goMyPuzzles()
        } catch (err) {
            errorMsg.value = errorTextOf(err, '保存失败，请重试')
            showFail.value = true
        } finally {
            loading.value = false
        }
    }

    onMounted(() => { void load() })

    return { pid, phase, errorMsg, loading, showFail, load, submitPuzzle, submitSolution, backToEdit, goMyPuzzles }
}
```

**① `pid` 来自路径参数（R15）**：路由是 `/puzzle/:pid/edit` → `route.params.pid`。
**"带参数用路径参数"** 的好处：与后端 `PATCH /api/puzzles/:pid` 语义一一对应；将来若做"编辑草稿分享"也天然可用。

**② `if (!id) { goMyPuzzles(); return }`**：防御"手输 URL"（`/puzzle//edit`）→ 没有 pid 就回列表，**不留空白页**。

**③ `resetStage()` 放在请求之前**（顺序有讲究）：
即使请求失败（网络错误 / 404），页面状态也是**干净的"填题面"阶段** —— 不会出现"上一轮阶段残留 + 本轮错误"混在一起。

**④ 载入走的是 `GAME_MODE.Create`（不是 `GAME_MODE.Solve`）**：
编辑 = "手填盘面"的一种（05 册 §2.13：`startInput` 只有 `mode` 不同）。
- `startInput(GAME_MODE.Create, boxSize, board)` → 内部 `fromPuzzle(puzzle, false)` → **未锁定、可增量改**（注释也写："不预填旧答案"）；
- **为什么"不预填旧答案"**：编辑流程与出题一致（阶段①改题面 → 阶段②重新填答案）；预填旧答案会让"阶段②"含义模糊（那是**旧答案**，可能与新题面不匹配）。

**⑤ `submitSolution` 只 PATCH"题面 + 答案"**（注释："不含标题/可见性"）：
- 标题与可见性在**"我的题目"列表行内**改（`useMyPuzzles.patch`，§6.4）；
- 后端 `PATCH` 只处理"给了的字段"（02 册 §5.6）→ **前端少传字段 = 后端不会误改**；
- **题面与答案必须成对提交**（后端会成对复校并重算 `blank_count`）。

**⑥ 与 `useCreateFlow` 的差异一览（看清"共用状态机"省了多少代码）**：

| | 出题页 | 编辑页 |
|---|---|---|
| 进页面时 | `onMounted`: `restart(默认尺寸)` → **空盘** | `onMounted`: `load()` → **拉详情填进去** |
| 标题 | 有（含"改过就保留"逻辑） | **无**（不在这里改） |
| 盘面大小 | 有 `changeBoxSize` | **固定**（题目本身定了尺寸） |
| 成功之后 | `showSuccess` 遮罩 → 手动去"我的题目" | **直接 `goMyPuzzles()`** |
| 入库接口 | `create`（POST） | `update`（PATCH） |
| **两阶段 + 两个校验** | **`usePuzzleStage`（共用）** | **`usePuzzleStage`（共用）** |

> 最后一行就是"抽公共组合式"的收益：**两页各约 80 行，但真正不同的只有上表那 5 行，其余全是共用的。**

### 5.5 `game/useCustomFlow.ts`（129 行）—— 自定义开局（**三个 store 协同**）

```ts
/**
 * 自定义开局流程：两串 → 校验（顺序见 FR-4）→ 可选提交到我的题目 → 开局并跳游戏页
 * 规则一律来自 core；提交默认 visibility=private（决策 7）
 */
export const useCustomFlow = () => {
    const router = useRouter()
    const gameStore = useGameStore()
    const puzzleStore = usePuzzleStore()
    const userStore = useUserStore()

    const puzzleText = ref('')
    const solutionText = ref('')
    const saveToMine = ref(false)
    const title = ref('')
    const error = ref('')
    const loading = ref(false)

    /** 只解析一次，校验与开局复用 */
    const puzzleParsed = computed(() => parsePuzzle(puzzleText.value))
    const solutionParsed = computed(() => parsePuzzle(solutionText.value))

    /** 输入提示行：字符数 [+ 识别出的尺寸] */
    const sizeTextOf = (boxSize: number): string => `${sideOf(boxSize)}×${sideOf(boxSize)}`
    const puzzleInfo = computed<string>(() => {
        const p = puzzleParsed.value
        return `${puzzleText.value.length} 字符${p ? ` · 识别为 ${sizeTextOf(p.boxSize)}` : ''}`
    })
    const solutionInfo = computed<string>(() => {
        const s = solutionParsed.value
        return `${solutionText.value.length} 字符${s ? ` · 识别为 ${sizeTextOf(s.boxSize)}` : ''}`
    })

    const isGuest = computed<boolean>(() => userStore.isGuest)

    const fail = (msg: string): boolean => { error.value = msg; return false }

    /** 校验顺序（失败不跳页） */
    const validate = (): boolean => {
        if (!puzzleText.value.trim() || !solutionText.value.trim()) return fail(CUSTOM_COPY.empty)

        const p = puzzleParsed.value
        if (!p) return fail(CUSTOM_COPY.badPuzzle)

        const s = solutionParsed.value
        if (!s) return fail(CUSTOM_COPY.badSolution)

        if (p.boxSize !== s.boxSize) return fail(CUSTOM_COPY.sizeMismatch)
        if (isBlankBoard(p.board)) return fail(CUSTOM_COPY.puzzleBlank)
        if (getSudoku(p.boxSize).hasEmptyGroup(p.board)) return fail(CUSTOM_COPY.emptyGroup)
        if (!getSudoku(p.boxSize).validatePuzzle(p.board, s.board)) return fail(CUSTOM_COPY.notMatched)
        return true
    }

    /** 提交到我的题目：标题必填 + 40%~65% + POST(private) */
    const save = async (): Promise<boolean> => {
        const p = puzzleParsed.value
        const s = solutionParsed.value
        if (!p || !s) return false

        if (!title.value.trim() || title.value.trim().length > TITLE_MAX) return fail(CUSTOM_COPY.needTitle)

        const bad = blankRatioErrorOf(countBlanks(p.board), p.boxSize)
        if (bad) return fail(bad)

        await create({
            title: title.value.trim(),
            puzzleText: boardToStr(p.board),
            solutionText: boardToStr(s.board),
            visibility: VISIBILITY.Private,
        })
        return true
    }

    /** 开始游戏：校验 →（可选）提交 → 开局 → /game */
    const apply = async (): Promise<void> => {
        if (loading.value) return
        error.value = ''

        if (!validate()) return
        if (saveToMine.value && isGuest.value) { fail(CUSTOM_COPY.saveLabel + '需要登录'); return }

        const p = puzzleParsed.value
        const s = solutionParsed.value
        if (!p || !s) return

        loading.value = true
        try {
            if (saveToMine.value) {
                if (!(await save())) return
                puzzleStore.flashSaved(CUSTOM_COPY.saved)
            }
            gameStore.startGame(p.board, s.board, {
                boxSize: p.boxSize,
                blankRatio: countBlanks(p.board) / cellCountOf(p.boxSize),
            }, GAME_ORIGIN.Custom)
            await router.push({ name: PAGE.Game })
        } catch (err) {
            error.value = errorTextOf(err, '提交失败，请重试')
        } finally {
            loading.value = false
        }
    }

    /** 回主页只走顶栏那一个入口，这里只留开局（生成中不给点击函数 → 纯文本） */
    const actions = computed<Actions>(() => [
        { key: 'start', text: '▶ 开始游戏', onClick: loading.value ? undefined : apply },
    ])

    return {
        puzzleText, solutionText, saveToMine, title, error, loading,
        puzzleInfo, solutionInfo, isGuest, actions, apply,
    }
}
```

**① 它同时用了三个 store —— 这是"编排"最典型的样子**：

| store | 用它干什么 |
|---|---|
| `gameStore` | `startGame`（开局，05 册 §2.11） |
| `puzzleStore` | `flashSaved`（跨页一次性提示，05 册 §3.7） |
| `userStore` | `isGuest`（未登录时拦住"保存到我的题目"） |

**store 之间互不依赖，composable 把它们串起来** —— 这就是为什么"编排"必须单独一层。

**② `puzzleParsed` / `solutionParsed` 是 `computed`（"只解析一次"）**

```ts
const puzzleParsed = computed(() => parsePuzzle(puzzleText.value))
```
- `parsePuzzle` 对**长字符串**有成本（10000 格要切分 + 校验）；
- 用 `computed`：**输入没变就复用结果**，输入一变自动重算；
- **校验 / 开局 / 提交三处都要用** → 缓存一次、三处受益；
- 写成 computed 之后，代码里**不会出现"忘了重新解析"的 bug**（05 册 §2.4 的同一思路）。

**③ `puzzleInfo` / `solutionInfo`：输入提示行（很实用的体验细节）**

显示"**456 字符 · 识别为 9×9**"：
- 用户粘完一长串，**立刻知道"系统认出来了吗、多大的盘"**；
- 粘错了（少了几位数字）→ 这里会显示字符数不对 / 识别不出尺寸 → 用户自己就发现问题；
- `sizeTextOf` 用 core 的 `sideOf`（**不写 `Math.`**）。

**④ `fail` 这个两行小函数的价值**：
```ts
const fail = (msg: string): boolean => { error.value = msg; return false }
```
让 `validate` 每条都写成**一行**：
```ts
if (!p) return fail(CUSTOM_COPY.badPuzzle)
```
**既写了错误文案、又返回了 `false`** —— "错误即返回失败"的紧凑写法（对比 04 册 §16.2 的"空串即通过"，这是等价风格）。

**⑤ `validate` 的七步顺序（原则：从"能不能读"到"内容合不合法"）**

| 顺序 | 检查 | 层次 |
|---|---|---|
| ① | 两串都非空 | 输入 |
| ② | 题面能解析（`parsePuzzle`） | 格式 |
| ③ | 答案能解析 | 格式 |
| ④ | **两串尺寸一致**（`p.boxSize === s.boxSize`） | 形状 |
| ⑤ | 题面不是全空（`isBlankBoard`） | 内容 |
| ⑥ | 题面没有空行/列/宫（`hasEmptyGroup`） | 内容 |
| ⑦ | **成对校验**（`validatePuzzle`：题面无冲突 + 是答案子集 + 答案是合法终盘） | 内容 |

**⚠️ 注意这里没有"挖空比例 40%~65%"这一条** —— 与出题/编辑不同：
**自定义是"用户手里的题"**（可能是别人给的、可能按别的规则出的）→ **开局不该限制它的比例**；
只有**"提交到我的题目"**（`save`）才查比例（因为要入库、要过服务端复校，02 册 §5.5）。
> **同一条规则"在哪一步生效"是刻意设计的** —— 这就是"校验分层"（体验校验 vs 入库校验）。

**⑥ `save()` 复用两个 computed + 两步校验**

```ts
if (!p || !s) return false                                        // ① 防御（理论上到不了这）
if (!title.value.trim() || title.value.trim().length > TITLE_MAX) return fail(CUSTOM_COPY.needTitle)
const bad = blankRatioErrorOf(countBlanks(p.board), p.boxSize)     // ② 比例（文案来自 core）
if (bad) return fail(bad)
```
- **`blankRatioErrorOf` 返回的就是"能直接显示的文案"**（04 册 §16.2）→ `if (bad) return fail(bad)` 就完事；
- POST 里 `visibility: VISIBILITY.Private`：**自定义提交默认私有**（决策 7）—— 用户在"我的题目"里再改成公开/受保护。

**⑦ `apply` 的完整流程（含"游客拦截"与"保存失败就不开局"）**

```
if (loading) return                         ① 双击保护
error = ''                                  ② 清旧错误
if (!validate()) return                     ③ 七步校验（失败停在本页）
if (saveToMine && isGuest) → 提示需要登录     ④ 游客不能保存
loading = true
try:
    if (saveToMine) { if (!await save()) return; flashSaved(...) }   ⑤ 保存失败就不开局
    gameStore.startGame(p.board, s.board, {...}, GAME_ORIGIN.Custom) ⑥ 开局（来源 = Custom）
    router.push(Game)                                                ⑦ 跳页
catch: error = errorTextOf(err, '提交失败，请重试')
finally: loading = false
```
- **⑤ 的两层判断最关键**：`save()` 返回 `false`（标题/比例不合规）→ **直接 `return`（不开局）**，让用户改完再点一次；
- **`flashSaved(CUSTOM_COPY.saved)`**：写一条"已保存到我的题目" → 游戏页 `onMounted` 用 `takeSavedTip()` 取走显示（05 册 §3.7）—— **这就是那个"跨页一次性提示"的写入端**；
- **⑦ 用 `push`（不是 `replace`）**：与难度页（`replace`）不同 —— 这里保留历史，用户可以从游戏页**后退回自定义页**再开一局；
- `GAME_ORIGIN.Custom`：来源是"自定义"→ 游戏页**不给"导出题目"**（题面本来就在用户手上）——这条规则在 `useGameFlow` 里统一判断（§5.6）。

**⑧ `actions` 的"生成中不给点击"**：
```ts
{ key: 'start', text: '▶ 开始游戏', onClick: loading.value ? undefined : apply }
```
`loading` 时 `onClick` 是 `undefined` → 按 `Action` 契约渲染成**纯文本**（03 册 R8 / §4.1 的 `zoomActions` 同款）—— **防重复提交的"UI 层实现"**（逻辑层还有 `if (loading.value) return` 双保险）。

### 5.6 `game/useGameFlow.ts`（105 行）—— 游玩页：**"按钮条数据化"的完整示范**

> 这个文件在 01 册 §3.8（条件拼装）与 §1.6（`onMounted`）里出现过。这里从**编排视角**讲完。

```ts
export const useGameFlow = () => {
    const gameStore = useGameStore()
    const puzzleStore = usePuzzleStore()
    const router = useRouter()
    /** 参考答案遮罩自己的缩放，与游玩盘互不影响 */
    const { zoom, zoomActions } = useZoom(defaultZoomOf(gameStore.config.boxSize))

    const tip = ref('')
    /** 参考答案遮罩开关 */
    const answerOpen = ref(false)

    /** ===== 题目导出（只给系统生成的盘）：题面串，**不给答案** ===== */
    const {
        open: exportOpen, puzzleText: exportPuzzleText,
        tip: exportTip, actions: exportActions, show: showExport,
    } = usePuzzleExport()

    const exportPuzzle = (): void => {
        if (!gameStore.board.length) return
        showExport(boardToStr(givenBoard(gameStore.board)))
    }

    /** 遮罩里的只读盘：由答案生成一块独立 Board（与游玩盘无关） */
    const answerInput = computed<BoardRenderInput>(() => ({
        board: gameStore.solution.length ? fromPuzzle(gameStore.solution, true) : [],
        boxSize: gameStore.sudoku.B,
        zoom: zoom.value,
        interactive: false,
    }))
    const answerTitle = '答案'
    /** 遮罩里的按钮条：只留关闭（缩放贴棋盘，见 answerZoomActions） */
    const answerActions = computed<Actions>(() => [
        { key: 'close', text: '↩ 回到挑战', onClick: () => { answerOpen.value = false } },
    ])
    /** 贴棋盘正上方的缩放圆圈（左缩小、右放大） */
    const answerZoomActions = computed<Actions>(() => zoomActions.value)

    const goBack = (): void => {
        if (router.options.history.state.back) router.back()
        else router.replace({ name: PAGE.Difficulty })
    }
    const restart = (): void => {
        gameStore.jump(0)
        answerOpen.value = false            // 重开时收起遮罩
    }
    const hint = (): void => {
        const cands = gameStore.selected ? gameStore.getCandidates(gameStore.selected) : []
        tip.value = hintTextOf(gameStore.selectedCell, cands)
    }

    const leadActions = computed<Actions>(() => [
        { key: 'back', text: '◀ 返回', onClick: goBack },
        { key: 'restart', text: '↺ 重开', onClick: restart },
    ])
    const trailActions = computed<Actions>(() => [
        { key: 'hint', text: '💡 提示', onClick: hint },
        // 只有系统生成的盘才给导出（自定义的串本就在手上、挑战有 pid / 落地页可分享）
        ...(gameStore.origin === GAME_ORIGIN.System
            ? [{ key: 'export', text: EXPORT_COPY.button, onClick: exportPuzzle }]
            : []),
        ...(gameStore.solution.length
            ? [{ key: 'answer', text: '📖 答案', onClick: () => { answerOpen.value = true } }]
            : []),
        ...(import.meta.env.DEV
            ? [{ key: 'cheat', text: '⚡ 作弊', onClick: gameStore.fillSolution }]
            : []),
    ])
    /** 通关遮罩：只留重开（回主页走顶栏） */
    const resultActions: Actions = [
        { key: 'restart', text: '↺ 重开', onClick: restart },
    ]
    const winOverlay = computed(() => (gameStore.status === GAME_STATUS.Won ? GAME_COPY.win : null))

    onMounted(() => {
        if (gameStore.mode !== GAME_MODE.Game || !gameStore.board.length) {
            router.replace({ name: PAGE.Difficulty })      // 直接刷 URL 进来 → 送回难度页
            return
        }
        // 自定义「提交到我的题目」成功后的轻提示（一次性，取走即清）
        const saved = puzzleStore.takeSavedTip()
        if (saved) tip.value = saved
    })

    return {
        tip, answerOpen, answerTitle, answerInput, answerActions, answerZoomActions,
        exportOpen, exportPuzzleText, exportTip, exportActions,
        leadActions, trailActions, resultActions, winOverlay,
    }
}
```

**① 按钮条的"条件拼装"（本文件最有代表性的写法）**

```ts
const trailActions = computed<Actions>(() => [
    actionOf(ACTION.hint, hint),                                              // 永远有
    actionOf(ACTION.saveGame, saveGame),                                      // 永远有（存档，§5.8）
    ...(gameStore.origin === GAME_ORIGIN.System ? [actionOf(ACTION.exportPuzzle, exportPuzzle)] : []),
    ...(gameStore.origin === GAME_ORIGIN.Challenge && gameStore.solution.length
        ? [actionOf(ACTION.answer, () => { answerOpen.value = true })]
        : []),
    ...(import.meta.env.DEV ? [actionOf(ACTION.cheat, gameStore.fillSolution)] : []),
])
```

四个条件分别对应三类"业务事实" + 一个"永远有"：

| 按钮 | 条件 | 为什么 |
|---|---|---|
| 💾 存档 | **永远有** | 存的是**玩家自己的动作**，与题目来源无关（整局真源 → localStorage，见 §5.8） |
| 📋 导出题目 | `origin === System` | 自定义的串**本来就在用户手上**；挑战题有 pid、落地页可分享 → 只有系统题需要"导出" |
| 📖 答案 | **`origin === Challenge`** 且 `solution.length > 0` | **只给挑战**：系统生成的答案由程序算出、自定义的答案是你自己填的 —— 都等于把答案摊在眼前；挑战是**别人出的题**，看答案才算"参考答案"；没有答案串的挑战也不给（点了是空盘） |
| ⚡ 作弊 | `import.meta.env.DEV` | 生产产物里**整段代码被压缩器删除**（01 册 §3.8）；它调的是 `gameStore.fillSolution`（原 `cheat`，"作弊"只是**按钮文案**，见 05 册 §2.18） |

**收益**：页面模板里只有一句 `v-for="a in items"`（`items = [...leadActions, ...trailActions]`，01 册 §1.4）——
**"哪个按钮该不该出现"完全在 composable 里决定，模板不知道任何业务条件。**

**② `leadActions` / `trailActions` 为什么分两段**：
语义上左段是**导航/重置**（返回、重开），右段是**辅助功能**（提示、答案、导出、作弊）。
页面目前把两段拼成一条；**分两段的好处是将来若要分开放（左对齐/右对齐），不用改这个 composable**。

**③ 答案遮罩的"独立缩放"（`useZoom` 的活例子）**

```ts
const { zoom, zoomActions } = useZoom(defaultZoomOf(gameStore.config.boxSize))
```
- **它与游玩盘的缩放互不影响**（注释原文）—— 这就是 §4.1 讲的"多份实例"最直接的证据；
- 这里用 `useZoom` 而不是 `useBoardZoom`：**游戏期间 `config.boxSize` 不会变**（一盘定了尺寸），不需要那个"尺寸变化自动复位"的 `watch`；
- 答案盘 `interactive: false`（只读）→ 点击不发事件（§4.2 的守卫）。

**④ `answerInput` 的三处细节**

```ts
board: gameStore.solution.length ? fromPuzzle(gameStore.solution, true) : [],
boxSize: gameStore.sudoku.B,
zoom: zoom.value,
interactive: false,
```
- **`solution.length ? … : []`**：没答案就给空盘（画布不画东西）；
- **`fromPuzzle(solution, true)`**：把答案当"给定数字"渲染（深色粗体，04 册 §4.2）；
- **`boxSize: gameStore.sudoku.B`**（而不是 `config.boxSize`）：**与同一个 `sudoku` 实例对齐**，保证画粗线的宫边界正确。

**⑤ `goBack` 的历史兜底（R15："返回来源靠历史"）**

```ts
if (router.options.history.state.back) router.back()      // 有上一页 → 回上一页
else router.replace({ name: PAGE.Difficulty })            // 直接刷 URL 进来的 → 回难度页
```
**为什么要判断**：用户可能**直接打开 `/game` 链接或刷新页面** → 此时"上一页"不存在 → `router.back()` 会**什么都不做**（甚至跳出站点）→ 必须有兜底。
**为什么不把"来源"写进 URL**（例如 `?from=search`）：那会**污染可分享的地址**，而且"从哪来"本来就属于浏览器历史（R15 原话）。

**⑥ `restart` 复用历史机制（很聪明的一处）**

```ts
const restart = (): void => {
    gameStore.jump(0)          // ★ 不是"重置棋盘"，而是"跳到历史第 0 步"
    answerOpen.value = false   // 顺手收起遮罩
}
```
- 第 0 步就是"开局那一刻的盘面"（`resetHistory` 建的，05 册 §2.9）→ **"重开" = "跳回第 0 步"**；
- **好处**：不用另写"重置盘面"的逻辑，也**不可能出现"重开后历史与盘面不一致"**；
- 注意它**没有** `pushHistory`（跳步本来就不产生新历史）。

**⑦ `winOverlay`：文案数据化（以及"不要滥用 computed"）**

```ts
const winOverlay = computed(() => (gameStore.status === GAME_STATUS.Won ? GAME_COPY.win : null))
/** 通关遮罩：只留重开（回主页走顶栏） */
const resultActions: Actions = [{ key: 'restart', text: '↺ 重开', onClick: restart }]
```
- `GAME_COPY.win` 是 `constants` 里的 `{ title, desc }`（文案集中）；
- 返回 `null` 表示"不显示" → 页面写 `:show="!!winOverlay"` + `:text="winOverlay?.title"`（可选链，00 册 §3.5）；
- **`resultActions` 是常量而不是 `computed`** —— 它的内容**不依赖任何响应式状态**。
> **"不该用 computed 的地方就别用"**：这是可读性的一部分（`computed` 暗示"它依赖什么"）。

**⑧ `onMounted` 的两个职责**

```ts
if (gameStore.mode !== GAME_MODE.Game || !gameStore.board.length) {
    router.replace({ name: PAGE.Difficulty })     // ① 页面级守卫
    return
}
const saved = puzzleStore.takeSavedTip()          // ② 取走"跨页一次性提示"（取完即清）
if (saved) tip.value = saved
```
- **① 页面级守卫**：`mode` 不对（上次停在出题模式）或盘面为空（直接刷 URL）→ 开局页没有意义 → 送回难度页。**用 `replace`**（不在历史里留"空的开局页"）；
- **② 就是 §5.5 里 `flashSaved` 的读取端** —— "写入（自定义页）→ 跨页 → 读取（游戏页）"的完整闭环。

**⑨ 最后回到"页面只接线"（闭环本册开头）**

`GamePage.vue` 的全部声明只有 **7 个**（01 册 §1.12），其中最关键的三个都是"取这个 composable 的东西"：

```ts
const { tip, answerOpen, …, leadActions, trailActions, … } = useGameFlow()   // 场景数据 + 按钮条
const { zoom, zoomActions } = useBoardZoom(() => gameStore.config.boxSize)    // 缩放
const items = computed(() => [...leadActions.value, ...trailActions.value])   // 拼一条按钮条
```
**页面从头到尾没有一句业务判断** —— 这就是"编排层"存在的意义：
**把"什么时候显示什么、点了做什么"全部收进 composable，页面只负责摆位置。**

**⑩ 按钮条只有一份文案表（`constants/actions.ts` + `core/action.ts`）**

上面那段 `actionOf(ACTION.hint, hint)` 就是这套约定的样子 —— **`key` 与文案不再写在各页面里**：

| 文件 | 放什么 | 为什么在这 |
|---|---|---|
| `constants/actions.ts` | **`ACTION` 表**：`back` / `saveGame` / `answer` / `submitPuzzle` … 每项 `{ key, text }` | 文案是**数据**（R10：constants 只放值）；**按钮上的字直接写在这张表里** —— 不指向别的 COPY、也不拼字符串（"改一处就是改这一行"） |
| `core/action.ts` | `actionOf(spec, onClick?)` · `submitSpecOf(phase)` | 纯拼装（**不传 onClick = 纯文本/禁用态**），以及唯一一处"阶段 → 提交按钮"的映射；**函数不能放 `constants/`**（R8 只允许 UPPER_SNAKE 的值） |
| 页面 / composable | 只写 `actionOf(ACTION.x, handler)` | 它们只回答"用哪颗 + 点了做什么" |

**那"不是按钮"的文案呢**：全部在 **`constants/copy.ts`**（遮罩 / 表单 / 空态 / 徽标 / 元信息标签 / 校验提示…）。
原先它们散在 `constants/game|puzzle|solve|user` 里，2026-10 起**只剩一处**；那四个文件只留**数据与取值**
（`GAME_MODE` / `VISIBILITY` / `SOLVE_LIMIT_OPTIONS`…）。
> **两条铁律**：① 按钮上的字 → `constants/actions.ts`；② 其余文案 → `constants/copy.ts`。
> 不要再往 `constants/game.ts` 之类的地方加文案（`constants` 之间还不许互相 import —— R2 矩阵里它的 src 白名单是空的）。

**为什么值得单独建表**：同一个按钮的文案过去散在十几个文件里（`'◀ 返回'` / `'↩ 返回'` / `'← 我的题目'` / `'📤 提交题目'` / `'➖'`…），
改一次措辞要改多处、必漏一处；现在**一处改、全站一致**。
**两个约定**：① `key` 只要求在**同一条按钮条内**唯一（`back` / `close` 在不同条里重复是正常的）；
② **新增按钮先往 `ACTION` 表里加一项**，不要在页面里写 `{ key, text }` 字面量。

### 5.7 `game/useStartFromTexts.ts`（32 行）—— 「挑战」开局（**从 store 归位出来的业务**）

```ts
/**
 * 「挑战」开局：题面 / 答案串 → 棋局真源（我的题目页与落地页 / 搜索页共用）
 * · 解析与比例换算都在 core；答案串缺失也允许开局（胜负判定走规则，不依赖答案）
 * · 来源固定 `Challenge`（→ 游戏页不给「导出题目」）；source 给了才有「标题 · 出题人」信息行
 * · 题面串解析失败返回 false，调用方不跳页
 *
 * **为什么在 composable 而不在 store**：它要解析两串、算比例、并决定"来源 = 挑战" —— 属于业务编排；
 * store 只留 `startGame` / `startInput` 两个"给定数据、写真源"的基本操作（§六 归位原则）。
 */
export const useStartFromTexts = () => {
    const gameStore = useGameStore()

    return (puzzleText: string, solutionText: string, blankCount: number, source?: GameMeta): boolean => {
        const parsed = parsePuzzle(puzzleText)
        if (!parsed) return false

        gameStore.startGame(
            parsed.board,
            parsePuzzle(solutionText)?.board ?? [],
            { boxSize: parsed.boxSize, blankRatio: blankCount / cellCountOf(parsed.boxSize) },
            GAME_ORIGIN.Challenge,
            source,
        )
        return true
    }
}
```

**① 它为什么在这一层（三条判据合起来指向 composable）**：

| 方案 | 判断 |
|---|---|
| 留在 `gameStore` | ❌ 违反 05 册 §1.2 的判据（"写真源 + 守规则不变式"）—— 解析串 / 算比例 / 定来源**一件都不沾** |
| 写进 `core/` | ❌ **有副作用**（它要调 `gameStore.startGame`）→ core 必须是纯函数（R3） |
| 各自写在页面里 | ❌ 两个调用方要各抄一份（解析 + 算比例 + 来源判定），改一处漏一处 |
| **组合式（本项目选它）** | ✅ 有副作用 → composable；**两个调用方各调一次、共用同一份实现**（§1.3 第 2 条判据） |

**② `parsePuzzle` 为什么调两次**：题面串与答案串是**两个独立的串** —— 答案串非法 / 缺失**不该影响**"题面合法就能开局"（`?.board ?? []` → 空答案）。

**③ 返回 `boolean` 而不是自己跳页**（与 §5.5 的 `save()` 同一纪律）：
**"能不能开局"在这里判断，"跳不跳页"由调用方决定** —— 调用方写法：`if (!startFromTexts(...)) return` 再 `router.push`（§6.1 / §6.4）。

**④ 谁在用它（`grep useStartFromTexts` 两个结果）**：

| 调用方 | 传的 `source` | 效果 |
|---|---|---|
| `usePuzzleDetail.challenge`（搜索页 / 落地页） | **不传** | 无来源信息行（落地页本来就没有"谁的题"上下文） |
| `useMyPuzzles.challenge`（挑战自己的题） | `{ pid, title, uname }` | 游戏页显示「标题 · 出题人」信息行 |

> **同一个函数、两种用法**：`source` 是**可选参数** —— "要就传、不要就不传"，而不是写两个函数（与 §5.1 的 `draft`、§6.2 的 `closeText` 同一种"默认值服务多数情况"）。

### 5.8 `game/useGameSave.ts`（91 行）—— 存档（**游戏页写入、继续游戏页按条读回**）

```ts
export const useGameSave = () => {
    const gameStore = useGameStore()
    const router = useRouter()

    /** 存档列表（继续游戏页渲染它；服务侧已按存档时间倒序） */
    const saves = ref<GameSave[]>(readSaves())
    /** （没有 hasSave：入口不拦截，列表页自己显示空态） */
    /** 一次性提示（空盘 / 存不下 / 没存档）——游戏页复用同一条 tip 行 */
    const tip = ref('')

    /** 存档：返回给用户看的提示文案（同时写进 tip） */
    const save = (): string => {
        if (!gameStore.board.length) { tip.value = SAVE_COPY.empty; return tip.value }

        const data: GameSave = {
            version: SAVE.version,
            id: slotId,                                   // ★ 本局一行：重复存档覆盖同一条
            savedAt: Date.now(),
            origin: gameStore.origin,
            meta: { ...gameStore.meta },
            config: { ...gameStore.config },
            solution: gameStore.solution,
            snapshots: gameStore.snapshots,
            currentStep: gameStore.currentStep,
            selected: gameStore.selected,
        }

        const ok = writeSave(data)
        hasSave.value = ok || hasSave.value
        tip.value = ok ? SAVE_COPY.saved : SAVE_COPY.tooBig
        return tip.value
    }

    /** 继续某一条：恢复真源后跳游戏页；false = 这条已经不在了 */
    const resume = async (id: string): Promise<boolean> => {
        const data = saves.value.find((item) => item.id === id)
        if (!data) { refresh(); tip.value = SAVE_COPY.empty; return false }
        gameStore.restoreGame(data)                       // ★ 只写 store 的真源
        await router.push({ name: PAGE.Game })
        return true
    }

    /** 删某一条（继续游戏页每行的「删除」） */
    const remove = (id: string): void => {
        tip.value = removeSaveById(id) ? SAVE_COPY.removed : SAVE_COPY.empty
        refresh()
    }
}
```

**三层分工（这一节最值得记的一张三行表）**：

| 层 | 文件 | 只做 |
|---|---|---|
| 〔适配〕 | `services/saveGame.ts` | `JSON.parse/stringify` + **结构校验**（坏数据当场清掉）+ `localStorage` 读写 |
| 〔状态〕 | `stores/game.ts` 的 `restoreGame(save)` | 把存档里的**真源**写回（不解析、不校验、不跳页） |
| 〔编排〕 | 本文件 | 组数据、给提示、**跳页** |

**① 为什么必须存"快照"而不只是盘面**：历史进度条是**产品承诺**的一部分 ——
只存 `board` 的话，读档回来 `snapshots` 只有 1 步，进度条直接"归零"；存 `snapshots + currentStep` 才叫"原样回来"。
（快照里的 `Cell.lock` 也一并存了 → 题面粗体 / 玩家蓝色的配色不会丢。）

**② 为什么 `save()` 返回字符串**：游戏页把提示显示在**同一条 `tip` 行**（和「💡 提示」共用），
所以 composable 不自己弹东西，只**把文案 return 出去**；`useGameFlow` 里就一行 `tip.value = storeSave()`。

**③ 列表页自己消化"没有存档"**：`ResumePage` 只判断 `saves.length` → 空就显示 `SAVE_COPY.empty`；
**主页入口不做任何拦截**（不灰显、不弹提示）—— "进去看一眼"比"点了没反应"清楚得多。

**④ 大小上限是诚实的能力边界**：`SAVE.maxChars = 150 万字符`。为什么不是"随便存"：
`snapshots` 是**每一步一整盘 `Cell`**，B=10（100×100）时一步就 ≈200KB；而 localStorage 配额是**按域算的** ——
写爆的代价是"整个站点所有本地存储都写不进"（连分页偏好都失效）→ 宁可拒绝，并提示"换小一点的盘面"。

**⑤ 读档用 `push` 而不是 `replace`**：读档后按「◀ 返回」应回到主页（= 你来的地方）——
与 §5.6 ⑤ 的"返回来源靠历史"是同一条纪律。

**⑥ 损坏存档的处理**：`readSaves()` 里 `JSON.parse` 失败 / 版本不对 / 形状不对 → **坏条单条丢弃**（整表坏才清空），
`resume()` 给一句"还没有存档"。**为什么不保留**：坏存档会让页面每次进都崩，而用户不知道该删什么 ——
"直接丢掉 + 一句人话提示"才是可维护的选择（版本号 `SAVE.version` 就是为这一条服务的）。

**⑦ 列表页（`pages/ResumePage.vue`）是"一排笨条"**：它只做三件事 —— 遍历 `saves`、把 `titleOf/infoOf` 画成两行、
给每行拼两颗文字按钮（`actionOf(ACTION.resumeSave, …)` / `actionOf(ACTION.removeSave, …)`）。
**"一条 = 一行"** 由 `SAVE.maxCount`（10）与 `services/saveGame.ts` 的"超出丢最旧"共同保证。

### 5.9 八个 game composable 的横向总结

| | 输入 | 输出（给页面） | 调了哪些 core / store / services |
|---|---|---|---|
| `useDifficultyFlow` | 用户调 `draft` | `draft/loading/error/3 派生/apply` | core（`cellCountOf`/`blankCountOf`/`percentOf`）· services（`generateInWorker`）· store（`startGame`） |
| `usePuzzleStage` | 用户操作（由上层调） | `phase/puzzleSnapshot/errorMsg/showFail/4 动作` | core（`puzzleSubmitErrorOf`）· store（`numBoard`/`sudoku`/`lockPuzzle`） |
| `useCreateFlow` | 用户输入标题 + 操作 | `标题/3 状态/5 动作` | `usePuzzleStage` · core（`sideOf`/`boardToStr`）· services（`create`）· store（`startInput`） |
| `useEditFlow` | URL 的 `pid` | `pid/3 状态/4 动作` | `usePuzzleStage` · core（`parsePuzzle`/`boardToStr`）· services（`getOne`/`update`）· store（`startInput`） |
| `useCustomFlow` | 两串文本 | `5 输入/2 提示/按钮条/apply` | core（`parsePuzzle`/`isBlankBoard`/`hasEmptyGroup`/`validatePuzzle`/`blankRatioErrorOf`/`boardToStr`/`countBlanks`/`cellCountOf`/`sideOf`）· services（`create`）· **3 个 store** |
| `useStartFromTexts` | 题面/答案串 + `source?` | `startFromTexts(...) → boolean` | core（`parsePuzzle`/`cellCountOf`）· store（`startGame`） |
| `useGameFlow` | 无（全靠 store） | `tip/两个遮罩/4 组按钮条/2 个渲染入参` | core（`hintTextOf`/`givenBoard`/`boardToStr`/`defaultZoomOf`）· store（`jump`/`getCandidates`/`fillSolution`/`takeSavedTip`）· `useZoom`/`usePuzzleExport`/`useGameSave` |
| `useGameSave` | 无（读 store 真源） | `hasSave/tip/save/resume/clear` | services（`writeSave`/`readSave`/`hasSavedGame`）· store（`restoreGame` + 真源） |

**读这张表你能看出编排层的三条规律**：
1. **输入都是"用户输入"或"URL"**（没有一个 composable 自己去网络/存储里"找参数"）；
2. **输出都是"数据 + 动作 + 控件数据"**（页面拿到的永远是**可以直接绑到模板上**的东西）；
3. **中间那列全是 `core` / `services` / `store` 的调用** —— **编排层自己不"造"任何业务值**（这就是 R7 禁 `Math.` 的深意）。

---

## 6. puzzle 五件：列表、详情、预览、搜索、我的题目

**① 分工表**：

| 文件 | 谁用 | 它管什么 |
|---|---|---|
| `usePuzzleDetail` | 搜索页预览 / 落地页 `/p/:pid` / 挑战 | 取详情 + 挑战（开局） |
| `usePuzzlePreview` | 我的题目页 + 搜索页 | 预览遮罩（题目 / 答案），**取数由调用方注入** |
| `useSearchPuzzle` | 搜索页 | 搜索框三分流 + 列表 + 预览 + 挑战 |
| `useMyPuzzles` | 我的题目页 | 列表 + 行内改动（重命名/可见性/答案/删除）+ 预览/挑战/编辑 |
| `metaText` | 列表项 / 详情 / 游戏页 | 元信息行文案（§2.3 已讲，**E8 例外**） |

### 6.1 `puzzle/usePuzzleDetail.ts`（81 行）—— 详情取数（**三处共用同一份**）

```ts
/**
 * 题目详情：搜索页的「题目预览」遮罩、落地页 /p/:pid、挑战 三处共用同一份取数
 * （列表接口不带题面串，预览与挑战都必须回到 GET /api/puzzles/:pid）
 */
export const usePuzzleDetail = () => {
    const userStore = useUserStore()
    const router = useRouter()
    /** 「挑战」开局：题面 / 答案串 → 棋局真源（业务编排收在这个组合式里） */
    const startFromTexts = useStartFromTexts()

    const pid = ref('')
    const data = ref<PuzzleDetail | null>(null)
    const loading = ref(false)
    const error = ref('')

    /** 题面串 → { 盘面, 宫边长 }（格式非法为 null） */
    const parsed = computed(() => (data.value ? parsePuzzle(data.value.puzzleText) : null))

    /** 只读盘（预览与落地页共用；挑战也用同一份题面） */
    const boardInput = computed<BoardRenderInput>(() => ({
        board: parsed.value ? fromPuzzle(parsed.value.board, true) : [],
        boxSize: parsed.value?.boxSize ?? 0,
    }))

    const title = computed<string>(() => data.value?.title ?? '')
    /** 元信息行文本（文案与时间格式都在 metaTextOf 一处；与列表项、游戏页同一份） */
    const metaText = computed<string>(() => metaTextOf({
        sideS: data.value?.sideS ?? 0,
        blankCount: data.value?.blankCount ?? 0,
        createdAt: data.value?.createdAt ?? 0,
        author: data.value?.uname ?? '',
    }))

    /** 取详情（预览 / 落地页 / 挑战前都要先有它） */
    const load = async (nextPid: string): Promise<void> => {
        pid.value = nextPid
        loading.value = true
        error.value = ''
        try {
            data.value = await getOne(nextPid)
        } catch (err) {
            data.value = null
            error.value = errorTextOf(err, '题目加载失败')
        } finally {
            loading.value = false
        }
    }

    /**
     * 挑战：以该题题面开局并跳游戏页
     * · 答案按 show_solution 下发，缺失也能玩（胜负判定走规则，不依赖答案串）
     * · 热度只对已登录用户上报（服务端 1 人 1 小时去重；作者不计）
     */
    const challenge = async (): Promise<void> => {
        const info = data.value
        if (!info) return

        // 题面 / 答案串 → 开局（解析与比例在 core，来源 = Challenge；落地页不带来源信息）
        if (!startFromTexts(info.puzzleText, info.solutionText ?? '', info.blankCount)) return

        if (!userStore.isGuest) {
            try { await play(info.pid) } catch { /* 热度失败不影响开局 */ }
        }
        await router.push({ name: PAGE.Game })
    }

    return { pid, loading, error, title, metaText, boardInput, load, challenge }
}
```

**① 为什么"三处共用"**：
列表接口**不带题面串**（"列表轻、详情重"，05 册 §3.5）→ 所以"预览""挑战""落地页"**都必须回到 `GET /api/puzzles/:pid`**。
三处需求一样（拿到 `puzzleText` 并渲染 / 开局）→ **一份取数**。

**② `parsed` 是 `computed`（只解析一次）**：与 §5.5 的 `puzzleParsed` 同一个理由 —— 题面串可能很长（10000 格）。

**③ `boardInput` 只给 `board` + `boxSize`（不含 `zoom`）**：
**因为缩放属于"展示方"**：
- 落地页用它自己的 `useBoardZoom`（页面级）；
- 预览遮罩用 `usePuzzlePreview` 的独立 `zoom`（§6.2 的 E5）。
> **`boardInput` 只提供"画什么"，"多大 / 能不能点"由消费方补** —— 这正是 `BoardRenderInput` 里那些可选字段（`zoom?` / `interactive?`）存在的意义。

**④ `metaText` 走 `metaTextOf`**（§2.3）：列表项、详情、游戏页**同一份**文案与时区 / 24 小时格式。

**⑤ `challenge` 的三步（顺序是关键）**

```ts
if (!startFromTexts(...)) return                // ① 先开局（本地、同步、成功才继续）
if (!userStore.isGuest) {
    try { await play(info.pid) } catch { /* 热度失败不影响开局 */ }   // ② 再上报热度（网络、可失败）
}
await router.push({ name: PAGE.Game })          // ③ 最后跳页
```

**⑥ 那段 `try/catch` 是一个重要模式**：**"非关键副作用"绝不能拖垮主流程**。
- 热度上报失败（网络抖、后端 500）**不影响用户玩** → 吞掉错误、继续走；
- 空 `catch {}` 是**有意的**（注释写明"热度失败不影响开局"）—— 不写注释的空 catch 会被当成隐患，**写了就是明确的设计决定**；
- **为什么"先开局再上报"**：开局是本地操作（一定成功），上报是网络操作（可能失败）→ **把"可能失败的事"放在"已经成功的事"之后**，失败也不影响结果。

**⑦ `pid` 与 `data` 一起写**：`load(nextPid)` 同时写入二者 —— **请求参数与结果一起保存**，避免"`data` 是上一次的、`pid` 是新的"这种不一致。

> **顺带说清 `startFromTexts` 的来源（2026-10 归位）**：它**不是 store 的方法**，而是 `useStartFromTexts()`（`composables/game/useStartFromTexts.ts`）返回的函数 —— 本文件与 `useMyPuzzles` 各调一次拿到自己的那份。这正是"**两个调用方共用同一份业务实现**"的做法（05 册 §2.12 讲了它的判据）。

### 6.2 `puzzle/usePuzzlePreview.ts`（64 行）—— 预览遮罩（**取数注入 + 独立缩放**）

```ts
/** 预览数据源：题面串必有，答案串可有（未开启 show_solution 时为空） */
export interface PreviewSource {
    puzzleText: string
    solutionText?: string
}

/**
 * 预览遮罩（题目 / 答案共用）：只读、零副作用
 * · 取数由调用方注入（我的题目走 rowId 缓存，搜索页走 pid 详情）
 * · 只负责「加载 → 解析 → 开遮罩」，不碰任何游戏状态
 */
export const usePuzzlePreview = (load: (id: string) => Promise<PreviewSource | null>, closeText = '返回') => {
    /** 预览自己的缩放，与游玩盘互不影响 */
    const previewOpen = ref(false)
    const previewTitle = ref('')
    /** 盘面数据（zoom / interactive 由本 composable 决定，调用方不用管） */
    const previewBoard = ref<BoardRenderInput>({ board: [], boxSize: 0 })
    const previewLoading = ref(false)
    const { zoom, resetZoom, zoomActions } = useZoom(defaultZoomOf(previewBoard.value.boxSize))

    /** 只读盘：不给交互，只给缩放 */
    const previewInput = computed<BoardRenderInput>(() => ({
        ...previewBoard.value, zoom: zoom.value, interactive: false,
    }))

    const closePreview = (): void => { previewOpen.value = false }

    /** 遮罩里的按钮条：只留关闭（缩放贴棋盘，见 previewZoomActions） */
    const previewActions = computed<Actions>(() => [
        { key: 'close', text: `↩ ${closeText}`, onClick: closePreview },
    ])

    /** 贴棋盘正上方 的缩放圆圈（左缩小、右放大） */
    const previewZoomActions = computed<Actions>(() => zoomActions.value)

    /** answer=true 看答案预览（仅我的题目），false 看题目预览 */
    const showPreview = async (id: string, answer: boolean, title: string): Promise<void> => {
        previewOpen.value = false
        previewLoading.value = true
        try {
            const src = await load(id)
            const text = answer ? src?.solutionText ?? '' : src?.puzzleText ?? ''
            const parsed = text ? parsePuzzle(text) : null
            if (!parsed) return

            previewTitle.value = title
            previewBoard.value = { board: fromPuzzle(parsed.board, true), boxSize: parsed.boxSize }
            resetZoom(defaultZoomOf(parsed.boxSize))
            previewOpen.value = true
        } finally {
            previewLoading.value = false
        }
    }

    return { previewOpen, previewTitle, previewInput, previewLoading, previewActions, previewZoomActions, showPreview, closePreview }
}
```

**① 取数注入（本文件最重要的设计）**

```ts
load: (id: string) => Promise<PreviewSource | null>
```

**两个调用方注入完全不同的实现**：

| 调用方 | 注入的 `load` | 数据来自 |
|---|---|---|
| `useMyPuzzles` | `(rowId) => puzzleStore.detailOf(rowId)` | **store 的详情缓存**（05 册 §3.6） |
| `useSearchPuzzle` | `(pid) => getOne(pid).catch(() => null)` | **现取详情接口**（注释："搜索列表只给 pid，现取详情即可，无缓存需求"） |

> **同一个预览遮罩服务两种数据源** —— 这就是"依赖倒置"在 composable 里的样子：**它只声明"我需要一个 `(id) => Promise<PreviewSource | null>`"，谁给、怎么给由调用方决定。**
> （`useBoardCanvas` 的 `input` / `useListQuery` 的 `load` / `usePuzzlePreview` 的 `load` —— 三个"注入点"，同一个思想。）

**② `PreviewSource` 接口定义在这里（而不是 `types/`）**：
因为**这个 composable 是"需求方"** —— 它只要求"题面必有、答案可有"。**需求方定义接口**，供给方（`MyPuzzleDetail` / `PuzzleDetail`）只要**形状兼容**就能传。

**③ `closeText` 默认参数**：默认"返回"，需要时调用方可换（默认值服务"多数情况"，不必每次都传）。

**④ 独立缩放（E5 例外）**

```ts
const { zoom, resetZoom, zoomActions } = useZoom(defaultZoomOf(previewBoard.value.boxSize))
...
resetZoom(defaultZoomOf(parsed.boxSize))     // 每次打开复位到该盘面的默认缩放
```
- **它与浏览盘、游戏盘、答案遮罩的缩放都不相干**（各自 `useZoom` 实例）；
- 这里用 `useZoom` + **手动 `resetZoom`**（而不是 `useBoardZoom`）：预览是"**打开时才确定尺寸**"→ 在 `showPreview` 里显式复位最直接；
- **不复位的后果**：先看 36×36（默认 2.5 倍），再看 9×9（默认 1.25 倍）→ 缩放还停在 2.5 → **棋盘大得离谱**。

**⑤ `showPreview` 的时序（四步，含两处"防脏状态"）**

```
① previewOpen = false        ← 先关掉可能开着的上一个预览（避免"旧内容 + 新 loading"同框）
② previewLoading = true
③ try: load → 取题面/答案串 → parsePuzzle
       if (!parsed) return   ← 解析失败：不开遮罩（previewOpen 保持 false），finally 复位 loading
       → 设 title / board / resetZoom / previewOpen = true
④ finally: previewLoading = false   ← 任何路径都不会卡在 loading
```
- **`answer ? solutionText : puzzleText`**：一个遮罩同时服务"看题面"和"看答案"（我的题目页两种都用）；
- **答案缺失 → `?? ''` → `parsePuzzle('')` 得 `null` → 不开遮罩**（不会显示一个空白棋盘）；
- **`fromPuzzle(parsed.board, true)`**：预览内容按"给定数字"渲染（深色粗体）。

**⑥ `previewInput` 把 `zoom` 与 `interactive: false` 一起注入**：
调用方直接 `v-bind="previewInput"` 传给 `BoardView`（01 册 §1.8）；**"只读"和"缩放"这两件事由这个 composable 决定**（注释："zoom / interactive 由本 composable 决定，调用方不用管"）。

### 6.3 `puzzle/useSearchPuzzle.ts`（79 行）—— 搜索页（**搜索框三分流**）

```ts
/**
 * 搜索页流程：条件/分页/浏览偏好交给 useListQuery，
 * 预览交给 usePuzzlePreview，本文件只负责「搜索框分流 + 挑战」
 */
export const useSearchPuzzle = () => {
    const router = useRouter()
    const puzzleStore = usePuzzleStore()
    const detail = usePuzzleDetail()
    /** 预览：搜索列表只给 pid，现取详情即可（无缓存需求） */
    const preview = usePuzzlePreview((pid) => getOne(pid).catch(() => null))

    /** 20 位命中 uid 时的表头（「出题人：X 的公开题」） */
    const authorLabel = ref('')

    /** store 取值包一层 computed，页面解构后仍是响应式 */
    const items = computed<SearchResult[]>(() => puzzleStore.items)
    const total = computed<number>(() => puzzleStore.total)
    const pageCount = computed<number>(() => puzzleStore.pageCount)
    const loading = computed<boolean>(() => puzzleStore.loading)
    const error = computed<string>(() => puzzleStore.error)
    const empty = computed<boolean>(() => puzzleStore.empty)

    /** 取数：20 位 → 先当 pid，再当 uid；其它 → 标题/uname 模糊 */
    const load = async (q: { keyword: string; sort: ListSort; page: number }): Promise<boolean> => {
        const text = q.keyword.trim()
        authorLabel.value = ''

        if (UID_PATTERN.test(text)) {
            const hit = await getOne(text).catch(() => null)
            if (hit) {
                await router.push({ name: PAGE.PuzzleView, params: { pid: text } })
                return false                      // 已跳落地页 → 不做页码收敛
            }
            await puzzleStore.search({ uid: text, sort: q.sort, page: q.page })
            if (puzzleStore.authorUname)
                authorLabel.value = `${SEARCH_COPY.authorPrefix}${puzzleStore.authorUname} ${SEARCH_COPY.authorSuffix}`
            return true
        }

        await puzzleStore.search({ keyword: text, sort: q.sort, page: q.page })
        return true
    }

    const list = useListQuery({ routeName: PAGE.Search, load, pageCount: () => puzzleStore.pageCount })

    /** 题目预览：只读遮罩（数据走详情接口） */
    const openPreview = (pid: string): void => {
        void preview.showPreview(pid, false, SEARCH_COPY.preview)
    }

    /** 列表项「挑战」：拉到详情后直接开局，不走遮罩 */
    const challenge = async (pid: string): Promise<void> => {
        await detail.load(pid)
        if (!detail.error.value) await detail.challenge()
    }

    return {
        // 条件 / 分页 / 浏览偏好（useListQuery）
        ...list,
        // 列表三态
        items, total, pageCount, loading, error, empty, authorLabel,
        // 预览遮罩（usePuzzlePreview）+ 挑战
        ...preview,
        openPreview,
        challenge,
    }
}
```

**① `load` 的三分流（本文件的核心逻辑，也是最能体现"业务判断留在编排层"的地方）**

```
输入 text = 用户在搜索框里敲的东西
├─ 命中 20 位格式（UID_PATTERN）
│   ├─ ① 先当 pid 试：getOne(text) 命中 → 直接跳落地页 → return false（别收敛页码）
│   └─ ② 不命中 → 当 uid 搜（"某人的公开题"）→ 组 authorLabel 表头 → return true
└─ 其它 → ③ 关键词模糊搜（标题 / 出题人）→ return true
```

**为什么"先当 pid 再当 uid"**：**pid 与 uid 都是 20 位 base62**（02 册 §4.5）→ **单看字符串无法区分** → 只能"先试一个"。
试错的代价 = **一次请求**（`getOne` 返回 404 → `.catch(() => null)`）；换来的是"**粘贴别人的 pid 直接进落地页**"的顺滑体验。
> **`getOne(text).catch(() => null)`**：这里 404 是**预期结果**（"它不是 pid"），不是异常 → 转成 `null` 比抛错更贴合语义。

**② `return false` 那句为什么必须存在**（把 §2.4 的伏笔收掉）：
用户已被送去落地页 → 如果还继续做"页码收敛"，`applyQuery` 会**改当前路由**（把用户从落地页拽回搜索页）→ 所以 `load` 用 `false` 告诉 `useListQuery`：**"别管我了"**。

**③ `authorLabel` 的组装**
```ts
if (puzzleStore.authorUname)
    authorLabel.value = `${SEARCH_COPY.authorPrefix}${puzzleStore.authorUname} ${SEARCH_COPY.authorSuffix}`
```
- 数据（`authorUname`）来自 store —— 它在 `search()` 成功时从**第一条结果的 `uname`** 里取（05 册 §3.4）；
- 文案（前缀/后缀）来自 `constants` → **页面只显示 `authorLabel`**（一个字符串）；
- **没有命中就不设**（表头不显示）——`authorLabel.value = ''` 在函数开头已经清空。

**④ 六个"包一层 computed"**（与 §3.2 同一原理）：
```ts
const items = computed<SearchResult[]>(() => puzzleStore.items)
```
注释写明了原因："**store 取值包一层 computed，页面解构后仍是响应式**"。
（`useSearchPuzzle()` 返回的是普通对象；页面 `const { items } = useSearchPuzzle()` 解构后，`items` 仍是 `ComputedRef` → 模板里自动解包、永远响应 ✅）

**⑤ `...list` 与 `...preview` 两个展开（组合式函数组合）**
```ts
return { ...list, items, ..., ...preview, openPreview, challenge }
```
- 页面只需 `const page = useSearchPuzzle()` → **一次拿到"URL 条件 + 列表三态 + 预览遮罩 + 挑战"**；
- **这就是"composable 组合 composable"**：`useSearchPuzzle` = `useListQuery` + `usePuzzlePreview` + `usePuzzleDetail` + 自己的分流逻辑；
- 注意**展开顺序**：先 `...list` 再显式列字段（避免同名互相覆盖时的意外）。

**⑥ `challenge(pid)`：先取详情、有错就不开局**
```ts
await detail.load(pid)
if (!detail.error.value) await detail.challenge()
```
`detail.challenge()` 内部用 `useStartFromTexts` 拿到的函数 → 开局 → 上报热度 → 跳页（§6.1）。
**这里用 `detail.error.value` 判断**（而不是让 `load` 返回 boolean）—— 因为 `usePuzzleDetail` 的接口就是这样设计的（错误状态公开、由调用方决定怎么处理）。

### 6.4 `puzzle/useMyPuzzles.ts`（165 行）—— 我的题目页（**行内控件工厂**）

**代码分两段看（上半：状态 + 组合 + 统一入口）**：

```ts
/** 我的题目页（FR-7 / FR-13）：列表分页→useListQuery，预览→usePuzzlePreview；
 *  pid/题面串按 rowId 现取，改动后清缓存 + 重拉当前页 */
export const useMyPuzzles = () => {
    const router = useRouter()
    const puzzleStore = usePuzzleStore()
    /** 「挑战」开局：题面 / 答案串 → 棋局真源 */
    const startFromTexts = useStartFromTexts()
    const preview = usePuzzlePreview((rowId) => puzzleStore.detailOf(rowId))

    const items = computed<MyPuzzle[]>(() => puzzleStore.mine)
    const loading = computed<boolean>(() => puzzleStore.loading)
    const error = computed<string>(() => puzzleStore.error)
    const pageCount = computed<number>(() => puzzleStore.pageCount)
    const empty = computed<boolean>(() => !loading.value && !error.value && !items.value.length)

    /** PATCH / DELETE 进行中 → 转圈遮罩 */
    const busy = ref(false)
    /** 正在内联重命名的 rowId（'' = 无）；删除仍走二次确认弹层 */
    const renaming = ref('')
    const renameText = ref('')
    const removeOpen = ref(false)
    /** 当前操作的目标行 */
    const target = ref('')

    const list = useListQuery({
        routeName: PAGE.MyPuzzles,
        load: async (q) => { await puzzleStore.loadMine({ sort: q.sort, page: q.page }); return true },
        pageCount: () => puzzleStore.pageCount,
    })

    const detailOf = (rowId: string): Promise<MyPuzzleDetail | null> => puzzleStore.detailOf(rowId)

    /** 改动后：清该行缓存 + 重拉当前页 */
    const afterChange = (rowId: string): void => { puzzleStore.dropDetail(rowId); list.retry() }

    const goCreate = (): void => { void router.push({ name: PAGE.Create }) }

    /** pid 的「遮蔽/明文 + 👁📋」整块收在 SecretValue 组件里：这里只给「怎么取真值」 */
    const loadPid = async (rowId: string): Promise<string | null> => (await detailOf(rowId))?.pid ?? null

    /**
     * 行内改动统一入口：取详情拿 pid → 转圈调后端 → 清缓存 + 重拉当前页
     * （失败只提示，不动本地数据；failText 让删除与保存有各自的文案）
     */
    const withDetail = async (
        rowId: string,
        run: (pid: string) => Promise<void>,
        failText = '保存失败，请重试',
    ): Promise<void> => {
        const pid = await loadPid(rowId)
        if (!pid) return
        busy.value = true
        try {
            await run(pid)
            afterChange(rowId)
        } catch (err) {
            puzzleStore.error = errorTextOf(err, failText)
        } finally {
            busy.value = false
        }
    }

    /** 统一 PATCH：重命名 / 可见性 / 显示答案都走它 */
    const patch = (rowId: string, body: PuzzlePatch): Promise<void> =>
        withDetail(rowId, async (pid) => { await updatePuzzle(pid, body) })
```

**① `withDetail`：一个"统一入口"吃掉四种行内改动（本文件最值得学）**

```ts
const pid = await loadPid(rowId)      // ① 拿 pid（走缓存，必要时才请求）
if (!pid) return                      //    拿不到（加载失败）→ 什么都不做
busy.value = true                     // ② 转圈遮罩
try {
    await run(pid)                    // ③ 真正干活（PATCH / DELETE）
    afterChange(rowId)                // ④ 成功：清缓存 + 重拉当前页
} catch (err) {
    puzzleStore.error = errorTextOf(err, failText)   // ⑤ 失败：只提示，不动本地数据
} finally {
    busy.value = false                // ⑥ 无论如何都复位（同 §3.1 / §5.1 的纪律）
}
```

**为什么需要它**：四种改动（重命名 / 可见性 / 显示答案 / 删除）的**流程完全一样**（"拿 pid → 调接口 → 失效缓存 → 重拉列表"），只有"调哪个接口 + 失败文案"不同。
**注意 `run` 的签名是 `(pid) => Promise<void>`** —— 连 `pid` 都由 `withDetail` 提供，调用方只管"用 pid 干什么"（与 §2.4 的 `load`、§6.2 的 `load` 是同一手法）。

**② `afterChange`：缓存失效 + 重拉（两步都必要）**

```ts
const afterChange = (rowId: string): void => { puzzleStore.dropDetail(rowId); list.retry() }
```
- **`dropDetail(rowId)`**：这道题的详情变了 → 删它那一条缓存（05 册 §3.6 的精确失效）；
- **`list.retry()`**：列表里的标题/可见性/热度也可能变 → **重拉当前页**（§2.4 暴露的 `retry`）；
- **为什么不用"本地改一行"（乐观更新）**：那要手写"改 title / 改 visibility / 改 showSolution"三种本地变更，**容易漏、容易与后端不一致**。
  > **正确性优先于省一次请求**：代价是一次列表请求，换来"界面永远等于后端"。

**③ "值真的变了才 PATCH"（本文件出现三处）**

```ts
if (value === item.visibility) return                    // setVisibility
if (on === item.showSolution) return                     // setSolution
if (!rowId || !name || name.length > TITLE_MAX) return   // commitRename
```
**为什么必须判断**：下拉框在"值没变"时**也会触发 `change`**（点击同一项、或 `Esc` 取消）→ 不判断就会发**无意义的 PATCH**（浪费往返，还会触发 `afterChange` 重拉 → 界面闪一下）。
> 这条纪律在 §2.4（防自激）、§3.3（重命名）、§4.2（measure）都出现过 —— **"写入之前先判断值变没变"**。

**代码下半（四种改动的具体实现 + 行内控件工厂）**：

```ts
    /** 可见性下拉：值真的变了才 PATCH */
    const setVisibility = async (item: MyPuzzle, value: Visibility): Promise<void> => {
        if (value === item.visibility) return
        await patch(item.rowId, { visibility: value })
    }

    /** 显示答案下拉（开 / 关） */
    const setSolution = async (item: MyPuzzle, on: boolean): Promise<void> => {
        if (on === item.showSolution) return
        await patch(item.rowId, { showSolution: on })
    }

    /** 题目 / 答案预览（只读遮罩；不写任何游戏状态） */
    const openPreview = (rowId: string, answer: boolean): void => {
        void preview.showPreview(rowId, answer, answer ? MINE_COPY.answerPreview : MINE_COPY.preview)
    }

    /** 挑战自己的题：以自有题面开局（作者不计热度，所以不调 play） */
    const challenge = async (rowId: string): Promise<void> => {
        const detail = await detailOf(rowId)
        if (!detail) return
        const ok = startFromTexts(
            detail.puzzleText, detail.solutionText, detail.blankCount,
            { pid: detail.pid, title: detail.title, uname: detail.uname },   // ← 带来源信息
        )
        if (!ok) return
        await router.push({ name: PAGE.Game })
    }

    /** 编辑：拿到 pid 后进编辑页（路径参数） */
    const openEdit = async (rowId: string): Promise<void> => {
        const pid = await loadPid(rowId)
        if (pid) await router.push({ name: PAGE.EditPuzzle, params: { pid } })
    }

    /** 内联重命名：点标题旁「重命名」→ 标题变输入框；回车 / 失焦提交，Esc 取消 */
    const startRename = (item: MyPuzzle): void => { renaming.value = item.rowId; renameText.value = item.title }
    const cancelRename = (): void => { renaming.value = '' }
    const commitRename = async (): Promise<void> => {
        const rowId = renaming.value
        const name = renameText.value.trim()
        renaming.value = ''
        if (!rowId || !name || name.length > TITLE_MAX) return
        await patch(rowId, { title: name })
    }

    const confirmRemove = async (): Promise<void> => {
        await withDetail(target.value, async (pid) => {
            await removePuzzle(pid)
            removeOpen.value = false
        }, '删除失败，请重试')
    }

    /** 每行一套行内控件（闭包随行；components 只负责画） */
    const controlsFor = (item: MyPuzzle): MyPuzzleRowControls => {
        const id = item.rowId
        return {
            renaming: renaming.value === id,
            renameText: renameText.value,
            loadPid: () => loadPid(id),
            onRenameStart: () => startRename(item),
            onRenameInput: (text) => { renameText.value = text },
            onRenameCommit: () => { void commitRename() },
            onRenameCancel: cancelRename,
            onVisibility: (value) => { void setVisibility(item, value) },
            onSolution: (on) => { void setSolution(item, on) },
            onPreview: (answer) => openPreview(id, answer),
            onChallenge: () => { void challenge(id) },
            onEdit: () => { void openEdit(id) },
            onRemove: () => { target.value = id; removeOpen.value = true },
        }
    }
    const removeActions = computed<Actions>(() => [
        { key: 'remove', text: `🗑 ${MINE_COPY.remove}`, onClick: () => { void confirmRemove() } },
        { key: 'cancel', text: `↩ ${MINE_COPY.cancel}`, onClick: () => { removeOpen.value = false } },
    ])

    return {
        ...list,
        items, loading, error, empty, pageCount, busy,
        controlsFor, goCreate,
        ...preview,
        removeOpen, removeActions,
    }
}
```

**④ `controlsFor(item)`：行内控件工厂（本文件第二个亮点）**

**它解决的问题**：列表里**每一行都有一整套行内控件**（重命名输入框、可见性下拉、答案下拉、预览/挑战/编辑/删除按钮）。如果把这些状态与回调写进组件：
- 组件要知道 `rowId`、"当前是不是我在重命名"、还要调 PATCH → **组件立刻变成"懂业务"的胖子**；
- 更糟：`MyPuzzleRow.vue` 会被迫 import store / services → **R5 直接违规**（组件不许碰 store）。

**工厂写法**：composable **为每一行现做一份"控件数据 + 回调"的打包**（`MyPuzzleRowControls` 类型在 `types/item.ts`）→ 组件只做：
```html
<MyPuzzleRow :item="item" :controls="controlsFor(item)" />
```
**`const id = item.rowId` 这一行是"闭包捕获"**：后面所有回调都绑定在**这一行**的 id 上 → **不会串行**（点第 3 行的删除不会删掉第 5 行）。

**⑤ `challenge(rowId)`：作者挑战自己的题（注意"不调 play"）**

```ts
const ok = gameStore.startFromTexts(
    detail.puzzleText, detail.solutionText, detail.blankCount,
    { pid: detail.pid, title: detail.title, uname: detail.uname },   // ← 带来源信息
)
```
- **这次带了 `source`** → 游戏页信息行显示"标题 · 出题人"（05 册 §2.12 的 `source` 参数）；
- **不调 `play(pid)`**（注释："作者不计热度"）→ 后端本来也不会计（02 册 §5.7），前端省一次请求；
- 与 §6.1 的 `challenge()` 对照：**那边是"别人的题"（上报热度、不带来源信息），这边是"自己的题"（不上报、带来源）**。

**⑥ `empty` 为什么在本地又算了一遍**

```ts
const empty = computed(() => !loading.value && !error.value && !items.value.length)
```
**关键点**：`puzzleStore.empty` 算的是**搜索结果**（`puzzleStore.items`），而这里要算的是**我的题目**（`puzzleStore.mine`）→ **不能复用**。
> **知识点：派生是"针对具体数据"的** —— 换了数据源（`mine` 而不是 `items`），派生就得重写。
> 这也说明 `puzzleStore.empty` 其实"绑定在 items 上"；若将来再有第三个列表，"空态"又要写一遍 —— 那时可以抽一个 `emptyOf(loading, error, list)` 小工具。

**⑦ `busy` 为什么是页面级状态（不进 store）**：
它只在"当前页有一次 PATCH/DELETE 在飞"时有意义 → **随页面生命周期存在**（05 册 §5.2 的判据："只有一处用 → composable"）。
它的作用：`PATCH / DELETE 进行中 → 转圈遮罩`（注释原文），避免用户连点。

---

## 7. `solve/useSolveFlow.ts`（172 行）—— 题目求解（**本册最后一个、也是最长的一个**）

**① 它编排什么**：输入（粘串 / 手填棋盘）→ 本地校验 → **Worker 多解** → 结果逐解浏览。

```ts
/**
 * 题目求解流程：输入（粘串 / 手填棋盘）→ 本地校验 → Worker 多解 → 结果逐解浏览
 * · 输入盘复用 gameStore 的 Solve 模式（select / inputNum / conflictMask 都是现成的）
 * · 输入盘与结果盘各有自己的缩放；解列表只活在本地，不进 store（R15）
 */
export const useSolveFlow = () => {
    const gameStore = useGameStore()

    const inputMode = ref<SolveInputMode>(SOLVE_INPUT_MODE.Text)
    const puzzleText = ref('')
    const maxSolutions = ref<number>(SOLVE_LIMIT_DEFAULT)
    const solutions = ref<NumBoard[]>([])
    const solutionIndex = ref(0)
    const loading = ref(false)
    const error = ref('')

    /** 输入盘自己的缩放（换盘面大小时跟着复位） */
    const inputZoom = useZoom(defaultZoomOf(GAME_INIT_CONFIG.boxSize))
    /** 结果盘自己的缩放（每次求解后复位） */
    const resultZoom = useZoom()

    // 进页先起一张空盘：不把上一页留下的盘面带过来
    gameStore.startSolve(GAME_INIT_CONFIG.boxSize)

    const boxSize = computed<number>(() => gameStore.config.boxSize)
    const padMax = computed<number>(() => gameStore.sudoku.S)
    const padColumns = computed<number>(() => gameStore.sudoku.B)

    /** 输入盘渲染入参（可玩） */
    const boardInput = computed<BoardRenderInput>(() => ({
        board: gameStore.board,
        boxSize: gameStore.sudoku.B,
        selected: gameStore.selected,
        conflictMask: gameStore.conflictMask,
        zoom: inputZoom.zoom.value,
    }))

    /** 结果盘渲染入参（只读：解本身已填满） */
    const solutionInput = computed<BoardRenderInput>(() => ({
        board: fromPuzzle(solutions.value[solutionIndex.value] ?? [], true),
        boxSize: gameStore.sudoku.B,
        zoom: resultZoom.zoom.value,
        interactive: false,
    }))

    /** 清掉上一轮的解 */
    const resetResult = (): void => {
        solutions.value = []
        solutionIndex.value = 0
    }

    /** 换盘面大小：重建空盘 + 复位输入盘缩放 + 清结果 */
    const setBoxSize = (next: number): void => {
        gameStore.startSolve(next)
        inputZoom.resetZoom(defaultZoomOf(next))
        error.value = ''
        resetResult()
    }

    /** 换输入方式（已输入的内容都保留） */
    const setInputMode = (mode: SolveInputMode): void => {
        inputMode.value = mode
        error.value = ''
    }

    /** 清空棋盘（尺寸不变） */
    const clearBoard = (): void => {
        gameStore.startSolve(gameStore.sudoku.B)
        error.value = ''
        resetResult()
    }
```

**② 开头就点明的两件事（注释原文）**：

| 注释 | 含义 |
|---|---|
| "**输入盘复用 gameStore 的 Solve 模式**（`select` / `inputNum` / `conflictMask` 都是现成的）" | 手填盘不需要另造一套：`GameMode.Solve` 就是"手填盘"模式（05 册 §2.13），盘面交互全部走 store 的现成动作 |
| "**解列表只活在本地，不进 store**（R15）" | 解是"这一次求解的工作产物"，刷新即失、没必要全局共享 → 放 `ref`（05 册 §5.2 的判据） |

**③ 两套独立缩放（`useZoom` 多实例的第三个例子）**

```ts
const inputZoom = useZoom(defaultZoomOf(GAME_INIT_CONFIG.boxSize))   // 输入盘：初始按默认盘面
const resultZoom = useZoom()                                          // 结果盘：默认 min
```
- **输入盘**：可玩，尺寸变化时要复位（`setBoxSize` / `applyText` 里手动 `resetZoom`）；
- **结果盘**：只在"求解成功"时出现 → 在 `solve()` 成功后复位；
- 两者**互不影响**（各自实例）—— 与 §4.1 的判据、§5.6 的答案遮罩缩放完全一致。

**④ `gameStore.startSolve(GAME_INIT_CONFIG.boxSize)` 写在 setup 顶层**（不是 `onMounted`）
注释："进页先起一张空盘：**不把上一页留下的盘面带过来**"。
**与 `useCreateFlow` 的 `onMounted(() => restart(...))` 的差别**：两者效果一样（store 是全局的、不需要等 DOM）；`onMounted` 更"标准"，写在 setup 顶层更"直接"。
> **要点**：**"进页面就重置"这件事必须做** —— 否则从"出题页"切到"求解页"时，`gameStore.board` 里还留着上一页的盘（`mode` 也会不对）。

**⑤ `padMax` / `padColumns`：数字键盘的渲染参数**
```ts
const padMax = computed<number>(() => gameStore.sudoku.S)      // 可选数字 1..S
const padColumns = computed<number>(() => gameStore.sudoku.B)  // 每行 B 个（与宫宽对齐）
```
**为什么要暴露**：页面不许 import core（R6）→ 它拿不到 `S`/`B` → 由 flow 从 `gameStore.sudoku`（规则实例）取出来给它。

**⑥ `boardInput` vs `solutionInput`（两个渲染入参的对照）**

| | 输入盘 | 结果盘 |
|---|---|---|
| 数据来源 | `gameStore.board`（可玩盘） | **`fromPuzzle(solutions[index] ?? [], true)`（每次现构造）** |
| `selected` / `conflictMask` | 有（可玩、要画选中和冲突） | 没有（只读） |
| `zoom` | `inputZoom.zoom.value` | `resultZoom.zoom.value` |
| `interactive` | 不传（默认 `true`，可点） | **`false`** |
- **结果盘为什么每次 `fromPuzzle`**：解是 `NumBoard`，而画布要 `Board`（`Cell[][]`）→ 必须转一次（04 册 §4.2）；`true` = 把解渲染成"给定数字"的样子（深色粗体）；
- **`?? []`**：索引越界（清空后 `solutions[0]` 是 `undefined`）→ 给空盘 → 画布不画（不会崩）。

**⑦ `applyText`：把题面串解析进棋盘**

```ts
/**
 * 把题面串解析进棋盘：false = 没成功（已写 error，现有盘面不动）
 * 成功 = 回填棋盘 + 复位输入盘缩放 + 切到「棋盘填入」模式（能看见 / 能改）+ 清旧结果
 */
const applyText = (): boolean => {
    error.value = ''
    if (!puzzleText.value.trim()) {
        error.value = SOLVE_COPY.blank
        return false
    }
    const parsed = parsePuzzle(puzzleText.value)
    if (!parsed) {
        error.value = SOLVE_COPY.badPuzzle
        return false
    }
    gameStore.startSolve(parsed.boxSize, parsed.board)
    inputZoom.resetZoom(defaultZoomOf(parsed.boxSize))
    inputMode.value = SOLVE_INPUT_MODE.Board
    resetResult()
    return true
}
```
**四个要点**：
1. **失败时"现有盘面不动"**（注释）：用户粘错了串 → **不要清掉他正在手填的盘**（那会让人抓狂）；
2. **成功后自动切到"棋盘填入"模式**：让用户**看见**刚解析出来的盘、并且能继续改（这是最自然的下一步）；
3. **`inputZoom.resetZoom(defaultZoomOf(parsed.boxSize))`**：盘面尺寸可能变了 → 缩放必须跟着复位（否则 16×16 会显示成"半个盘"）；
4. **`resetResult()`**：盘换了解也失效。

**⑧ `validate`：三道"本地就能查出来"的检查（**省一次 Worker 往返**）**

```ts
/** 求解前的本地校验：全空 / 盘面过大 / 有冲突 —— 都不值得再让 Worker 跑长回溯 */
const validate = (): boolean => {
    if (isBlankBoard(gameStore.numBoard)) { error.value = SOLVE_COPY.blank; return false }
    if (gameStore.sudoku.B > SOLVE_MAX_BOX_SIZE) { error.value = SOLVE_COPY.tooBig; return false }
    if (gameStore.sudoku.hasConflict(gameStore.numBoard)) { error.value = SOLVE_COPY.conflict; return false }
    return true
}
```

| 检查 | 为什么"不值得进 Worker" |
|---|---|
| 全空（`isBlankBoard`） | 空盘解太多（天文数字）→ 跑下去只会到上限，**没有意义** |
| 盘面过大（`B > SOLVE_MAX_BOX_SIZE`） | 大盘多解枚举会**跑很久甚至内存爆**（保险丝 2000 万步也扛不住）→ 直接告诉用户"太大了" |
| 有冲突（`hasConflict`） | **有冲突必然无解** → 让 Worker 跑等于浪费几百毫秒 |

**这就是 §6.2 注释里那句"页面自己也会先判一次冲突（省一次 Worker 往返），这里的守卫是给其它调用方的"的出处** ——
**前端做"便宜的预检"、core 做"既定的守卫"、Worker 做"重活"**，三层分工。
（`gameStore.sudoku.hasConflict` 是 O(S²) 的本地计算：微秒级；Worker 往返：**几百毫秒起**。）

**⑨ `solve`：完整流程**

```ts
/** 求解：字符串模式先解析回填棋盘，再本地校验 → Worker 多解；无解由 Worker 回「这盘无解」 */
const solve = async (): Promise<void> => {
    if (loading.value) return                                   // ① 双击保护
    error.value = ''                                            // ② 清旧错误
    resetResult()                                               // ③ 清上一轮的解
    if (inputMode.value === SOLVE_INPUT_MODE.Text && !applyText()) return   // ④ 串模式：先解析回填
    if (!validate()) return                                     // ⑤ 三道本地检查

    loading.value = true
    try {
        solutions.value = await solveMultiInWorker(gameStore.numBoard, maxSolutions.value)   // ⑥ Worker
        resultZoom.resetZoom(defaultZoomOf(gameStore.sudoku.B))                              // ⑦ 结果盘缩放复位
    } catch (err) {
        error.value = errorTextOf(err, SOLVE_COPY.fail)         // ⑧ 超时/失败文案（来自 core/solve 常量）
    } finally {
        loading.value = false                                   // ⑨ 复位
    }
}
```
**四个值得注意的点**：
1. **④ 只有"串模式"才需要 `applyText()`**：棋盘模式用户已经填好了 → 跳过；这一步**内部还会失败**（串解析不了）→ `!applyText()` 就 `return`；
2. **⑥ `solveMultiInWorker(numBoard, maxSolutions.value)`**：`maxSolutions` 来自页面（`SOLVE_LIMIT_DEFAULT`），Worker/core 侧还有 `solveLimitOf` 的 `[1,50]` 夹紧（04 册 §12.1）→ **双层防御**；
3. **⑦ 成功后复位结果盘缩放**：结果盘是"刚出现的"，尺寸此时才确定；
4. **⑧ 失败文案由 `errorTextOf` 处理** → Worker 超时会给出"这盘太大/超时"之类的**具体原因**（01 册 §3.7 的 `SOLVE_COPY.timeout`）。

**⑩ `changeSolution` + 两个薄转发 + 三个展示派生**

```ts
/** 步骤条切到第 k 个解（越界直接忽略） */
const changeSolution = (index: number): void => {
    if (index < 0 || index >= solutions.value.length) return
    solutionIndex.value = index
}

const selectCell = (pos: Position): void => gameStore.select(pos)
const inputNum = (n: number): void => gameStore.inputNum(n)

/** 结果行：找到几个解（到上限说明还有更多解没找） */
const resultInfo = computed<string>(() => {
    const found = solutions.value.length
    const unit = SOLVE_COPY.solutionUnit
    return found >= maxSolutions.value
        ? `共找到 ${found} ${unit}（${SOLVE_COPY.limitNote} ${maxSolutions.value}）`
        : `共找到 ${found} ${unit}`
})

/** 步骤条信息行：第 k / 共 n 个解 */
const pagerInfo = computed<string>(() =>
    solutions.value.length ? `第 ${solutionIndex.value + 1} / 共 ${solutions.value.length} 个解` : '')

/** 步骤文案：解 1 / 解 2 … */
const stepLabel = (index: number): string => `解 ${index + 1}`
```
- **`changeSolution` 的越界守卫**：与 05 册 §2.17 的 `jump` 同款（**静默忽略**，UI 动作的非法输入就该"什么都不发生"）；
- **`selectCell` / `inputNum` 是薄转发**：页面本来可以写 `@cell-click="gameStore.select"`（`GamePage` 就是这么写的），但求解页把这些也收进 flow → **页面完全不碰 store**（一致性）；
- **`resultInfo` 的"到上限"分支**：`found >= maxSolutions` → 说明**还有更多解没找**（提示"最多 50 个"）—— **"结果的完整性"要如实告诉用户**，不能让人以为"只有 5 个解"；
- **`pagerInfo` 空串 = 隐藏**：没有解时返回 `''` → 页面 `v-if` 掉这一行（同 04 册 §16.2 的"空串即通过"思路）；
- **`stepLabel` 用 `index + 1`**：`PagerBar` 传的是 0-based 索引，**展示要 1-based**（04 册 §17.1 的 `offsetOf` 那条 off-by-one 纪律的同源问题）。

**⑪ 全册最后一个文件讲完了 —— 它的"接口形状"总结**

| 类别 | 内容 |
|---|---|
| 输入状态 | `inputMode` / `puzzleText` / `maxSolutions` |
| 结果状态 | `solutions` / `solutionIndex` / `loading` / `error` |
| 渲染入参 | `boardInput`（可玩）/ `solutionInput`（只读） |
| 展示派生 | `boxSize` / `padMax` / `padColumns` / `resultInfo` / `pagerInfo` / `stepLabel` |
| 控件数据 | `inputZoomActions` / `resultZoomActions`（两套缩放的按钮条） |
| 动作 | `setInputMode` / `setBoxSize` / `clearBoard` / `applyText` / `solve` / `changeSolution` / `selectCell` / `inputNum` |
| 常量透传 | `boxSizeOptions`（`BOX_SIZE_SELECT_OPTIONS`，给下拉用） |

**页面拿到这些东西后，只需要"摆位置 + 绑事件"** —— 与 `GamePage` 的 7 个声明是同一个模式。

---

## 8. 编排层的五条共性（**能直接迁移到别的项目**）

> 这五条是从本册 18 个文件里**归纳**出来的，不是从文档抄的。每条都给"出现位置"与"反例后果"。

### 8.1 第一条：**异步动作 = 防重复 + 清错误 + try/finally 复位**

```ts
if (loading.value) return      // ① 双击保护
error.value = ''               // ② 开始就清旧错误
loading.value = true
try {
    ...                        // ③ 干活
} catch (err) {
    error.value = errorTextOf(err, '……')   // ④ 统一文案
} finally {
    loading.value = false      // ⑤ 无论如何都复位
}
```

**出现位置**（本册 8 处）：`useAuth.submit` · `useDifficultyFlow.apply` · `useCreateFlow.submitSolution` · `useEditFlow.load` / `submitSolution` · `useCustomFlow.apply` · `useSolveFlow.solve` · `useMyPuzzles.withDetail` · `puzzleStore.loadPage`（05 册）。

**反例后果**：
- 少了 ①：双击"注册"→ 发出两次请求（**可能建出两个账号**）；
- 少了 ⑤（或把复位写在成功分支）→ **转圈遮罩永远不消失**（`useDifficultyFlow` 里那条"← 修复：原先成功路径不复位，overlay 会残留"就是活教训）。

### 8.2 第二条：**写入之前判断"值真的变了吗"（防无意义请求 / 防自激）**

```ts
if (value === item.visibility) return                    // useMyPuzzles.setVisibility
if (on === item.showSolution) return                     // useMyPuzzles.setSolution
if (name !== userStore.uname) await userStore.rename(name)   // useAccountPanel.commitRename
if (width !== contentWidth.value) contentWidth.value = width // useBoardCanvas.measure
if (bounded !== page.value) applyQuery(bounded)              // useListQuery.loadAndClamp
```

**两类收益**：
1. **省请求 / 少闪烁**：下拉框值没变也会触发 `change` → 不判断就白发一次 PATCH（还会连着重拉列表）；
2. **防死循环**：`measure` 与 `loadAndClamp` 都是"读状态 → 可能写状态"的回调，**没有相等判断就会自激**（§2.4、§4.2 都详述过）。

> **口诀**：**凡"因为某状态变化而写另一个状态"的地方，都先问一句"真的变了吗？"**

### 8.3 第三条：**失败用"返回值"表达；文案统一交给 `errorTextOf`**

| 入口 | 失败怎么表达 | 谁决定怎么显示 |
|---|---|---|
| `gameStore.startFromTexts` | 返回 `false` | 调用方（`if (!ok) return` 不跳页） |
| `puzzleStore.detailOf` | 返回 `null` | 调用方（`if (!detail) return`） |
| `useListQuery.load` | 返回 `false`（= "别收敛页码"） | `useListQuery` 自己 |
| `useSolveFlow.applyText` | 返回 `false` + 写 `error` | 页面显示 `error` |
| `useMyPuzzles.withDetail` | 无返回值 + 写 `puzzleStore.error` | 页面显示 `error` |
| `useCustomFlow.validate` / `save` | 返回 `false` + 写 `error` | 页面显示 `error` |

**统一的一点**：**文案都来自 `errorTextOf(err, 兜底)`**（04 册 §16.1）→ **后端写的中文原因原样显示**，前端只提供"这个场景下的兜底措辞"。
**反例后果**：每个调用点各写 `catch` + 各写文案 → 同一个错误在不同页面说法不同，且有的地方忘了写兜底 → 用户看到 `[object Object]`。

### 8.4 第四条：**依赖注入 —— composable 不自己去"找"数据/元素**

| composable | 注入的东西 | 为什么要注入 |
|---|---|---|
| `useBoardCanvas` | `canvasEl` / `boxEl` / `input()` / `onCellClick` | 模板 ref 只有组件有；回调由调用方决定 |
| `useListQuery` | `load` / `pageCount` / `routeName` | 两个列表页取数与页数来源不同 |
| `usePuzzlePreview` | `load` | 一个走 store 缓存、一个走接口 |
| `useMyPuzzles.withDetail` | `run(pid)` / `failText` | 四种改动只差"调哪个接口 + 失败文案" |
| `metaTextOf` | `MetaParts` | 列表页/详情页/游戏页的数据来源不同 |
| `solveGrid`（core） | `rng` / `onSolution` | 随机源与停止策略由调用方给 |

**统一的一点**：**"会变的部分"作为参数传进来，"不变的流程"留在里面**（04 册 §4.10 的 `onSolution`、05 册 §3.3 的 `loadPage` 都是这个套路）。
**反例后果**：把"取数方式"写死在 `usePuzzlePreview` 里 → 搜索页就没法复用它（只能复制一份改改，然后两份逻辑慢慢分叉）。

### 8.5 第五条：**屏幕上的东西都是"数据"（按钮条 / 渲染入参 / 展示文本）**

| 形态 | 例子 | 页面怎么用 |
|---|---|---|
| 按钮条 `Actions` | `leadActions` / `trailActions` / `zoomActions` / `answerActions` / `removeActions` | `v-for="a in items"` + `@click="a.onClick"` |
| 渲染入参 `BoardRenderInput` | `boardInput` / `solutionInput` / `answerInput` / `previewInput` | `v-bind="boardInput"` |
| 展示文本 | `infoText`（页面算）/ `metaText` / `tip` / `resultInfo` / `pagerInfo` / `authorLabel` | `{{ metaText }}` |
| 数字参数 | `padMax` / `padColumns` / `blankCount` / `totalCells` / `blankPercent` | 直接绑 |

**统一的一点**：**"该不该显示、能不能点、显示什么"全在 composable 里算好**，组件/页面**只负责摆放**。
**两个最典型的"数据化"手法**：
- **`Action` 不给 `onClick` = 禁用（渲染成纯文本）** —— 让组件不需要任何 `disabled` 逻辑（§4.1、§5.5 ⑧）；
- **条件拼装 `...(cond ? [x] : [])`** —— 让"哪些按钮存在"完全由业务事实决定（§5.6 ①）。

### 8.6 另外两条横切纪律（贯穿本册）

| 纪律 | 说明 | 出现位置 |
|---|---|---|
| **进页面就"重置 / 加载"** | 保证页面从干净状态开始（不带上一次的残留） | `useCreateFlow` 的 `onMounted(restart)` · `useEditFlow` 的 `onMounted(load)` · `useSolveFlow` 的 setup 顶层 `startSolve` · `useGameFlow` 的 `onMounted` 页面守卫 |
| **跨页一次性信息的"写入—读取"闭环** | 写入方 `flashSaved`、读取方 `takeSavedTip`（取走即清） | `useCustomFlow`（写）→ `useGameFlow.onMounted`（读）（05 册 §3.7） |

---

## 9. 本册自测（25 题）

### 通用工具与框架（§2）

1. `useClipboard` 为什么返回 `boolean` 而不是抛错？同一次"复制失败"在两个消费方（登录页 / 导出遮罩）显示在不同位置 —— 这说明 composable 与组件各自的职责是什么？
2. `metaText.ts` 为什么"不是 composable"却放在 `composables/` 目录？（说出 E8 登记的原因）它里面 `createdAt || Date.now()` 为什么用 `||` 而不是 `??`？
3. `useListQuery` 的三个注入参数各是什么？为什么"点搜索按钮"不能直接发请求，而要"只改 URL、由 `watch` 统一取数"？（说出四条用户路径）
4. `useListQuery.loadAndClamp` 里 `if (bounded !== page.value)` 这一句删掉会怎样？
5. `useSearchPuzzle.load` 返回 `false` 是什么含义？如果不返回 `false`，用户会看到什么奇怪的现象？

### auth 与 board（§3、§4）

6. `safeRedirect` 里的 `!raw.startsWith('//')` 是防什么的？举出"只有 `startsWith('/')` 判断"时被利用的具体攻击 URL。
7. `useAuth.submit` 里注册成功为什么"不跳页"？`createdUid` 这个状态的作用是什么？
8. `useAccountMenu` 里那句注释"store 里取出的已是解包后的值 → 包一层 computed 才能保持响应"讲的是什么问题？不用 `computed` 直接返回 `userStore.isGuest` 会怎样？
9. `useZoom` 为什么必须是 composable 而不是 store？（说出"多份实例 + 生命周期跟组件走"这条判据，并举出项目里的 5 份实例）
10. `BoardView` 内部如果自己调 `useZoom()` 会出现什么 bug？为什么 `usePuzzlePreview` 内部调 `useZoom()` 却是合法的？
11. `useBoardCanvas.draw()` 里为什么"先把 `canvasEl` 和 `input()` 都读一遍"再判断？如果写成 `if (!canvas) return` 在前，会发生什么？
12. `useBoardCanvas` 为什么要量"外层滚动框"而不是"canvas 的直接父级"？（说出"反馈循环"）

### game 七件（§5）

13. `useDifficultyFlow` 的 `draft` 为什么不进 store？那句 `finally { loading.value = false }` 的注释记录的是一段什么历史 bug？
14. `usePuzzleStage` 的 `puzzleSnapshot.value = gameStore.numBoard` 为什么不需要 `cloneBoard`？（说出它成立的前提；这个前提被破坏时会怎样）
15. `useCreateFlow.changeBoxSize` 里那一行 `custom` 计算为什么必须放在 `restart(b)` 之前？
16. `useCreateFlow.submitSolution` 为什么把"标题校验"放在 `checkSolution()` 之后？
17. `useCreateFlow.submitSolution` 里 `puzzleText` 用 `puzzleSnapshot`、`solutionText` 用 `gameStore.numBoard` —— 记反了会怎样？
18. `useCustomFlow.validate` 为什么没有"40%~65%"这一条？它在哪一步才校验比例？
19. `useCustomFlow.apply` 里 `if (!(await save())) return` 这一句如果不写（即保存失败也继续开局），用户会遇到什么问题？
20. `useGameFlow.trailActions` 里三个条件拼装各自代表什么业务事实？为什么"答案"按钮要看 `solution.length`？
21. `useGameFlow.restart` 为什么用 `gameStore.jump(0)` 而不是"清空棋盘"？`goBack` 为什么要判断 `history.state.back`？
22. `useStartFromTexts` 承担了哪三件事（解析两串 / 算比例 / 定"来源 = Challenge"）？为什么它**不该**留在 store、又**不能**写成 `core/` 纯函数（有副作用）？它被哪两个调用方复用？`parsePuzzle` 为什么在这个函数里要调**两次**？

### puzzle 与 solve（§6、§7）

23. `usePuzzlePreview` 的 `load` 由调用方注入 —— 两个调用方分别注入什么？这样设计比"把取数写死在里面"好在哪？
24. `useSearchPuzzle.load` 为什么"先当 pid 再当 uid"？（提示：两种 id 的格式）
25. `useMyPuzzles.withDetail` 的 `run` 参数签名是 `(pid) => Promise<void>` —— 为什么把 `pid` 交给它提供？`controlsFor` 里 `const id = item.rowId` 这一行是防什么的？
26. `useSolveFlow.validate` 的三道检查分别拦什么？为什么说它们"不值得进 Worker"？（用"微秒级 vs 几百毫秒"解释）`solutionInput` 为什么每次都要 `fromPuzzle(...)`？

> **答不上来的题号 → 回看**：1-2 → §2.1/§2.3；3-5 → §2.4/§6.3；6-8 → §3.1~§3.3；9-12 → §4.1/§4.2；13-14 → §5.1/§5.2；15-17 → §5.3；18-19 → §5.5；20-21 → §5.6；22 → §5.7；23 → §6.2；24 → §6.3；25 → §6.4；26 → §7。

---

## 附：本册速查表

| 想做的事 | 去哪个 composable | 具体 |
|---|---|---|
| 让用户填一串题面并开局 | `useCustomFlow` | `puzzleText` / `apply()` |
| 出题（手填题面 → 填答案 → 入库） | `useCreateFlow` | `submitPuzzle()` / `submitSolution()` |
| 编辑自己的题 | `useEditFlow` | `load()` / `submitSolution()` |
| 系统生成一局 | `useDifficultyFlow` | `draft` / `apply()` |
| 玩游戏（提示 / 答案 / 导出 / 通关） | `useGameFlow` | `leadActions` / `trailActions` / `answerInput` |
| 用「题面/答案串」直接开局（挑战） | `useStartFromTexts` | `startFromTexts(puzzleText, solutionText, blankCount, source?)` |
| 求解一道题（多解） | `useSolveFlow` | `inputMode` / `solve()` / `solutions` |
| 看某道题详情 / 挑战 | `usePuzzleDetail` | `load(pid)` / `challenge()` |
| 预览题目 / 答案 | `usePuzzlePreview` | `showPreview(id, answer, title)` |
| 搜索页（列表 + 预览 + 挑战） | `useSearchPuzzle` | 全部 |
| 我的题目（列表 + 行内改动） | `useMyPuzzles` | `controlsFor(item)` |
| 登录 / 注册 | `useAuth` | `submit()` / `switchMode()` |
| 顶栏账号位 | `useAccountMenu` | `isGuest` / `uname` |
| 「我的」页账号区 | `useAccountPanel` | `commitRename()` / `logout()` |
| 棋盘缩放 | `useZoom` / `useBoardZoom` | `zoomActions` |
| canvas 绑定与重绘 | `useBoardCanvas` | `onCanvasClick` |
| 复制到剪贴板 | `useClipboard` | `copy(text)` |
| 题目串导出遮罩 | `usePuzzleExport` | `show(text)` |
| 列表 URL / 分页 / 浏览偏好 | `useListQuery` | `onSearch` / `changePage` / `pagerMode` |
| 元信息行文案 | `metaTextOf` | 传 `sideS/blankCount/createdAt/…` |

**下一册（07）进入 `components/` 与 `pages/`**：看这些"数据"如何被**画出来** —— 15 个组件的契约、`BoardView` 的只读/可玩双形态、`Overlay` 的插槽、`ListSection` 的骨架、`PagerBar` 的一分支一形态、以及 11 个页面如何"只接线"。























