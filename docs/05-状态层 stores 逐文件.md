# 05 · stores 逐文件详解

> **这一册讲什么**：`src/stores/` 三个文件（`game.ts` 169 行 / `puzzle.ts` 104 行 / `user.ts` 39 行）**逐段**讲透：
> 每个 `ref` 为什么值得存、每个 `computed` 在算什么、每个 action 调了哪个 core/services 函数、以及**什么数据不该进 store**。
> **前置**：01 册 §2（Pinia 基础）、03 册 §4 R4（数据层不写算法）、04 册（core 的每个函数长什么样）。

---

## 0. 这一册的固定结构

| 段 | 内容 |
|---|---|
| **① 状态清单表** | 每个 `ref`/`computed`：类型 / 为什么需要 / 谁在读 / 谁在写 |
| **② 逐段解释** | 贴真实代码，说明"为什么这样设计" |
| **③ 陷阱与约定** | 直接改对象属性安全吗？缓存什么时候失效？ |
| **④ 反例对照** | 同样的需求若写成别的样子会出什么问题 |

**读法建议**：先读 §1（全景与判据），再按 `game → puzzle → user` 顺序读；最后读 §5（三个 store 的共性模式）—— 那一节是**能直接迁移到你自己项目里的东西**。

---

## 1. stores 全景：三个 store 各管什么

### 1.1 清单

| 文件 | 行 | store id | 管什么 | 数据性质 |
|---|---|---|---|---|
| `stores/game.ts` | 169 | `gameStore` | **一局游戏的全部状态**：盘面、选中、历史快照、答案、来源、配置 | **过程状态**（刷新即失） |
| `stores/puzzle.ts` | 104 | `puzzleStore` | **题目列表与详情**：搜索结果、我的题目、详情缓存、分页总数、加载/错误 | **取来的数据 + 缓存** |
| `stores/user.ts` | 39 | `userStore` | **登录态**：`profile`（唯一真源）+ 派生 + 四个动作 | **跨页共享的会话状态** |

### 1.2 为什么只有三个 store（判据回顾）

01 册 §2.4 给过判据，这里用**真实例子**再对一遍：

| 数据 | 该放哪 | 为什么 |
|---|---|---|
| `gameStore.board` | **store** | 游戏页、答案遮罩、导出、判胜都要读 → **跨组件 + 需要响应式** |
| `gameStore.solution` | **store** | 参考答案遮罩、作弊、判胜辅助都要读 |
| `useGameFlow` 里的 `answerOpen`（遮罩开关） | **composable** | 只有游戏页用它 → 放进 store 只会让 store 臃肿（01 册 §2.4 的反例） |
| `useGameFlow` 里的 `tip`（提示文案） | **composable** | 同上，且它是"一次性"的（下一次点击就该消失） |
| 搜索框里正在输入的 `keyword` | **route query + composable** | 它要**可分享/可刷新**（R15）→ 不是 store 的活 |
| `pagerMode`（浏览方式偏好） | **localStorage**（`services/prefs.ts`） | 纯 UI 偏好，要跨会话保留 |
| `puzzleStore.details`（详情缓存） | **store** | 多个入口（预览/编辑/挑战）都要读同一份 → 缓存集中一处 |

**一句话判据**：
> **"多个组件要读、并且在本次会话内要一直记住"→ store；"只有一处用"→ composable；"要分享/刷新保留"→ route query / localStorage。**

### 1.3 依赖图：stores 能依赖什么（R2 矩阵）

```
stores/ 允许依赖：
  ✅ vue（ref/computed）· pinia（defineStore）
  ✅ @/services/**   ← 取数据（HTTP / Worker / 本地存储）
  ✅ @/core/**       ← 算（纯函数）
  ✅ @/constants/** · @/types/**
  ❌ vue-router      ← R4：跳转不归 store（要跳就让 composable 跳）
  ❌ @/composables/** ← 反向依赖：composable 用 store，不是反过来
  ❌ @/components/** · @/pages/**  （展示层）
```

**三个 store 的真实 import（一眼验证）**：

```ts
// game.ts
import { toNum, fromPuzzle } from '@/core/board/model'        // core ✅
import { cloneBoard, lockGiven, applySolution, countBlanks } from '@/core/board/ops'
import { statusOf } from '@/core/game/derive'
import { parsePuzzle } from '@/core/sudoku/parse'
import { getSudoku } from '@/core/sudoku/rules'
import { defineStore } from 'pinia'                            // pinia ✅
import { computed, ref } from 'vue'                            // vue ✅
// 没有任何 @/services、@/composables、vue-router —— game 是纯"本地状态机"，不取数据

// puzzle.ts
import { getMine, listMine, search as apiSearch } from '@/services/api/puzzleApi'   // services ✅
import { errorTextOf } from '@/core/message'                                        // core ✅
import { pageCountOf } from '@/core/page'

// user.ts
import { onUnauthorized } from '@/services/api/client'          // services ✅
import { login as apiLogin, ... } from '@/services/api/userApi'
```

**看出分工了**：
- **`gameStore` 完全不碰网络**（它只管本地一局游戏的状态机）；
- **`puzzleStore` 碰网络**（列表/详情就是"取来的数据"）；
- **`userStore` 碰网络 + 与 HTTP 层的 401 事件接线**（01 册 §2.3 ⑥）。

---

## 2. `stores/game.ts`（169 行）—— 一局游戏的状态机

**① 这个文件是干嘛的**：它把"**一局游戏**"这件事的全部状态收在一处，并提供**唯一的改写入口**。
**它是三个 store 里最重要的一个**：游戏页、答案遮罩、导出、判胜、历史记录全依赖它。

### 2.1 状态清单（每个字段为什么值得"记住"）

```ts
export const useGameStore = defineStore('gameStore', () => {
    const config = ref<GameConfig>({ ...GAME_INIT_CONFIG })      // ① 本局配置（盘面大小 B、挖空比例）
    const mode = ref<GameMode>(GAME_MODE.Game)                   // ② 当前模式（游玩/出题/求解）
    const board = ref<Board>([])                                 // ③ 格子盘（真正被编辑的东西）
    const selected = ref<Position | null>(null)                   // ④ 选中的格子
    const snapshots = ref<Snapshot[]>([])                         // ⑤ 历史快照（每步一盘）
    const currentStep = ref<number>(0)                            // ⑥ 当前在第几步
    const solution = ref<NumBoard>([])                            // ⑦ 答案（可能为空）
    const meta = ref<GameMeta>({ ...EMPTY_META })                 // ⑧ 题目来源信息（标题/出题人/pid）
    const origin = ref<GameOrigin>(GAME_ORIGIN.System)            // ⑨ 开局来源（决定要不要"导出题目"）
```

| # | 字段 | 为什么必须"记住"（不能现算） | 谁在读 |
|---|---|---|---|
| ① | `config` | 盘面大小/比例是**开局时输入的**，之后盘面本身推不出来 | 页面（`useBoardZoom(() => gameStore.config.boxSize)`）、核心（`getSudoku`） |
| ② | `mode` | **同一份盘面被三种模式复用**（游玩/出题/求解）→ 必须知道现在是谁在用 | `isWin`、`useGameFlow` 的 `onMounted` 守卫 |
| ③ | `board` | **用户输入的产物**（唯一真源） | 页面渲染、`toNum`、导出、判胜 |
| ④ | `selected` | 用户点选的位置，鼠标不会告诉我们 | `BoardView` 的 `selected`、`inputNum`、`getCandidates` |
| ⑤⑥ | `snapshots`/`currentStep` | 历史记录的**全部内容**（用来"跳回第 3 步"） | `PagerBar mode="steps"`、`jump` |
| ⑦ | `solution` | 开局时由外部给的（**不是算出来的**） | 参考答案遮罩、`cheat` |
| ⑧ | `meta` | 从接口/路由带来的（标题、出题人、pid） | 信息行 `infoText`、导出 |
| ⑨ | `origin` | 开局**怎么来的**是历史事实 | `useGameFlow` 决定给不给"导出题目"按钮 |

**知识点：这张表就是"状态"的定义** —— **"不是算出来的、而是发生过的"** 才需要记住。
对照下面的 `computed`（都是**算出来的**），你就能理解为什么 store 里既有 `ref` 又有 `computed` 但**没有任何冗余字段**。

### 2.2 `EMPTY_META`：为什么放在模块顶层

```ts
/** 系统生成 / 自定义开局没有来源信息 */
const EMPTY_META: GameMeta = { pid: '', title: '', uname: '' }
```

**两个细节**：
1. **放在 store 外面**（模块顶层）：它是**常量**，不是状态 → 放在 `defineStore` 里每次都重建，而且会被误当成响应式数据；
2. **使用处一律 `{ ...EMPTY_META }`（展开拷贝）**：
   ```ts
   const meta = ref<GameMeta>({ ...EMPTY_META })        // 初始化时拷贝
   meta.value = source ? { ...source } : { ...EMPTY_META }   // 重置时再拷贝
   ```
   **为什么必须展开**：如果直接 `meta.value = EMPTY_META`，那么 store 里的 `meta` 就**指向了那个共享常量对象** → 之后任何 `meta.value.title = 'x'` 都会**污染常量**，导致"下一次开局的 meta 莫名其妙带着上一局的标题"。**这是"共享可变对象"的经典陷阱。**

### 2.3 `sudoku`：规则实例（**派生，不存**）

```ts
const sudoku = computed<Sudoku>(() => getSudoku(config.value.boxSize))
```

**三点**：
1. **它是 `computed` 而不是 `const sudoku = getSudoku(...)`**：
   `config.boxSize` 是会变的（换盘面大小、进不同模式）→ 用 `computed` 才能"**跟着变**"；直接赋值只会在首次取值那一刻固定住，而且**不响应式**。
2. **底层靠 `getSudoku` 的缓存**（04 册 §9.10）：`config.boxSize` 没变时，这个 `computed` 重算也只是"从 `Map` 里取同一个实例" → **零成本**。
3. **为什么要把规则实例暴露出去**：让调用方能**依赖注入**地使用 core —— 例如 `usePuzzleStage` 提交校验（04 册 §16.3）：
   ```ts
   puzzleSubmitErrorOf(gameStore.numBoard, gameStore.config.boxSize, gameStore.sudoku)
   ```
   **store 做"持有实例"这件事，页面就不用自己 `getSudoku(...)`**（页面也不许 import core，R6）。

### 2.4 `numBoard`：数字盘（**每次 `toNum`，但只算一次**）

```ts
const numBoard = computed<NumBoard>(() => toNum(board.value))
```

**这是"派生不存"最典型的一处**：**store 里只有 `board` 一个真源**，`numBoard` 永远现算。

**为什么不存一个 `numBoard` ref 与 `board` 同步**：
- 那就有**两份盘**，任何一处改动（`inputNum`/`jump`/`cheat`/`lockPuzzle`/`startGame`）都必须**同时改两处** → 漏一处就出现"渲染对了但判胜错了"这种极难查的 bug；
- 现在**不可能不一致**（因为只有一个来源）。

**开销大吗**：`toNum` 是 `O(S²)`（9 阶 81 次、100 阶 10000 次赋值）。
**关键是 `computed` 自带缓存**：只要 `board.value` 的引用/内容没变，**不会重算**。所以：
- 页面因为 `selected` 变化重渲染 → `numBoard` **不会重算**（依赖没变）；
- 只有真改了盘面的动作才会触发一次 `O(S²)`。

**谁在读它**（`grep` 一下你会看到这些调用点）：

| 读取方 | 用途 |
|---|---|
| `isWin` / `conflictMask`（本文件） | 判胜、算冲突掩码 |
| `getCandidates`（本文件） | 提示候选 |
| `useGameFlow` 的 `hint` | 提示文案 |
| `usePuzzleStage.puzzleSubmitErrorOf` | 提交前校验 |
| `useGameFlow.exportPuzzle` 的 `boardToStr(givenBoard(board))` | **注意它走的是 `board` 而不是 `numBoard`**（要保留 `lock` 信息，04 册 §5.6） |

### 2.5 `isWin`：判胜（**三个守卫缺一不可**）

```ts
const isWin = computed<boolean>(() => {
    if (mode.value !== GAME_MODE.Game) return false          // ① 只在"游玩"模式判胜
    if (!numBoard.value.length) return false                 // ② 没有盘面 → 不可能是赢
    return sudoku.value.isSolved(numBoard.value)             // ③ 填满 + 无冲突
})
```

**逐个守卫的意义**：

| # | 守卫 | 不写会怎样 |
|---|---|---|
| ① | `mode !== Game → false` | **出题/求解模式下**把盘填满 → 会误判"通关"，弹出通关遮罩（但那根本不是"玩游戏"） |
| ② | 空盘 → `false` | 提前返回，**省一次全盘扫描**（`isSolved` 内部先 `isFull`，全空会立刻 false，所以这只是性能优化，不是正确性） |
| ③ | `sudoku.isSolved(numBoard)` | 真正的判定：**填满 + 无冲突**（04 册 §9.8）。注意**不验证唯一性**（那要跑回溯） |

**为什么用 `computed` 而不是"落子后判断并写一个 `isWin` 字段"**：
后者需要在**所有改动盘面的地方**（`inputNum`、`jump`、`cheat`、`lockPuzzle`、`startGame`、`startInput`）都记得更新 —— 漏一处就出现"赢了不弹窗"或"重开后还显示已通关"。
**`computed` 让它自动跟着 `board`/`mode` 变** → **不可能忘**。

**性能取舍**：每次盘面变化都会跑一次 `isSolved`（`O(S²)` 最坏 + `hasConflict`）。
- 9×9：81 格 → 微秒级，随便跑；
- 100×100：10000 格 → 每次落子多几千次访问，**仍在毫秒以内**，可以接受。
> **判断标准**：只要"最坏情况的开销 < 人眼可感知的阈值（~16ms）"，就应该优先选"推导"而不是"手动同步"—— **可维护性的收益远大于这点 CPU**。

### 2.6 `status`：状态（**调用 core，而不是手写分支**）

```ts
/** 状态：两个纯函数入参 → 状态（原先手写的三分支已删） */
const status = computed<GameStatus>(() => statusOf(!!board.value.length, isWin.value))
```

**注释里的"原先手写的三分支已删"就是重点**：
以前这里大概是：

```ts
// ❌ 改造前（示意）：数据层里写业务判断
const status = computed(() => {
    if (isWin.value) return GAME_STATUS.Won
    if (!board.value.length) return GAME_STATUS.Idle
    return GAME_STATUS.Playing
})
```
这种写法的问题不是"能不能跑"，而是：
1. **它是业务规则**（"已胜 > 无盘面 > 进行中"这个优先级）→ 应该和 `statusOf` 的**同一份规则**放在 core，才能被测试、被复用、被文档化；
2. 一旦别处也要"由事实推状态"（例如后端或未来的分享页），就会**再抄一遍**。

**改造后**：store 只做"**把两个事实传进去**"，规则在 core（04 册 §15.1）。

**`!!board.value.length`**：把"长度"变成真正的布尔值（`0 → false`），因为 `statusOf(hasBoard: boolean, …)` 的参数类型是 `boolean`。

**谁读 `status`**：
- `inputNum` 的第一个守卫：`if (status.value !== GAME_STATUS.Playing) return`（**赢了/没开局时不许落子**）；
- `useGameFlow` 的 `winOverlay`：`computed(() => gameStore.status === GAME_STATUS.Won ? GAME_COPY.win : null)`（01 册 §1.4 那一处的上游）。

### 2.7 `conflictMask`：冲突掩码（**带空盘保护**）

```ts
/** 冲突集合：空盘走 emptyMask，避免对空 grid 取下标 */
const conflictMask = computed<ConflictMask>(() =>
    numBoard.value.length ? sudoku.value.findConflicts(numBoard.value) : sudoku.value.makeEmptyMask()
)
```

**为什么必须写这个三元（不能直接调 `findConflicts`）**：
`findConflicts` 内部会走 `allGroups()`（按 `S` 生成行列宫坐标）并对 `grid[r][c]` 取值。
如果此时 `board` 是**空数组**（还没开局 / 刚退出），`grid[0]` 是 `undefined` → `grid[r][c]` 会抛 **`TypeError: Cannot read properties of undefined`**。
> **注意**：`S` 来自 `sudoku`（只要 `config.boxSize` 合法就存在）→ 所以"盘面为空但 S 有效"这个组合**真的会发生**，必须防。

**为什么在调用处判断而不是在 `findConflicts` 内部容错**：
- 调用处判断是 **O(1)**（一次 `.length` 检查），而且**语义清晰**（"没盘就没有冲突"）；
- 如果在 core 里做容错，就要在**热路径**（每次盘面变化都跑）里加判断，且"空盘返回空掩码"这个语义会藏进 core，读代码的人不容易发现。

**谁读它**：`GamePage.vue` 的 `boardParams`（→ `BoardView` 的 `conflictMask` prop）→ `renderBoard` 用它给冲突格填 `BOARD_COLOR.conflictBg`（01 册 §3.2）。

**性能**：每次盘面变化就**全量重算**（`O(S²)` + 27 组扫描），**不做增量**。
**为什么不做增量**：画布本来就要**整盘重绘**（01 册 §3.5 的重绘链）→ 增量算掩码省下的那点时间，在整盘重绘面前毫无意义。**优化要优化在瓶颈上**。

### 2.8 `selectedCell`：选中格（**两层防御**）

```ts
/** 选中的格子 */
const selectedCell = computed<Cell | null>(() => {
    if (!selected.value) return null
    const [r, c] = selected.value
    return board.value[r]?.[c] ?? null
})
```

**为什么要两层防御**：

| 情况 | 不加防御的后果 |
|---|---|
| `selected` 是 `null`（没选中） | `selected.value[0]` → **TypeError** |
| `board.value[r]` 不存在（盘面还没建 / `selected` 是上一局的残留坐标） | `board.value[r][c]` → **TypeError** |

**`?? null` 的作用**：即使 `board[r]` 存在但 `board[r][c]` 是 `undefined`（不规则输入），也统一成 `null` —— 让返回类型**严格是 `Cell | null`**，调用方不用处理 `undefined`。

**一个必须知道的语义**：它返回的是 **`board` 里那个真实的 `Cell` 对象**（引用，不是拷贝）。
- 好处：`hintTextOf(gameStore.selectedCell, …)` 能直接读 `.lock` / `.v`，零拷贝；
- 风险：**如果调用方去改它，就直接改了盘面**（而且绕过了 `inputNum` 的守卫与历史记录！）。
- 本项目的纪律：**外部只读**（写盘面只能走 `inputNum`）。

### 2.9 `resetHistory` / `pushHistory`：历史记录机制（**本 store 最值得学的一段**）

```ts
/** 重置历史：清选中 + 以当前盘面为第 0 步（开局/重建/锁题共用） */
const resetHistory = (): void => {
    selected.value = null
    snapshots.value = [cloneBoard(board.value)]
    currentStep.value = 0
}

/** 推入历史记录 */
const pushHistory = (): void => {
    snapshots.value.splice(currentStep.value + 1)
    snapshots.value.push(cloneBoard(board.value))
    currentStep.value = snapshots.value.length - 1
}
```

**① `resetHistory` 的"三合一"**：
一句话把三件事做完（清选中、建立"第 0 步 = 当前盘"、步数归零），被 **开局（`startGame`）/ 重建（`startInput`）/ 锁题（`lockPuzzle`）** 三处共用 —— 这是"**把一组不变式封成一个动作**"的典型。

**② 为什么处处 `cloneBoard`**：
`board` 是 `Cell[][]`，`snapshots` 存的是"某一刻的完整盘面"。
**如果不拷**（直接 `snapshots.push(board.value)`）→ 快照与当前盘**指向同一批 `Cell` 对象** → 之后用户落子改的其实是**快照里的格子** → 历史记录全部变成"最新状态"，**撤销/回退直接失效**。
（这就是 04 册 §5.1 `cloneBoard` 存在的意义：逐格 `{...cell}`。）

**③ `splice(currentStep.value + 1)` —— "截断未来"（核心知识点）**

场景：用户玩到第 3 步 → 点历史条**跳回第 1 步** → 然后在第 1 步的盘面上**又落了一子**。

```
跳回后：snapshots = [0, 1, 2, 3]，currentStep = 1
落子时：splice(2) → 删掉 [2, 3] 两步（"未来"被丢弃）
        push(新盘) → snapshots = [0, 1, 新盘]
        currentStep = 2
```
**如果不截断**（直接 push）：快照会变成 `[0, 1, 2, 3, 新盘]` → 历史条上出现"第 2、3 步是旧分支、第 4 步是新分支"的**混乱线性序列**，用户往前点会走到"另一条时间线"，语义完全崩坏。

> **这是所有"线性 undo/redo"的统一模型**：
> 新操作会**清空"重做栈（未来）"** —— 文本编辑器的 Ctrl+Z / Ctrl+Y、git 在历史中间提交都会丢后续提交，都是同一个道理。

**④ 为什么 `currentStep = snapshots.value.length - 1`（而不是 `currentStep.value++`）**：
因为 `splice` 可能删掉了几项，用**实际长度**回推永远正确 —— **比"自己维护一个计数"更健壮**（少一个可能出错的状态）。

**谁调用**：
| 动作 | 调用 |
|---|---|
| `startGame` / `startInput` / `lockPuzzle` | `resetHistory()`（开一条新历史） |
| `inputNum` / `cheat` | `pushHistory()`（新增一步） |
| `jump` | 只改 `currentStep`（**不动 snapshots**） |

### 2.10 `getCandidates`：把"两个持有物"喂给 core

```ts
/** 某格的候选数 */
const getCandidates = (pos: Position): number[] =>
    sudoku.value.getCandidates(numBoard.value, pos)
```

**它只是一层薄封装**（一行），但很有必要：
- **调用方（页面/组件）不许 import `core`**（R5/R6）→ 它们需要一个"入口"；
- store 正好**同时持有 `sudoku` 与 `numBoard`** → 让它转发是最自然的；
- 调用点：`useGameFlow.ts:63` 的 `gameStore.getCandidates(gameStore.selected)` → 喂给 `hintTextOf`（04 册 §15.2）。

**注意它在返回对象里被单独放在"提示"分组**（见 §2.18）—— **分组本身就是文档**。

### 2.11 `startGame`：唯一的"正式开局"入口

```ts
/** 开始游戏：from = 开局来源；source 给了才有「标题 · 出题人」信息行 */
const startGame = (puzzle: NumBoard, sol: NumBoard, cfg: GameConfig, from: GameOrigin, source?: GameMeta) => {
    mode.value = GAME_MODE.Game
    origin.value = from
    config.value = { ...cfg }
    board.value = fromPuzzle(puzzle, true)          // ★ 题面格锁死
    solution.value = sol
    meta.value = source ? { ...source } : { ...EMPTY_META }
    resetHistory()
}
```

**逐行**：

| 行 | 说明 |
|---|---|
| `mode.value = GAME_MODE.Game` | 进"游玩"模式（`isWin` 只在这个模式下才判胜，§2.5） |
| `origin.value = from` | 记录来源：`System`（系统生成）/ `Custom`（自定义）/ `Challenge`（挑战）→ 决定要不要显示"导出题目"（`useGameFlow` 的 `trailActions`，01 册 §3.8 那段 `...(gameStore.origin === GAME_ORIGIN.System ? [导出] : [])`） |
| `config.value = { ...cfg }` | **拷贝**：不把外部对象直接塞进 store（否则外部改一下那个对象，store 里的配置也跟着变） |
| **`board.value = fromPuzzle(puzzle, true)`** | **`lockGiven = true`** → 题面的非空格**全部锁死**（04 册 §4.2）：玩家改不了题目给定的数字 |
| `solution.value = sol` | 答案直接存（**可能为空数组**，见 `startFromTexts`） |
| `meta.value = source ? { ...source } : { ...EMPTY_META }` | 有来源就拷来源，没有就给一个干净的副本（§2.2 的两个陷阱都在这行体现） |
| `resetHistory()` | **最后**建立历史：第 0 步 = 刚开局的盘面 |

**为什么要"唯一的开局入口"**：三种开局来源（系统生成 / 自定义 / 挑战）都走它 → **开局要做的 7 件事只有一份实现**，加一步（例如"清零计时"）只改这里。

### 2.12 `startFromTexts`：从字符串开局（**我的题目「挑战」与落地页共用**）

```ts
/**
 * 从题面 / 答案串直接开局（我的题目「挑战」与落地页「挑战」共用）
 * · 解析与比例都在 core；答案串缺失也允许开局（胜负判定走规则，不依赖答案）
 * · 题面串解析失败返回 false，调用方不跳页
 */
const startFromTexts = (
    puzzleText: string,
    solutionText: string,
    blankCount: number,
    source?: GameMeta,
): boolean => {
    const parsed = parsePuzzle(puzzleText)
    if (!parsed) return false                                   // ① 解析失败 → 不跳页
    startGame(parsed.board, parsePuzzle(solutionText)?.board ?? [], {   // ② 答案可缺
        boxSize: parsed.boxSize,
        blankRatio: blankCount / cellCountOf(parsed.boxSize),   // ③ 比例现算
    }, GAME_ORIGIN.Challenge, source)                           // ④ 来源固定为 Challenge
    return true
}
```

**四点**：

1. **`if (!parsed) return false`**：**"能不能开局"由 store 判断，但"要不要跳页"由调用方决定**。
   调用方的写法（示意）：`if (gameStore.startFromTexts(...)) router.push({ name: PAGE.Game })` —— 失败就留在原地（用户可以改一下再试）。
2. **答案可缺**（`parsePuzzle(solutionText)?.board ?? []`）：注释解释了原因 —— **"胜负判定走规则，不依赖答案"**（`isSolved` 只看盘面，不看答案）。
   所以"答案没下发"（例如 `show_solution = 0` 的公开题，02 册 §5.6）**不影响游玩**，只是没有 `solution` → 没有"参考答案"按钮。
3. **`blankRatio` 现算**：接口只给 `blankCount` 与 `boxSize`，比例由 core 的 `cellCountOf` 算出（**store 里不许写算式**，R4）。
4. **`GAME_ORIGIN.Challenge` 写死**：挑战题的题面已经"在别人手上"了 → 不需要"导出题目"按钮（没有意义）。

**这里的 `parsed.board` 是 `NumBoard`，而且 `startGame` 里会 `fromPuzzle(..., true)`** → 挑战题的题面格同样锁死 ✅

### 2.13 `startInput` / `startCreate` / `startSolve`：手填盘的三种模式

```ts
/**
 * 进入「手填盘面」的模式（出题/编辑 与 题目求解）：只有 mode 不同，其余完全一致
 * puzzle 给了就预填（不锁定 → 可增量改）；没给就按 boxSize 起一张空盘
 */
const startInput = (nextMode: GameMode, boxSize: number, puzzle?: NumBoard): void => {
    mode.value = nextMode
    config.value = {
        boxSize,
        blankRatio: puzzle ? countBlanks(puzzle) / cellCountOf(boxSize) : 0,
    }
    board.value = puzzle ? fromPuzzle(puzzle, false) : getSudoku(boxSize).makeEmptyBoard()   // ★ 不锁
    solution.value = []
    meta.value = { ...EMPTY_META }
    resetHistory()
}

/** 进入出题 / 编辑：手填题面 */
const startCreate = (boxSize: number, puzzle?: NumBoard): void => startInput(GAME_MODE.Create, boxSize, puzzle)

/** 进入题目求解：手填 / 回填题面（求解结果不进 store，见 composables/solve/useSolveFlow） */
const startSolve = (boxSize: number, puzzle?: NumBoard): void => startInput(GAME_MODE.Solve, boxSize, puzzle)
```

**① 与 `startGame` 最关键的一处对照**：

| | 游玩（`startGame`） | 手填（`startInput`） |
|---|---|---|
| `fromPuzzle` 第二参 | **`true`（锁死）** | **`false`（不锁）** |
| 为什么 | 玩的时候题目给定格不能改 | **出题/编辑时用户要"增量改"题面**（锁了就没法改） |
| `solution` | 有（可能为空） | **清空**（还没有答案） |

> **同一份"从数字盘造格子盘"的函数，靠一个布尔参数服务两种完全相反的语义** —— 这就是把差异参数化，而不是写两个函数。

**② `puzzle ? … : 0` / `puzzle ? … : makeEmptyBoard()`**：两个"给了/没给"的分支
- 给了 `puzzle`（编辑页回填 / 求解页预填）：从它构造 + 算比例；
- 没给（新出题）：**空盘**，比例 0。

**③ 为什么空盘要走 `getSudoku(boxSize).makeEmptyBoard()`**（04 册 §9.5）：
它保证**尺寸与 `boxSize` 严格一致**（而且用的就是"同一个规则实例"）—— 比在 store 里手写 `makeGrid(...)` 更安全（store 也不该出现这种算式）。

**④ `startCreate` / `startSolve` 两个"一行薄封装"的价值**：
调用方（`useCreateFlow` / `useSolveFlow` / `useEditFlow`）写的是：

```ts
gameStore.startCreate(boxSize)          // 语义化：一眼看出"我要去出题"
// 而不是
gameStore.startInput(GAME_MODE.Create, boxSize)   // 需要知道 GAME_MODE 的取值
```
> **封装"意图"而不是"机制"**：调用点读起来是业务语言，**参数也不可能传错**（枚举值写死在薄封装里）。

**⑤ 注释里那句"求解结果不进 store"**：
`startSolve` 只负责"**手填题面**"这件事；**多解枚举的结果**（`NumBoard[]`）是"一次性的工作产物"，放在 `useSolveFlow` 的 `ref` 里就够了（进 store 反而会污染全局）。**这是 §1.2 判据的又一次应用。**

### 2.14 `lockPuzzle`：提交题面（**阶段切换**）

```ts
/** 提交题面：锁定规则在 core，这里只写回 */
const lockPuzzle = (): void => {
    board.value = lockGiven(board.value)
    resetHistory()
}
```

**① 注释点出分工**："锁定规则在 core（`lockGiven`，04 册 §5.3），这里只写回" —— **store 不写算法**（R4）。

**② 为什么锁完要 `resetHistory()`**：两个原因
- **盘面语义变了**：`lock` 从 `false` 变成 `true`（这些数字从"玩家填的"变成"题目给定的"）→ 旧快照严格说已经不是"同一个盘"了；
- **阶段切换不该跨阶段回退**：出题流程是"阶段①填题面 → 提交 → 阶段②填答案"；如果历史还留着阶段①的快照，用户点历史条就能"回到还没锁定的状态"，**流程状态机就崩了**。

**③ 谁调用它**：`usePuzzleStage`（出题/编辑共用的"题面 → 答案"两阶段，06 册会讲）在"提交题面"那一刻调用。

### 2.15 `select`：选中格子（最"薄"的动作）

```ts
/** 选择格子 */
const select = (pos: Position): void => {
    selected.value = pos
}
```

**为什么它值得是一个 store 动作**（而不是页面自己一个 ref）：
- `selected` 被**多处**使用：`BoardView` 画选中框、`inputNum` 落子、`getCandidates` 提示、`selectedCell` 派生；
- 它必须和 `board` **同生共死**（开局/锁题时一起重置 → `resetHistory` 里就有 `selected.value = null`）。

**注意它没有任何守卫**：点"题目给定格"也能选中（会显示选中框，但 `inputNum` 会拒绝写入）—— 这是**有意的**：玩家需要能选中任意格来查看它（未来"显示候选"也依赖选中）。

**它接的事件链**（01 册 §3.5 的重绘链起点）：`BoardView` 的 `@cell-click` → `GamePage` 的 `@cell-click="gameStore.select"` → 这里。

### 2.16 `inputNum`：落子（**四个守卫 + 就地改对象**，本 store 最核心的动作）

```ts
/** 向格子输入数字 */
const inputNum = (n: number): void => {
    if (status.value !== GAME_STATUS.Playing) return      // ① 只在"进行中"接受输入
    if (!selected.value) return                           // ② 必须选中了格子

    const [r, c] = selected.value
    const cell = board.value[r][c]

    if (cell.lock) return                                 // ③ 题目给定格不能改
    if (cell.v === n) return                              // ④ 同值不重复写
    cell.v = n                                            // ⑤ 就地把值写进 Cell 对象
    pushHistory()                                         // ⑥ 记一步历史
}
```

**① 四个守卫的顺序（从粗到细，很有讲究）**：

| # | 守卫 | 拦住的输入 | 为什么不放在后面 |
|---|---|---|---|
| ① | 状态必须 `Playing` | 赢了/还没开局时点数字键 | 最粗的判据，最先拦（也省掉后面的取坐标） |
| ② | 必须选中 | 没选格就点数字 | 取 `[r, c]` 之前必须保证非空 |
| ③ | 不能是 `lock` 格 | 想改题目给定数字 | "同值"检查之前（锁定的格子无论同不同值都不该写） |
| ④ | 同值不重复写 | 反复点同一个数字 | **它在 ③ 之后**（锁定格的同值也不该走后面逻辑） |

**④ 为什么"同值就 return"很重要**：
不加它，用户点两次"5"就会产生**两条完全一样的快照** → 历史条上"第 3 步、第 4 步"看起来一模一样（用户以为卡了）；而且每次落子都 clone 一次整盘，**白白浪费**。

**⑤ `cell.v = n` —— 直接改对象属性（重点知识点）**

这是本册**最需要注意的一行**：它**没有**走 `board.value = ...map(...)` 这种"替换数组"的写法，而是**就地改了一个嵌套对象的属性**。

**它在 Vue 3 里是安全的**，因为：
- `ref(board)` 的 `.value` 是**对象**（数组）→ Vue 会用 **`reactive()` 深度代理**它；
- 代理是**深层**的：`board.value[r]`（行数组）是代理，`board.value[r][c]`（`Cell` 对象）**也是代理**；
- 所以 `cell.v = n` 会被 Proxy 的 `set` 陷阱捕捉到 → **触发依赖更新**。

**如果是 `shallowRef(board)`（浅层）就不行** —— 改深层属性不会通知任何依赖，页面**不会重绘**（而且这种 bug 非常难查：数据变了、界面不变）。

**这条改动的连锁反应**（把 01 册 §3.5 的重绘链补上 core 侧）：

```
cell.v = n（深层响应式变更）
  → board 变化 → numBoard computed 失效（§2.4）
  → conflictMask 重算（§2.7）· isWin 重算（§2.5）· status 重算（§2.6）
  → GamePage 的 boardParams computed 重算
  → BoardView 的 props 变 → watchEffect(draw) 命中 → renderBoard 重绘画布
```

**⑥ 一个容易看漏的设计：`inputNum(0)` 就是"清除"**

`NumberPad` 除了 `1..S` 的数字键，**还有一颗"清除当前格"按钮**（`NumberPad.vue:27`）：
```html
<button class="num-btn clear-btn" @click="emit('pick', 0)" title="清除当前格数字">X</button>
```
所以 `inputNum(0)` 是**合法输入** —— 它把 `cell.v` 设成 `0`（= 空格）。

**这解释了两处代码**：
1. **`inputNum` 为什么没有"`n` 必须是 1..S"的守卫**：`0` 也在允许范围内（清除）；
2. **`if (cell.v === n) return` 顺便挡住了"清除一个已经空的格子"**（`cell.v` 是 `0`、`n` 也是 `0` → 直接返回）→ **不会往历史里塞一张"什么都没变"的快照**。
> **一条守卫同时服务两种语义**（防重复填同一个数字 / 防空清除）—— 这是"判断写得足够通用"带来的额外收益。

### 2.17 `jump`：跳到历史某一步（**必须再拷一次**）

```ts
/** 跳到指定历史步 */
const jump = (step: number): void => {
    if (step < 0 || step >= snapshots.value.length) return     // ① 越界守卫
    board.value = cloneBoard(snapshots.value[step])            // ② 从快照拷一份
    currentStep.value = step
}
```

**① 越界守卫**：调用方是历史条的 `@change`（值应该在 `0..length-1`），但守卫能挡住"任何来源的非法值"。
**策略选择**：**静默忽略**（不抛错、不提示）—— UI 动作的非法输入，最合适的就是"什么都不发生"。

**② `cloneBoard` 是必须的（与 §2.9 ② 是一对）**：

```ts
// ❌ 如果直接赋值：
board.value = snapshots.value[step]
// → board 与那个快照指向同一批 Cell 对象
// → 用户落子改 cell.v 会把"快照本身"改掉
// → 历史记录被污染（下次跳回来看到的是改动后的盘）
```

**记住这条完整规则**：**存快照时要拷（push 方向）、取快照时也要拷（jump 方向）** —— 因为"活动盘"会被就地修改（§2.16 ⑤），任何与它共享引用的地方都会被污染。

### 2.18 `cheat`：填入答案（**只存在于开发环境**）

```ts
/** 作弊：直接填入答案（测试用）—— 填法在 core */
const cheat = (): void => {
    if (!solution.value.length) return                        // ① 没答案就别作弊
    board.value = applySolution(board.value, solution.value)  // ② 填法在 core
    pushHistory()                                             // ③ 也是一步，可回退
}
```

**三点**：
1. **守卫"没有答案就返回"**：`solution` 可能为空（挑战题没下发答案、手填模式清空了答案）→ 此时"作弊"没有意义；
2. **`applySolution` 返回"新盘"**（04 册 §5.4）：所以这里用**替换引用**（`board.value = …`）而不是就地改 —— 与 `inputNum` 的写法不同，但**两种都对**（因为 `applySolution` 内部已经逐格开了新对象）；
3. **它也 `pushHistory()`**：作弊是"一步操作"，玩家可以**撤销回去**（对测试很友好）。

**它怎么做到"生产环境没有"**：按钮在 `useGameFlow` 里是条件性加的（01 册 §3.8）：
```ts
...(import.meta.env.DEV ? [{ key: 'cheat', text: '⚡ 作弊', onClick: gameStore.cheat }] : [])
```
→ 打包时 `DEV` 变 `false`，**整段死代码被压缩器删除**（生产产物里既没有按钮、也没有调用点）。**但 store 里这个动作本身还在**（无害：没有任何入口能触发它）。

### 2.19 `return` 对象：**store 的公开 API（分组即文档）**

```ts
return {
    // 配置
    config, mode,

    // 状态
    sudoku, board, numBoard, selected, status, solution, currentStep, meta, origin,

    // 派生
    isWin, snapshots,
    conflictMask, selectedCell,

    // Actions
    startGame, startCreate, startSolve, startFromTexts, lockPuzzle,
    select, inputNum,
    jump, cheat,

    // 提示
    getCandidates,
}
```

**三点要看出**：

1. **只有 return 出去的才对外可用**（Pinia setup store 的规则）→ **return 清单 = 这个 store 的"公开承诺"**。
   不暴露的（例如 `resetHistory`、`pushHistory`）就是**私有实现**：外部不能"随便重置历史"，只能通过 `startGame` / `jump` 这些**有语义的入口**。**这是很好的封装：把"不变式"锁在内部。**
2. **五个注释分组按"用途"划分**（配置 / 状态 / 派生 / Actions / 提示）→ **你打开这个文件 3 秒就能知道它有哪些能力**。
   （一个小细节：`snapshots` 实际是 `ref`，但被放在"派生"这一组 —— 分组的依据是"**用途**（给页面读的只读数据）"而不是"类型"，这个取舍读代码时要有意识。）
3. **`state` 与 `derived` 混在同一个 return 里**：Pinia 的 setup store 不区分"state/getters"（那是选项式 API 的概念）—— 这里**全都是一等公民**，Vue 的响应式机制自然处理"谁依赖谁"。

---

## 3. `stores/puzzle.ts`（104 行）—— 题目列表与详情（取数型 store）

**① 与 `gameStore` 的本质区别**：

| | `gameStore` | `puzzleStore` |
|---|---|---|
| 数据来源 | **本地产生**（用户落子、开局参数） | **从服务端取来**（`services/api/puzzleApi`） |
| 关注点 | 一局游戏的**状态机** | **列表 / 缓存 / 加载状态** |
| 网络 | **完全不碰** | **核心职责** |
| 页面切走再回来 | 状态还在（全局） | 数据还在（全局缓存），但**页码/排序在 URL** |

### 3.1 状态清单

```ts
/** 搜索结果（公开题） */
const items = ref<SearchResult[]>([])
/** 我的题目列表（只含元信息，不含 pid / 题面串） */
const mine = ref<MyPuzzle[]>([])
/** mine/:rowId 详情缓存：显示/复制 pid、预览、答案预览、编辑、挑战统一走它 */
const details = ref<Record<string, MyPuzzleDetail>>({})
/** 命中总数（算页数 / 收敛越界页码） */
const total = ref(0)
/** uid 档搜索回传的出题人显示名（表头用） */
const authorUname = ref('')
const loading = ref(false)
const error = ref('')

/** 跨页一次性轻提示（如「已保存到我的题目」）：写入方给文案，读取方取走即清 */
const savedTip = ref('')
```

| 字段 | 类型 | 为什么在这里 | 谁在读 |
|---|---|---|---|
| `items` | `SearchResult[]` | 搜索结果（公开题列表） | 搜索页列表 |
| `mine` | `MyPuzzle[]` | 我的题目（**只含元信息**，02 册 §5.5 的 `rowId` 列表） | 我的题目页 |
| `details` | `Record<rowId, MyPuzzleDetail>` | **详情缓存**：预览 / 编辑 / 挑战 / 复制 pid 都读同一份 | `usePuzzleDetail`、`usePuzzlePreview`、`useEditFlow` |
| `total` | `number` | 后端给的命中总数 → 算页数、收敛页码 | `pageCount`（§3.2）、`useListQuery` |
| `authorUname` | `string` | "出题人：X 的公开题"表头（按 uid 搜时才有） | 搜索页 |
| `loading` / `error` | `boolean` / `string` | 列表与详情的**UI 状态**（转圈 / 错误文案） | 页面、`empty`（§3.2） |
| `savedTip` | `string` | **跨页一次性提示**（见 §3.7） | `useGameFlow` 的 `onMounted` |

**⭐ 一个重要发现：这个 store 里没有"页码"、没有"排序"、没有"关键词"。**

```ts
// 你去这个文件里搜 page / sort / keyword，只会看到"参数从外面传进来"：
const search = (q: { keyword?: string; uid?: string; sort: ListSort; page: number }) => ...
const loadMine = (q: { sort: ListSort; page: number }) => ...
```
**因为它们是 URL 状态**（R15：影响数据请求的放 query，03 册 §4 R15）→ 由 `useListQuery` 从 `route.query` 读，再作为**参数**传进来。
**好处**：搜索条件**可分享、可刷新、可后退**；store 只负责"把这一页的数据装进来"。

### 3.2 两个派生：`pageCount` 与 `empty`

```ts
const pageCount = computed<number>(() => pageCountOf(total.value, LIST_PAGE_SIZE))
/** 搜索空结果：不在加载中、无错误、且没有数据 */
const empty = computed<boolean>(() => !loading.value && !error.value && !items.value.length)
```

**① `pageCount`**：**页数不存**（存了就要在每次 `total` 变化时同步）→ 现算（core 的 `pageCountOf`，04 册 §17.1）。
它被 `useListQuery` 用来"收敛越界页码"（`clampPage(page, opts.pageCount())`）。

**② `empty` 为什么必须三个条件**：

| 少了哪个 | 会出现什么 |
|---|---|
| 少了 `!loading` | **刚打开页面（还在转圈）就显示"没有找到题目"** → 闪现假空态 |
| 少了 `!error` | **出错了同时显示"没有找到题目" + 错误信息** → 用户困惑（到底是没有还是坏了？） |
| 少了 `!items.length` | 永远不显示空态 |

> **"空态"从来不是一个布尔字段，而是"多个事实的组合"** —— 这就是把它写成 `computed` 的价值：三个条件在**一处**维护，不可能只改一半。

### 3.3 `loadPage`：列表取数的**统一收口**（本节最值得学的一段）

```ts
/**
 * 列表取数统一收口：转圈 → 成功由 run 写回 → 失败由 empty 清空 + 统一文案
 * （搜索与我的题目只有「打哪个接口 / 写哪些 ref」不同）
 */
const loadPage = async (run: () => Promise<void>, empty: () => void): Promise<void> => {
    loading.value = true
    error.value = ''
    try {
        await run()
    } catch (err) {
        empty()
        error.value = errorTextOf(err, '加载失败，请重试')
    } finally {
        loading.value = false
    }
}
```

**它做了什么（时序）**：

```
① loading = true, error = ''          ← 开始：转圈 + 清掉上次的错误
② try: await run()                    ← 成功路径：由调用方写回自己的数据
③ catch: empty() 清数据 + 写错误文案   ← 失败路径：不留半截数据 + 统一文案
④ finally: loading = false            ← 无论如何都归位
```

**为什么这样设计**：

1. **"收口"**：搜索与我的题目**只有两处不同**（打哪个接口、写哪些 `ref`）→ 把相同部分（loading / error / try-finally / 文案）抽出来，调用方只传**两个回调**：
   - `run`：成功时干什么；
   - `empty`：失败时怎么清。
   > **这就是"高阶函数"的实用形态**（04 册 §4.10 的 `onSolution` 回调是同一个套路）：**把流程固定、把差异当参数传。**
2. **`errorTextOf(err, '加载失败，请重试')`**：错误文案统一（04 册 §16.1）→ **后端返回的中文原因会原样显示**。
3. **`catch` 里先 `empty()` 再写 error**：失败时**必须清掉旧数据**，否则会出现"列表里是上一次的搜索结果，旁边显示一条错误" —— 用户看不出来哪些是过期的。
4. **`finally` 只做 `loading = false`**：因为 `error` 的赋值在 `catch` 里，**它已经处理了"成功时 error 保持空"**（第 ① 步清过）。
   > 如果反过来把 `error = ''` 放在 `finally`，就会把刚写好的错误文案擦掉 —— **这是很常见的低级错误**。

**它是"私有"的**（不在 `return` 里）→ 外部只能通过 `search` / `loadMine` 这两个语义化入口触发加载。

### 3.4 `search`：搜公开题（**keyword / uid 互斥**）

```ts
/** 搜公开题：keyword 模糊（标题 / 出题人）、uid 精确（某人的公开题），二者互斥 */
const search = (q: { keyword?: string; uid?: string; sort: ListSort; page: number }): Promise<void> =>
    loadPage(async () => {
        const res = await apiSearch({
            keyword: q.keyword, uid: q.uid, sort: q.sort, page: q.page, size: LIST_PAGE_SIZE,
        })
        items.value = res.items
        total.value = res.total
        authorUname.value = q.uid ? res.items[0]?.uname ?? '' : ''
    }, () => {
        items.value = []
        total.value = 0
        authorUname.value = ''
    })
```

**① "keyword / uid 互斥"的意思**：两种搜索入口
- **keyword 模糊**：搜标题 / 出题人（用户在搜索框里打字）；
- **uid 精确**：点某个作者名 → 看他/她的全部公开题。

后端用一段 SQL 同时支持（02 册 §5.5 的 `? = '' OR ...` 技巧），前端**两个字段都传**、**只填一个**。

**② `authorUname` 的取法很值得看**：

```ts
authorUname.value = q.uid ? res.items[0]?.uname ?? '' : ''
```
- **只有按 uid 搜时才需要**（表头显示"出题人：X 的公开题"）；
- **从第一条结果里拿作者名** —— 因为没有单独的"按 uid 查用户信息"接口（`/api/me` 只能查自己）；
- **空结果要兜底**：`res.items[0]` 可能是 `undefined`（这个人一道题都没有）→ `?.uname ?? ''` → 表头显示空（页面据此决定要不要显示表头）。

**③ 成功回调写三个 ref、失败回调清三个 ref** —— **对称**。
> **"写回什么，就要能清掉什么"**：这是列表类取数的通用纪律（否则失败后会留下半截数据）。

### 3.5 `loadMine`：我的题目（**只回元信息**）

```ts
/** 我的题目列表（需登录；只回元信息） */
const loadMine = (q: { sort: ListSort; page: number }): Promise<void> =>
    loadPage(async () => {
        const res = await listMine({ sort: q.sort, page: q.page, size: LIST_PAGE_SIZE })
        mine.value = res.items
        total.value = res.total
    }, () => {
        mine.value = []
        total.value = 0
    })
```

**和 `search` 的差异只有三处**：打不同接口、写 `mine` 而不是 `items`、不清 `authorUname`（它不属于"我的题目"）。
**"只回元信息"的意义**（02 册 §5.5）：列表里**没有 `pid`、没有题面串** → 要预览/编辑/挑战时**才去取详情**（`detailOf`，§3.6）。
> **这是"列表轻、详情重"的经典设计**：列表页只传"够显示一行"的字段（标题、规格、挖空、热度、可见性），**大字段（题面串最长可达几万字符）只在需要时取**。

### 3.6 `detailOf` / `dropDetail`：详情缓存与失效

```ts
/** 取 mine/:rowId 详情：命中缓存直接返回，否则请求后写入缓存 */
const detailOf = async (rowId: string): Promise<MyPuzzleDetail | null> => {
    const cached = details.value[rowId]
    if (cached) return cached                    // ① 命中缓存 → 零请求
    error.value = ''
    try {
        const detail = await getMine(rowId)
        details.value[rowId] = detail            // ② 写缓存
        return detail
    } catch (err) {
        error.value = errorTextOf(err, '题目加载失败')
        return null                              // ③ 失败返回 null（不抛）
    }
}

/** 改动后清该行缓存（列表由页面重拉） */
const dropDetail = (rowId: string): void => { delete details.value[rowId] }
```

**① "读缓存"是最实用的一招**：
`details` 是个 `Record<rowId, MyPuzzleDetail>` —— **同一道题在"列表 → 预览 → 编辑 → 挑战"之间来回时，只请求一次**。
（`rowId` 是每行稳定的标识，所以能当缓存键。）

**② 缓存失效策略（**只坏掉那一条**）**：
编辑保存后，这道题的详情变了 → 调 `dropDetail(rowId)` **删掉这一条**，下次 `detailOf` 会重新取。
**为什么不整体清空 `details`**：其他题目的缓存**依然有效**，清掉只会带来多余请求。
> **缓存的正确性问题**：`delete details.value[rowId]` 在 Vue 的响应式对象上是**可被追踪**的（Vue 3 用 Proxy，`deleteProperty` 也会触发更新）—— 所以删完后再读 `details.value[rowId]` 是 `undefined`，`detailOf` 会走请求分支 ✅

**③ 失败返回 `null` 而不是抛错**：
调用方的写法就变得极简（不用 `try/catch`）：
```ts
const detail = await puzzleStore.detailOf(rowId)
if (!detail) return          // 失败已由 store 记进 error
```
**这与 core 的策略一致**（04 册 §3.13）：**"预期内的失败"用返回值表达**；错误文案由 store 统一写入 `error`。
**顺序上也和 `loadPage` 一致**：`error.value = ''` 放在 `try` **之前**（开始取数就先清掉上一次的错误）。

### 3.7 `flashSaved` / `takeSavedTip`：跨页"一次性提示"

```ts
const flashSaved = (text: string): void => { savedTip.value = text }
/** 取走提示（取完即清，保证只提示一次） */
const takeSavedTip = (): string => {
    const text = savedTip.value
    savedTip.value = ''
    return text
}
```

**真实场景**（串起三处代码）：
1. 自定义模式里点"提交到我的题目" → `useCustomFlow` 保存成功 → `flashSaved('已保存到我的题目')`；
2. 然后 `router.push({ name: PAGE.Game })`（跳去游玩）；
3. 游戏页的 `useGameFlow` 在 `onMounted` 里（01 册 §1.6）：
   ```ts
   const saved = puzzleStore.takeSavedTip()
   if (saved) tip.value = saved
   ```
   → 页面上出现那条轻提示。

**为什么用 store 而不是 URL query**：
- 提示是"**一次性的、跨页面的**"——写进 URL 会**污染可分享的地址**（别人打开这个链接也会看到"已保存"？那就错了）；
- 放进 store：**页面切换时还在**（store 是全局的），**取走即清**（刷新/再进不会重复提示）。

**"取走即清"这个语义很重要**：
它是"**一次性事件队列**"的最简实现（队列长度为 1）。如果只读不清，那么"下次再进游戏页"还会看到同一句提示 —— **用户会以为又保存了一次**。
> 类似的模式在本项目还有 `gameStore.resetHistory`（语义化清空）、`dropDetail`（语义化失效）—— **都是"把状态的变更封装成有意图的动作"**。

### 3.8 值得记的"这个 store 不做什么"

| 不做 | 为什么 | 谁在做 |
|---|---|---|
| 不存 `page` / `sort` / `keyword` | 它们是**地址的一部分**（可分享/刷新/后退） | `useListQuery` + `route.query`（R15） |
| 不做"提交/删除/改可见性" | 那些是**动作**（改完还要失效缓存、跳页） | `useComposables`（`useMyPuzzles` / `useCustomFlow` / `useEditFlow`） |
| 不写任何算式（页数、比例…） | R4：数据层不写算法 | `core`（`pageCountOf` 等） |
| 不管 `previewOpen` 这种 UI 开关 | 只有某一个页面用 | 对应的 composable |

---

## 4. `stores/user.ts`（39 行）—— 登录态（**最短，但三处技巧**）

> **01 册 §2.3 已经逐行精读过它**（六点：唯一真源 / 派生不存 / 观察者接线 / 请求直写真源 / `try-finally` / `pending ??=` 并发去重）。
> 这一节只补**它在三个 store 里的位置**与**一条架构上的关键点**。

### 4.1 三个 store 横向对比

| | `gameStore`（169 行） | `puzzleStore`（104 行） | `userStore`（39 行） |
|---|---|---|---|
| 状态数量 | 9 个 ref | 8 个 ref | **1 个 ref**（`profile`） |
| 派生 | 7 个 computed | 2 个 computed | **3 个 computed**（`isGuest` / `uname` / `uid`） |
| 动作 | 9 个（本地纯变更） | 4 个（3 个取数 + 1 个失效） | **4 个**（全部是网络） |
| 碰网络 | ❌ | ✅ | ✅ |
| 为什么不更长 | 已经全是"最小必要状态" | 缓存与 UI 状态都已收口 | **派生做得彻底 → 状态只剩 1 个** |

**看出规律了吗**：**`userStore` 最短，是因为它把"派生"用到了极致** —— `isGuest` / `uname` / `uid` 全是 `computed`，所以**只需要存一个 `profile`**。
> **"状态数量"是可以被设计压到最小的**：每当你发现"两个字段总是一起变"，就问一句"其中一个能不能算出来？"

### 4.2 一条架构关键点：**观察者接线放在 store 加载时**

```ts
/** 401（token 过期）时 client 已清 token → 这里同步把登录态置空 */
onUnauthorized(() => { profile.value = null })
```

这行代码出现在 **store 定义体里**（不是某个动作里）→ 只要**这个 store 被用过一次**（`useUserStore()` 被调用过），回调就注册好了。

**为什么必须这样解耦**（03 册 §3.2 ④）：
- `services/api/client.ts` **不能 import store**（R2：services 不许碰 stores）→ 它无法直接 `userStore.profile = null`；
- 于是反过来：**store 订阅 client 的"401 事件"** → 依赖方向依然是"上层 → 下层"，**没有环**。

```
HTTP 层（下层）遇到 401 ──emit──► onUnauthorized 回调集合
                                        │
store（上层）在加载时 ──subscribe───────┘  → profile = null
```

**这个"回调注册 + 事件通知"的写法值得记住**：它是**打破循环依赖的标准手法**（03 册原话：*"当下层需要通知上层时，用事件/回调注册，不要让下层 import 上层"*）。

### 4.3 与其它 store 的一个细节差异

`userStore` 的动作**全部是 `async` 且直接 await 网络**（`register` / `login` / `logout` / `restore`），而 `gameStore` 的动作**全是同步的**（纯本地变更）。
**为什么 `puzzleStore` 需要 `loading`/`error` 而 `userStore` 不需要**：
- `puzzleStore` 的加载是**页面级**的（列表要显示转圈、显示空态）；
- `userStore` 的加载是**登录页内联**的 —— 转圈与错误文案由 `useAuth` 这个 composable 自己持有（`error.value = errorTextOf(err, '请求失败，请重试')`，04 册 §16.1 的第 1 行调用点）。
> **"UI 状态放哪"要看它的作用域**：整页级 → store；某一个页面内联 → composable。

---

## 5. 三个 store 的共性模式（能直接迁移到别的项目）

### 5.1 五条模式（每条都给"反例"）

**模式 1：只存"发生过的事实"，一切能算的都现算**

| 正面 | 反面（会出现什么 bug） |
|---|---|
| `numBoard = computed(() => toNum(board))` | 存两个盘并手动同步 → 某个分支忘了同步 → "渲染对了但判胜错了" |
| `status = computed(() => statusOf(...))` | 存 `status` 字段 → 漏改一处 → "赢了不弹窗" |
| `pageCount = computed(() => pageCountOf(total, size))` | 存 `pageCount` → `total` 变了没更新 → 分页条页数不对 |

**模式 2：动作 = 取值 → 调 core/services → 写回（动作里没有算式）**

```ts
// gameStore：纯 core 调用
board.value = fromPuzzle(puzzle, true)
board.value = lockGiven(board.value)
solution.value = sol
// puzzleStore：纯 services 调用 + 写回
const res = await apiSearch({ ... })
items.value = res.items
```
**反面**：在 store 里写 `Math.ceil(total / size)`、`countBlanks(x) / S ** 2` → 被 R4 拦（`pnpm guard` 会报"数据层出现算法，请下沉 core"）。

**模式 3：失败用"返回值 / null"表达，文案统一交给 `errorTextOf`**

| 入口 | 失败怎么表达 |
|---|---|
| `startFromTexts` | 返回 `false`（**调用方据此决定要不要跳页**） |
| `detailOf` | 返回 `null`（**调用方 `if (!detail) return`**） |
| `search` / `loadMine` | 无返回值，但把文案写进 `error`（**页面读 `error` 显示**） |

**反面**：让每个调用方各自 `try/catch` 并各自写文案 → 同一个错误在不同页面显示不同的话（而且有的地方会漏写兜底）。

**模式 4：`return` 分组 = 公开 API；私有动作不外露**

- 公开：`startGame` / `inputNum` / `detailOf` …（**有业务语义**）
- 私有：`resetHistory` / `pushHistory` / `loadPage`（**内部不变式**）
**反面**：把 `resetHistory` 暴露出去 → 页面能在任意时刻清历史 → 状态机的"不变式"（历史第 0 步 = 当前局的开局盘）被破坏。

**模式 5：一次性数据要有明确的生命周期**

| 数据 | 生命周期 | 实现 |
|---|---|---|
| `savedTip` | **读一次就消失** | `takeSavedTip()` 取走即清（§3.7） |
| `details[rowId]` | **被改动后失效** | `dropDetail(rowId)` 精确失效（§3.6） |
| `snapshots` | **新分支落子即截断未来** | `splice(currentStep + 1)`（§2.9） |
| `selected` | **开局/锁题即重置** | `resetHistory` 里清（§2.9） |

### 5.2 明确"不该进 store"的六类（本节最重要）

| 类别 | 真实例子 | 该放哪 |
|---|---|---|
| 某个页面内部的弹层开关 | `answerOpen` / `exportOpen` / `previewOpen` | composable 的 `ref` |
| 一次性的提示文案 | `tip`（游戏页提示） | composable 的 `ref`（**跨页的那种才用 store**，如 `savedTip`） |
| 地址的一部分 | `page` / `sort` / `keyword` / `mode`（登录页） | `route.query`（R15） |
| 纯 UI 偏好 | `pagerMode`（进度条/滑动条） | `localStorage`（`services/prefs.ts`） |
| 页面级的列表 UI 状态（只有一个页面用） | —— | composable（本项目因为**两个列表页共用**，才放进 `puzzleStore` 的 `loading`/`error`） |
| 表单里正在输入的临时值 | 登录页的 `uid`/`password` 输入框 | 页面 / composable（提交时才进 store 动作） |

**判据再念一遍**（01 册 §2.4 / 本册 §1.2）：
> **多组件要读 + 会话内要一直记住 → store；只有一处用 → composable；要分享/刷新保留 → query / localStorage。**

### 5.3 数据流总图（谁写、谁读）

```
【用户动作】                              【store】                    【谁在读】
点击格子     →  gameStore.select(pos)  →  selected                  → BoardView 选中框
点数字键     →  gameStore.inputNum(n)  →  board（+snapshots）           → numBoard → isWin/status/conflictMask
                                                                      → GamePage.boardParams → 画布重绘
点历史条     →  gameStore.jump(i)      →  board + currentStep        → 同上
点"提示"     →  gameStore.getCandidates(pos)  （只读，不改状态）        → hintTextOf → tip
点"重开"     →  gameStore.jump(0)      →  board + currentStep
进游戏页     →  gameStore.startGame/…  →  全新一局（7 个字段一起重置）

提交题面     →  gameStore.lockPuzzle() →  board（lock 全变 true）

搜索/翻页    →  puzzleStore.search(q)  →  items/total/authorUname     → 搜索页列表 + 分页条
列表 → 预览  →  puzzleStore.detailOf(rowId) → details[rowId]（缓存）    → 预览遮罩 / 编辑页 / 挑战
编辑保存     →  puzzleStore.dropDetail(rowId) → 缓存失效               → 下次取新数据
提交自定义   →  puzzleStore.flashSaved(text) → savedTip                → 游戏页 onMounted 取一次

登录/登出    →  userStore.login/logout →  profile                     → 顶栏 / 路由守卫 / 各路"需要登录"
HTTP 401     →  （事件）              →  profile = null               → 顶栏立刻变游客
```

**读这张图的方法**：从左往右看"谁改了它"，从右往左看"改了之后谁会跟着变"。**这两个方向都清楚了，你就真正掌握了这三个 store。**

---

## 6. 本册自测（20 题）

### `gameStore`

1. 为什么 `gameStore` 里**没有** `status` 这个 `ref`？`statusOf(!!board.value.length, isWin.value)` 这种写法比"手写三分支"好在哪？
2. `numBoard` 是 `computed(() => toNum(board.value))`。为什么不做成"落子时同步更新的 ref"？（用一句话说出那种写法的风险）
3. `isWin` 的三个守卫分别是防什么的？第 ② 个（空盘）严格说是"正确性"还是"性能"？
4. `conflictMask` 为什么必须写 `numBoard.value.length ? … : …` 这个三元？不写会抛什么错？
5. `EMPTY_META` 是模块常量，为什么每次使用都要 `{ ...EMPTY_META }`？
6. `pushHistory` 里 `snapshots.value.splice(currentStep.value + 1)` 这一行的语义是什么？删掉它会看到什么现象？
7. 为什么 `pushHistory` 用 `snapshots.value.length - 1` 而不用 `currentStep.value++`？
8. `jump(step)` 里为什么要 `cloneBoard(snapshots.value[step])`，不能直接赋值？（提示：与 `inputNum` 的 `cell.v = n` 有关）
9. `inputNum` 的四个守卫按什么顺序排？把"同值不重复写"提到第一位会有什么问题？
10. `cell.v = n` 直接改嵌套对象属性，为什么在 Vue 3 里能触发重绘？如果 `board` 用的是 `shallowRef` 会怎样？
11. `startGame`（`fromPuzzle(puzzle, true)`）与 `startInput`（`fromPuzzle(puzzle, false)`）的 `true/false` 分别对应什么用户场景？为什么不能统一？
12. `startFromTexts` 为什么允许 `solutionText` 解析失败（`?? []`）？为什么它返回 `boolean` 而不是直接跳页？
13. `lockPuzzle` 只改 `lock` 标记，为什么还要 `resetHistory()`？

### `puzzleStore` 与 `userStore`

14. `puzzleStore` 里**没有** `page` / `sort` / `keyword` —— 它们在哪？为什么这么安排（说出"可分享/可刷新/可后退"这条论据）？
15. `empty` 为什么必须同时判断 `!loading && !error && !items.length` 三个条件？少 `!loading` 会出现什么用户可见的现象？
16. `loadPage(run, empty)` 的两个参数各是什么？为什么 `error = ''` 要放在 `try` 之前、而 `loading = false` 放在 `finally`？（如果把 `error = ''` 放进 `finally` 会怎样？）
17. `detailOf` 缓存命中时**不发请求**；编辑保存后 `dropDetail(rowId)` 只删一条 —— 为什么不整体清空 `details`？
18. `takeSavedTip()` 为什么必须"取走即清"？如果只读不清，用户会看到什么？
19. `userStore` 只有 1 个 `ref` 却对外提供 `isGuest` / `uname` / `uid` 三个值 —— 这说明什么设计原则？
20. `onUnauthorized(() => { profile.value = null })` 为什么写在 store 里，而不是让 `client.ts` 直接改 store？（用"依赖方向"回答）

> **答不上来的题号，对应回看**：1-5 → §2.3~§2.7；6-8 → §2.9/§2.17；9-10 → §2.16；11-13 → §2.11~§2.14；14-15 → §3.1~§3.2；16 → §3.3；17 → §3.6；18 → §3.7；19 → §4.1；20 → §4.2。

---

## 附：本册速查表

| 想做的事 | 去哪里 | 具体 |
|---|---|---|
| 看"一局游戏有哪些状态" | `gameStore` 的 `ref` 清单 | §2.1 的表 |
| 落子 / 选中 / 跳步 / 重开 | `gameStore.select` / `inputNum` / `jump` | §2.15~§2.17 |
| 开一局（三种来源） | `startGame` / `startFromTexts` / `startCreate` / `startSolve` | §2.11~§2.13 |
| 出题流程"提交题面" | `gameStore.lockPuzzle()` | §2.14 |
| 判胜 / 冲突 / 候选 | `computed isWin` / `conflictMask` / `getCandidates` | §2.5 / §2.7 / §2.10 |
| 列表数据从哪来 | `puzzleStore.search` / `loadMine` | §3.4~§3.5 |
| 详情缓存与失效 | `detailOf` / `dropDetail` | §3.6 |
| 跨页一次性提示 | `flashSaved` / `takeSavedTip` | §3.7 |
| 登录态 | `userStore.profile` 与四个动作 | 01 册 §2.3 + 本册 §4 |

**下一册（06）进入 `composables/`**：看这些 store 与 core 的"零件"**怎么被编排成用户流程** —— 落子、提示、出题两阶段、编辑、自定义、求解、列表查询、剪贴板……每个 composable 都会讲清：**它为什么不是 store、也不是组件**。









