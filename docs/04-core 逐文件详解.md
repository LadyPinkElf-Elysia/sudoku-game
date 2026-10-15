# 04 · core 逐文件详解

> **这一册讲什么**：`src/core/` 全部 **16 个文件、约 900 行**，**每个文件的每个函数**都讲透：它解决什么问题、逐行在干什么、边界条件、时间复杂度、谁在调用它、**改坏了会怎样**。
> **前置**：00 册（JS/TS 语法）、01 册（canvas/Worker 概念）、03 册（为什么 core 必须纯）。
> **建议读法**：**按本册顺序读**（我按"被依赖的在前"排的），每节配合打开源文件。

---

## 0. 这一册的固定结构（每节都长这样）

| 段 | 内容 |
|---|---|
| **① 这个文件是干嘛的** | 一句话定位 + 它在依赖图里的位置 |
| **② 逐行/逐函数解释** | 贴真实代码，每段说明"在算什么、为什么这么写" |
| **③ 边界与陷阱** | 空输入、异常输入、浮点、越界…… |
| **④ 谁在调用它** | 前向引用（store / composable / 组件 / 后端） |
| **⑤ 改坏了会怎样** | 具体的错误现象（不是抽象警告） |

---

## 1. core 全景：16 个文件在依赖图里各占什么位置

### 1.1 清单（行数 / 导出数 / 一句话职责）

| 文件 | 行 | 导出 | 一句话职责 |
|---|---|---|---|
| `array.ts` | 22 | 4 | 通用数组工具：洗牌（可注入随机）、造二维数组、二维映射、切块 |
| `board/metrics.ts` | 38 | 6 | **尺寸换算**：容器宽+缩放→边长、边长→格宽→字号、点击偏移→行列、格→宫起点/宫序号 |
| `board/model.ts` | 14 | 4 | **两种盘面互转**（数字盘 ↔ 格子盘）+ 一维下标→坐标 |
| `board/ops.ts` | 19 | 6 | 盘面操作：深拷、判全空、锁定格、套答案、数空格、取"题面盘" |
| `board/zoom.ts` | 16 | 6 | 缩放：夹紧、增减、能否增减（抗浮点）、按盘面取默认值 |
| `sudoku/shape.ts` | 25 | 5 | 盘面"形状与比例"：S/B 互推、总格数、挖空数、比例是否合规 |
| `sudoku/parse.ts` | 40 | 3 | 字符串 ↔ 盘面（题面串解析 + 反向输出） |
| `sudoku/rules.ts` | 178 | 2 | **规则工厂**（`createSudoku`/`getSudoku`）：行列宫枚举、候选、冲突、判胜、题面校验 |
| `sudoku/tracker.ts` | 127 | 1 | 回溯用**候选簿记器**：缓存每格候选 + MRV 挑格 + 落子/撤销（闭包） |
| `sudoku/solver.ts` | 70 | 2 | **回溯引擎**（DFS）+ 单解入口 |
| `sudoku/multiSolver.ts` | 45 | 2 | 多解枚举（共用同一引擎，换停止策略） |
| `sudoku/generator.ts` | 144 | 2 | **生成器**：模式盘 → 随机变换 → 保留骨架 → 补全 → 完整解 / 出一道题 |
| `sudoku/digger.ts` | 113 | 1 | **挖空器**：拿完整解 → 三阶段挖出题面（保底不出现空行/列/宫） |
| `game/derive.ts` | 20 | 3 | 棋局派生：状态推导、提示文案、比例→百分数 |
| `message.ts` | 27 | 3 | **全站文案出口**：错误文本、挖空比例提示、提交题面校验顺序 |
| `page.ts` | 29 | 5 | 分页与列表条件纯函数：页数、收敛、offset、排序/浏览方式归一化 |

**数一下**：`16 个文件 / 约 907 行 / 每文件 2~8 个导出` —— 正好卡在 R9 的预算里（03 册）。

### 1.2 依赖图（谁 import 谁）

```
        array.ts ──────────────┐
   board/metrics.ts ───────────┤
   board/model.ts ─────────────┤
   board/ops.ts ───────────────┤
   board/zoom.ts               │
   sudoku/shape.ts ────────────┤
                               ▼
                    ┌──────────────────────┐
                    │  sudoku/rules.ts     │ ← 规则（被最多文件依赖）
                    └──────────┬───────────┘
                               │
              ┌────────────────┼─────────────────┐
              ▼                ▼                 ▼
     sudoku/tracker.ts   sudoku/solver.ts   sudoku/parse.ts
              │                │                 │
              └───────┬────────┘                 │
                      ▼                          │
           ┌────────────────────┐                │
           │ solver.ts（引擎）  │◄───────────────┤
           └────────┬───────────┘                │
        ┌───────────┴────────────┐               │
        ▼                        ▼               │
 multiSolver.ts            generator.ts ──► digger.ts
                                 │               │
                                 └───────┬───────┘
                                         ▼
             core/message.ts · core/page.ts · core/game/derive.ts
                          （更高一层的纯函数，服务于 UI）
```

**读代码的顺序 = 从"谁都不依赖"开始**：`array` → `metrics` → `model`/`ops`/`zoom` → `shape` → `parse` → `rules` → `tracker` → `solver` → `multiSolver`/`generator`/`digger` → `derive`/`message`/`page`。

**为什么要这样读**：每个文件都只依赖"已经读过的那些"，所以每一步都能完整理解，不需要往后跳。

### 1.3 三条贯穿全册的"core 语法"

读的时候你会反复看到这三样，先认识它们：

| 语法 | 本项目里的含义 | 例 |
|---|---|---|
| `Position = readonly [row, col]` | **坐标**（元组，固定 2 位） | `for (const [r, c] of cells)` |
| `number[][]`（`NumBoard`） | **数字盘**：0 = 空格 | `grid[r][c]` |
| `Cell[][]`（`Board`） | **格子盘**：`{ v, lock }` | `board[r][c].lock` |

**两种盘面为什么要并存**：算法只关心数字（快、好算），界面要区分"题目给定 / 玩家填的"（`lock`）。详细理由见 §4 与 09 册。

---

## 2. `core/array.ts`（22 行 · 4 个导出）—— 最底层的四个工具

**① 这个文件是干嘛的**：整个 core 里被 import 最多的"地基"。**它没有任何业务概念**（不知道数独是什么），只有"数组怎么造、怎么打乱、怎么映射、怎么切"。

### 2.1 `shuffle`：Fisher–Yates 洗牌（可注入随机）

```ts
export const shuffle = <T>(arr: T[], rng: Rng): void => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
}
```

**逐行**：

| 行 | 在干什么 |
|---|---|
| `for (let i = arr.length - 1; i > 0; i--)` | **从后往前**遍历（到 `i = 1` 就够，因为最后一个位置 `i = 0` 时"和自己交换"没意义） |
| `const j = Math.floor(rng() * (i + 1))` | 取一个 `0 ~ i` 的随机下标。`rng()` 返回 `[0, 1)`，乘 `i+1` 得到 `[0, i+1)`，`floor` 后是 `0 ~ i`（**包含 i**） |
| `;[arr[i], arr[j]] = [arr[j], arr[i]]` | **解构交换**：一行完成互换（00 册 §3.2）。行首的 `;` 是必需的 —— 防止上一行末尾被 JS 解析成"函数调用链"（ASI 陷阱） |

**为什么"从后往前"是对的（这是关键）**：
- 第 1 轮：从**全部 n 个**元素里随机挑一个换到"最后一位" → 最后一位确定；
- 第 2 轮：从**前 n-1 个**里随机挑一个换到"倒数第二位" → 倒数第二位确定；
- …
- **每个位置被选中的概率都是 1/剩余个数 → 结果是严格等概率的**（n! 种排列等概率）。
**如果从前往后**写 `j = floor(rng() * n)`（固定范围），就会出现"某些排列更容易出现"的偏差 —— 这是最常见的洗牌错误。

**为什么接 `rng: Rng` 而不是内部 `Math.random()`**：见 00 册 §3.16 —— **可复现**。core 不许碰 `Math.random`（R3），`rng` 由调用方注入：
- 浏览器里 → 真随机；
- 测试里 → 固定序列 → 结果稳定可断言。

**边界**：`arr.length <= 1` 时循环体一次都不进（`i > 0` 不成立）→ 不报错、不改变数组。**原地修改**（返回 `void`），这是故意的（避免每次洗牌都复制大数组）。

### 2.2 `makeGrid`：造二维数组（**必须传工厂函数**）

```ts
export const makeGrid = <T>(s: number, fn: () => T): T[][] =>
    Array.from({ length: s }, () => Array.from({ length: s }, fn))
```

**为什么要传"工厂函数"而不是"值"**（本节最重要的知识点）：

```ts
// ❌ 如果用值来造（想象版）：
const grid = new Array(s).fill(new Array(s).fill(0))
grid[0][0] = 5
// → 所有行都变成 [5, 0, ...] —— 因为 9 行是同一个数组对象！
```

**`Array.from({length: s}, fn)` 每个位置都会调用一次 `fn`**，所以每一行、每个元素都是**全新的对象**：

```ts
makeGrid<Cell>(S, () => makeCell(0, false))     // ✅ S×S 个独立的 Cell 对象
```

**为什么外层用 `Array.from({length})` 而不是 `new Array(s).fill(0).map(...)`**：`Array.from` 语义更直接（"按长度生成"），且不会遇到"稀疏数组 `.map` 不执行"的坑（`new Array(3).map(fn)` 是**不会调用 fn** 的！因为稀疏数组没有元素）。

**边界**：`s = 0` → `[]`；`s` 为负数 → `Array.from({length: -1})` 得到 `[]`（不报错）。

### 2.3 `mapGrid`：二维映射（两种盘面互转的底座）

```ts
export const mapGrid = <T, U>(grid: T[][], fn: (v: T) => U): U[][] =>
    grid.map(row => row.map(fn))
```

**两个类型参数 `<T, U>`**：输入 `T[][]`、输出 `U[][]`。
**它就是"逐格变换"的唯一写法**：`fromPuzzle`（number → Cell）、`toNum`（Cell → number）、`cloneBoard`（Cell → 新 Cell）、`givenBoard`（Cell → number）全部基于它。

**`map` 不改原数组**（返回新数组）→ 这正好满足 core 的"不改入参"铁律（00 册 §3.11）。

### 2.4 `chunk`：一维切块（解析题面用）

```ts
export const chunk = <T>(arr: T[], size: number): T[][] =>
    Array.from(
        { length: Math.ceil(arr.length / size) },
        (_, i) => arr.slice(i * size, (i + 1) * size)
    )
```

**逐点**：
- `Math.ceil(arr.length / size)`：**块数要向上取整**（`81 / 9 = 9`；`82 / 9 = 9.11 → 10` 块，最后一块只有 1 个元素）；
- `(_, i) => ...`：**`_` 表示"第一个参数（值）用不到，我只要下标 `i`"** —— 本项目明确规定"用不到就显式命名 `_`"（00 册 §4.9）；
- `arr.slice(start, end)`：**含头不含尾**，且 `end` 超出长度也不会报错（自动截断）。

**它在哪被调用**：`parse.ts` 把"81 个数字的一维数组"切成"9×9 的二维盘面"（§8）。

**边界**：`size <= 0` → `Math.ceil(n/0) = Infinity` → `Array.from({length: Infinity})` **会抛异常** —— 但调用点（`parse`）永远先保证 `size = side ≥ 1`，所以不会触发。**这就是"内层函数只做一件事、把合法性交给调用方"的分工**：`parse` 负责校验，`chunk` 只管切。

---

## 3. `core/board/metrics.ts`（38 行 · 6 个导出）—— 所有"像素 ↔ 格子"的换算

**① 这个文件是干嘛的**：**"几何计算"的唯一出处**。canvas 渲染用它、点击换算用它、画网格线（要找宫起点）也用它。
**为什么这些计算在 core 而不是 render**：它们是**纯数学**（给数字算数字），放在 core 才能被复用与测试；`render/` 只该有"怎么画"。

先记住 `constants/board.ts` 的真实数值（下面要代入计算）：

```ts
BOARD_SIZE = { widthRatio: 0.70, minSide: 240, maxSide: 420, fontSizeRatio: 0.55, minFontSize: 8 }
BOARD_ZOOM = { min: 1, max: 10, step: 0.25, default: { 2:1, 3:1.25, 4:1.5, 5:2, 6:2.5, 7:3, 8:4, 9:5, 10:6 } }
```

### 3.1 `boardSideOf`：容器宽 + 缩放 → 棋盘边长

```ts
export const boardSideOf = (contentWidth: number, zoom: number): number => {
    const base = Math.max(contentWidth * BOARD_SIZE.widthRatio, BOARD_SIZE.minSide)
    return Math.round(Math.min(base, BOARD_SIZE.maxSide) * zoom)
}
```

**代入算一遍**（容器宽 `400`、缩放 `1.25`）：

| 步骤 | 计算 | 结果 |
|---|---|---|
| ① 容器宽 × 0.70 | `400 × 0.70` | `280` |
| ② 与最小边长取大 | `max(280, 240)` | `280`（窄屏才生效：容器 300 宽 → `max(210,240)=240`） |
| ③ 与最大边长取小 | `min(280, 420)` | `280`（大屏上限：容器 900 宽也是 `min(630,420)=420`） |
| ④ × 缩放、取整 | `round(280 × 1.25)` | **`350`** |

**三个设计要点**：
1. **先夹紧 base、再乘 zoom** → "放大"**可以突破 `maxSide`**（有意为之：`maxSide` 限制的是"基础尺寸"）；
2. **`Math.round` 取整像素** → 避免子像素让线条发虚；
3. **`contentWidth = 0`（还没量到）** → `max(0,240)=240` 兜底成最小边长（不会算出 0 宽棋盘）。

### 3.2 `cellSizeOf`：边长 → 每格边长

```ts
export const cellSizeOf = (side: number, gridSize: number): number => side / gridSize
```

**它返回的可能是小数**（`350 / 9 = 38.888…`）。
**为什么允许小数**：canvas 是浮点坐标系，小数格宽更精确（`c * cellSize` 累加不丢像素）；字号才需要取整（`fontPxOf`）。
**调用点**：`renderBoard` 拿它当绘制步长；`offsetToCell` 拿它做除法换算。

### 3.3 `fontPxOf`：每格边长 → 字号（带下限）

```ts
export const fontPxOf = (cellSize: number): number =>
    Math.max(BOARD_SIZE.minFontSize, Math.floor(cellSize * BOARD_SIZE.fontSizeRatio))
```

- `cellSize × 0.55`：字号占格子 55%，视觉留白合适；
- `Math.floor`：像素取整（避免半像素字形发虚）；
- `Math.max(…, 8)`：**下限 8px** —— 36×36 大盘格宽可能只有 9px，`9 × 0.55 = 4.95 → 4` 完全看不清 → 强制 8px。

**这就是"可用性下限"的设计**：算得再准，字看不清就等于没有。

### 3.4 `offsetToCell`：画布内偏移 → 行列坐标（**带越界保护**）

```ts
export const offsetToCell = (offsetX: number, offsetY: number, side: number, gridSize: number): Position | null => {
    if (side <= 0 || gridSize <= 0) return null
    const cellSize = cellSizeOf(side, gridSize)
    const r = Math.floor(offsetY / cellSize)
    const c = Math.floor(offsetX / cellSize)
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return null
    return [r, c] as const
}
```

**为什么除以 `cellSize`**：`offset` 是"点离画布左上角多少像素"，除以格宽即"第几格"，`floor` 落到整数格。

**三处防御**：

| 情况 | 结果 | 为什么 |
|---|---|---|
| `side <= 0` 或 `gridSize <= 0` | `null` | 元素未渲染/尺寸为 0 → 会除出 `Infinity`/`NaN` |
| `r`/`c` 为负 | `null` | 点在画布外（理论上不会，但滚动/变换可能造成） |
| `r`/`c` ≥ `gridSize` | `null` | **正好点在右/下边界**：`offsetX === side` → `floor(side/cellSize) = gridSize` → 越界 |

**`as const` 的作用**：`[r, c]` 会被推断成 `number[]`，加 `as const` 得到 `readonly [number, number]`，符合 `Position`（00 册 §4.4）。

**调用链**：`render/board.ts` 的 `getClickPos` → `offsetToCell(e.clientX - rect.left, e.clientY - rect.top, rect.width, size)` → 返回 `null` 就不发事件（01 册 §3.1）。

### 3.5 `boxOriginOf`：格坐标 → 所在宫的左上角

```ts
export const boxOriginOf = (row: number, col: number, boxSize: number): Position =>
    [Math.floor(row / boxSize) * boxSize, Math.floor(col / boxSize) * boxSize]
```

**举例**（`B = 3`）：格 `(4, 7)` → 宫起点 `[floor(4/3)*3, floor(7/3)*3] = [3, 6]`。

**它解决的问题**：遍历"宫"时不用在各处重算起点 —— `rules.ts` 的 `getCandidates`、`tracker.ts` 的 `place` 都直接用它（**算式只有一份**，这正是 R6/R7 禁页面写 `Math.` 的收益）。
**命名约定**：返回的 `[sr, sc]` 语义是"宫起点"（不是某个格子），靠变量名 `sr`/`sc` 与普通格 `r`/`c` 区分。

### 3.6 `boxIndexAt`：格坐标 → 宫序号

```ts
export const boxIndexAt = (row: number, col: number, boxSize: number): number =>
    Math.floor(row / boxSize) * boxSize + Math.floor(col / boxSize)
```

**举例**（`B = 3`）：`(4, 7)` → `1*3 + 2 = 5` → 第 **5** 号宫（**0~8，行优先**）：

```
宫序号：0 1 2
        3 4 5     ← 公式：宫行 × B + 宫列
        6 7 8
```

**为什么需要"宫序号"**：`tracker.ts` 用一个**一维数组** `boxUsed[宫序号][数字]` 记录"每个宫用掉了哪些数字"（比存 9 个二维小盘省事得多）；`digger.ts` 用它记 `boxKeep[宫序号]`。
**注意**：它与 `toRC(boxIndexAt(r,c,B), B)` 是"宫序号 ↔ 宫的坐标"的互推关系（别和"格坐标"搞混）。

---

## 4. `core/board/model.ts`（14 行 · 4 个导出）—— 两种盘面的互转

**① 这个文件是干嘛的**：`Cell[][]`（格子盘）↔ `number[][]`（数字盘）的**唯一转换入口**，外加"一维下标 → 坐标"的小工具。

```ts
export const makeCell = (v: number, lock: boolean): Cell => ({ v, lock })

export const fromPuzzle = (nums: NumBoard, lockGiven: boolean): Board =>
    mapGrid<number, Cell>(nums, num => makeCell(num, lockGiven ? num !== 0 : false))

export const toNum = (board: Board): NumBoard =>
    mapGrid<Cell, number>(board, cell => cell.v)

export const toRC = (idx: number, S: number): Position =>
    [Math.floor(idx / S), idx % S]
```

### 4.1 `makeCell`：唯一的 Cell 构造函数

**为什么值得为 `{ v, lock }` 单独写一行**：将来加字段（例如"候选数标记"）时，**只有一个地方要改**。
如果各处手写字面量 `{ v: n, lock: true }`，加字段就要改几十处，而且容易漏。

### 4.2 `fromPuzzle`：数字盘 → 格子盘（`lockGiven` 是"风格开关"）

```ts
mapGrid<number, Cell>(nums, num => makeCell(num, lockGiven ? num !== 0 : false))
```

| `lockGiven` | 效果（渲染上） | 用在哪 |
|---|---|---|
| `true` | **非 0 格全部锁死** → 画成"题目给定"的深色粗体（`BOARD_FONT.given = 700`、`BOARD_COLOR.givenText`） | 游玩盘（从题面构造）· **参考答案遮罩**（`fromPuzzle(solution, true)`：让答案看起来像"给定的"） |
| `false` | 全部不锁 → 画成玩家填的蓝色常规体 | 需要"全部可编辑/统一风格"的场合 |

**真实调用**（01 册 §1.4 的 `answerInput`）：

```ts
board: gameStore.solution.length ? fromPuzzle(gameStore.solution, true) : [],
```

**注意 `num !== 0`**：保证**空格永远是 `lock = false`**（空格本来就该能填），即使 `lockGiven = true`。

### 4.3 `toNum`：格子盘 → 数字盘（**一切算法的入口**）

**所有算法只接受 `NumBoard`**：`rules.hasConflict(numBoard)`、`solveGrid(grid, …)`、`boardToStr(numBoard)`……
所以本项目的固定动作是"**要算之前先 `toNum`**"（store 里常见 `const num = toNum(board)` 然后调 core）。

**为什么不让算法直接吃 `Cell[][]`**：
- 算法只关心数字，多一个 `lock` 只会增加心智负担；
- `NumBoard` 可以**序列化、发给 Worker、存数据库**；
- 后端只有字符串/数字，**没有 `Cell` 概念** —— 两种盘面分开，才能让"同一份 core"在后端跑。

### 4.4 `toRC`：一维下标 → 坐标

```ts
[Math.floor(idx / S), idx % S]        // 是 idx = r * S + c 的逆运算
```

**用在哪**：`generator.ts` / `digger.ts` 里 `indices` 是"0 ~ S²-1 的打乱下标"，需要换算成行列。
**知识点**：**正向 `r * S + c` 与反向 `[floor(i/S), i % S]` 必须成对出现**；写错任何一个就会得到"棋盘整体错位"这种极难排查的 bug（渲染看着有数字，但位置全乱）。

---

## 5. `core/board/ops.ts`（19 行 · 6 个导出）—— 盘面操作

**① 这个文件是干嘛的**：对盘面的"六种基本操作"，全部**返回新盘、不改入参**（core 铁律）。

### 5.1 `cloneBoard`：深到"格子"这一层的拷贝

```ts
export const cloneBoard = (b: Board): Board => mapGrid(b, cell => ({ ...cell }))
```

**为什么必须这样拷**（01 册 §3.11 的坑重来一遍）：
`[...b]` 只复制"外层 9 个引用"，`copy[0]` 和 `b[0]` 还是同一个数组 → 改 `copy[0][1].v` 会**同时改掉原盘**。
这里用 `mapGrid` **逐格开新对象** `{ ...cell }`（`Cell` 是平对象，浅拷贝就够）→ 得到完全独立的盘。

**用在哪**：`gameStore` 存快照（历史记录）、撤销时还原。

### 5.2 `isBlankBoard`：整盘是否全空

```ts
export const isBlankBoard = (grid: NumBoard): boolean => grid.every(row => row.every(v => v === 0))
```

**语义**：所有格子都是 0（**注意不是"有没有空格"，而是"一个数都没有"**）。
**用在哪**：提交题面校验的**第一条**（`message.puzzleSubmitErrorOf` → "题目不能全空"）。
**知识点**：`every` 在遇到第一个 `false` 就短路返回 → 实际上很快（第一个非 0 数就结束）。

### 5.3 `lockGiven`：把"当前所有非空格"锁死

```ts
export const lockGiven = (board: Board): Board =>
    mapGrid(board, cell => ({ v: cell.v, lock: cell.v !== 0 }))
```

**和 `fromPuzzle(nums, true)` 的区别**：`fromPuzzle` 从**数字盘**造新盘；`lockGiven` 是**在已有格子盘上就地"重新锁定"**（保留 `v`，按 `v !== 0` 重算 `lock`）。
**用在哪**：**出题/编辑流程的"提交题面"那一刻** —— 用户在阶段①填好题面（全部可编辑），点提交后要把这些数字**变成"给定的"**，才能进入阶段②去填答案（此时题面格不能再改）。这就是 `usePuzzleStage` 里 `lockGiven(...)` 的用途。

### 5.4 `applySolution`：把答案套到盘上

```ts
export const applySolution = (board: Board, solution: NumBoard): Board =>
    board.map((row, r) => row.map((cell, c) => ({ ...cell, v: solution[r][c] ?? cell.v })))
```

**逐点**：
- 保留原 `cell`（含 `lock`），只替换 `v`；
- **`solution[r][c] ?? cell.v`**：万一 `solution` 形状不匹配（越界得 `undefined`），**回落到原值**而不是写入 `undefined` —— 这样盘面永远不会被"污染成非法状态"；
- **不改 `lock`**：答案格依然是"玩家可改"的（如果要全锁，应该用 `fromPuzzle(solution, true)`）。

**用在哪**：需要"用一份答案填充当前盘"的场景（例如把解出来的答案套回可编辑盘继续改）。

### 5.5 `countBlanks`：数空格

```ts
export const countBlanks = (board: NumBoard): number =>
    board.reduce((n, row) => n + row.reduce((m, v) => m + (v === 0 ? 1 : 0), 0), 0)
```

**逐点**：
- 外层 `reduce` 累加"每行的空格数"，内层 `reduce` 数一行里的 0；
- **`m + (v === 0 ? 1 : 0)`**：布尔转数字的常见写法（`true → 1`）；
- **必须两层 `reduce`，不能 `board.flat().filter(v => v === 0).length`** —— 后者会**额外创建一个长度 S² 的临时数组**（36×36 = 1296 个元素，大棋盘会重复分配）。**"少分配临时数组"是 core 里常见的性能意识**。

**用在哪**：`message.blankRatioErrorOf`（算比例）、后端 `checkPuzzle`（算 `blank_count`）、编辑页改题面后重算（07 册）。

### 5.6 `givenBoard`：只留"锁定格"的题面盘

```ts
export const givenBoard = (board: Board): NumBoard =>
    mapGrid(board, cell => (cell.lock ? cell.v : 0))
```

**语义**：**玩家填的数字全部抹成 0**，只保留题目给定的数字 → 得到"纯题面"。
**用在哪**：游戏页的**「导出题目」**（`useGameFlow.ts` 的 `exportPuzzle`）：

```ts
showExport(boardToStr(givenBoard(gameStore.board)))     // 题面串（不含玩家填的、不含答案）
```
**为什么不能直接 `toNum(board)`**：那样会把玩家当前填的数字也导出成"题面"，别人拿到就少了一半挑战 —— **这正是"格子盘比数字盘多一个 `lock`"的价值所在**。

---

## 6. `core/board/zoom.ts`（16 行 · 6 个导出）—— 缩放（含一个真实的浮点坑）

**① 这个文件是干嘛的**：棋盘缩放的全部规则（夹紧、步进、能否继续、按盘面取默认）。**页面上那对 ➕➖ 按钮"可点 / 不可点"完全由它决定**。

```ts
/** 浮点累加：2.8+0.1=2.9000000000000004，直接用 >= 比较按钮永远不禁用 */
const EPS = 1e-9

export const clampZoom = (v: number): number =>
    Math.min(BOARD_ZOOM.max, Math.max(BOARD_ZOOM.min, v))

export const zoomInOf = (v: number): number => clampZoom(v + BOARD_ZOOM.step)
export const zoomOutOf = (v: number): number => clampZoom(v - BOARD_ZOOM.step)

export const canZoomInFrom = (v: number): boolean => v < BOARD_ZOOM.max - EPS
export const canZoomOutFrom = (v: number): boolean => v > BOARD_ZOOM.min + EPS

export const defaultZoomOf = (boxSize: number): number => BOARD_ZOOM.default[boxSize] ?? BOARD_ZOOM.min
```

### 6.1 `clampZoom`：夹紧（注意 `Math.min` / `Math.max` 的嵌套顺序）

```ts
Math.min(BOARD_ZOOM.max, Math.max(BOARD_ZOOM.min, v))
```

**顺序不能反**：内层 `max(min, v)` 保证**不低于下限**，外层 `min(max, …)` 保证**不高于上限**。
**代入**：`v = 99` → `max(1,99)=99` → `min(10,99)=10` ✅；`v = 0.2` → `max(1,0.2)=1` → `min(10,1)=1` ✅。

### 6.2 `zoomInOf` / `zoomOutOf`：步进 + 内置夹紧

`step = 0.25`（每次 ±0.25），**夹紧写在函数内部** → 调用方不用自己写 `if`：

```ts
const zoomIn = (): void => { zoom.value = zoomInOf(zoom.value) }     // 到顶也不会超过 max
```

### 6.3 `canZoomInFrom` / `canZoomOutFrom`：为什么需要 `EPS`

**注释写得很清楚**（这类 bug 的标准形态）：

```js
2.8 + 0.1     // → 2.9000000000000004   （不是 2.9！）
```

浮点数用二进制存小数，`0.1` 这类数**存不准**，累加后会产生极小误差。
如果写成 `v < BOARD_ZOOM.max`：当 `v` 通过累加变成 `10.000000000000002` 时没问题；但若停在 `9.999999999999998`，`v < 10` 为 `true` → **按钮还能点，一点却被夹紧回 10 → 没反应**（用户以为坏了）。
**`EPS = 1e-9`**：把比较放宽"十亿分之一" → 在 10 附近就认为"到头了"，按钮立刻禁用。

**一个诚实的补充**：本项目 `step = 0.25`（`0.25 = 2⁻²`，二进制精确），当前**不会**真的累积误差 → `EPS` 现在是**保险**：
只要以后把 `step` 改成 `0.1`、或在 `default` 表里放进"非四分之一倍数"的值，这套比较依然正确。**这就是防御性写法的价值。**

### 6.4 `defaultZoomOf`：按"宫边长 B"取默认缩放（**最容易搞错的一点**）

```ts
BOARD_ZOOM.default[boxSize] ?? BOARD_ZOOM.min
```

`BOARD_ZOOM.default` 的**键是宫边长 `B`，不是盘面边长 `S`**（`constants/board.ts` 注释原文："键 = 宫边长 B（2~10）"）：

| 盘面 | `B` | 默认缩放 |
|---|---|---|
| 4×4 | 2 | 1 |
| **9×9** | **3** | **1.25** |
| 16×16 | 4 | 1.5 |
| 25×25 | 5 | 2 |
| **36×36** | **6** | **2.5** |
| 100×100 | 10 | 6 |

**为什么按 `B` 而不是 `S`**：`B` 就是"盘面大小下拉"的**值**（`BOX_SIZE_OPTIONS` 存的是 `B`），页面拿到的自始至终是 `boxSize: B`（`gameStore.config.boxSize`）→ **用 `B` 做键，调用方直接传、不用换算、也不会混**。
**`?? BOARD_ZOOM.min`**：没登记的尺寸兜底成 1 → **永远有值**，调用方不必处理 `undefined`。

### 6.5 谁在调用它 / 改坏了会怎样

- `useZoom()`：把 `zoom` 包成 `ref`，把 `zoomInOf`/`zoomOutOf`/`canZoom*From` 组织成按钮数据 `zoomActions`（01 册 §1.3、§3.7）；
- `useBoardZoom(() => boxSize)`：初始值 `defaultZoomOf(boxSize())`，尺寸变化时 `watch` 复位（01 册 §1.5）；
- `render/board.ts`：`boardSideOf(contentWidth, zoom)` 把缩放变成像素边长（§3.1）。

**改坏了会怎样**：把 `defaultZoomOf` 的键当成 `S`（例如用 `S = 9` 查表）→ 命中 `default[9] = 5` → 9×9 棋盘边长 `280 × 5 = 1400px`，一屏只能看到 1/5。**"键的含义要写清楚"就是这么来的。**

---

## 7. `core/sudoku/shape.ts`（25 行 · 5 个导出）—— 盘面"形状与比例"

**① 这个文件是干嘛的**：所有"盘面尺寸"换算与判定（`B ↔ S`、总格数、挖空数、比例是否合规）。**它是"40%~65%"这条业务规则的唯一算法出处。**

```ts
import { BLANK_RATIO } from "../../constants/game"

export const sideOf = (boxSize: number): number => boxSize * boxSize
export const cellCountOf = (boxSize: number): number => sideOf(boxSize) ** 2
export const blankCountOf = (boxSize: number, ratio: number): number => Math.floor(cellCountOf(boxSize) * ratio)

export const boxSizeOf = (side: number): number | null => {
    if (!Number.isInteger(side) || side < 1) return null
    const b = Math.round(Math.sqrt(side))
    return b * b === side ? b : null
}

export const isBlankRatioOk = (blankCount: number, boxSize: number): boolean => {
    const cells = cellCountOf(boxSize)
    if (cells <= 0) return false
    const ratio = blankCount / cells
    return ratio >= BLANK_RATIO.min - 1e-9 && ratio <= BLANK_RATIO.max + 1e-9
}
```

### 7.1 三个"正向"换算（B → S → 格数 → 挖空数）

| 函数 | 公式 | 举例（`B = 3`） |
|---|---|---|
| `sideOf(B)` | `B * B` | `3 → 9`（9×9 的盘面边长是 9） |
| `cellCountOf(B)` | `(B*B)² = B⁴` | `3 → 81` |
| `blankCountOf(B, ratio)` | `floor(B⁴ × ratio)` | `(3, 0.4) → floor(32.4) = 32` |

**记住 `B⁴` 这个关系**：宫边长 `B` → 盘面边长 `S = B²` → 总格数 `S² = B⁴`。
`B = 10` → `S = 100` → **总格数 = 10000**（这正是后端那条"需要 16/81/256/…/10000 个 0-9 数字"文案里数字的来历）。
**为什么 `blankCountOf` 用 `Math.floor`**：挖空数必须是整数，向下取整更安全（不会因为 +1 而超出比例上限）。

### 7.2 `boxSizeOf`：S → B（**"完全平方数"的稳写法**）

```ts
const b = Math.round(Math.sqrt(side))
return b * b === side ? b : null
```

**为什么不能直接判断 `Number.isInteger(Math.sqrt(side))`**：`Math.sqrt` 对大数会有浮点误差（可能出现 `99.99999999999999`）→ 直接判整数会**误判**。
**稳的写法**：先 `round` 取最近整数，再**平方回验**（整数乘法精确）→ 确认无误才返回。

**边界**：`side = 0`/负数/非整数 → `null`；`side = 10`（不是完全平方）→ `b=3`、`9 ≠ 10` → `null`。
**谁在用**：`parse.parsePuzzle`、`solver.solvePuzzle`、`multiSolver.solvePuzzleMulti`、`digger.digPuzzle`（都是"入口合法性检查"）。

### 7.3 `isBlankRatioOk`：比例是否合规（**闭区间 + 抗浮点**）

```ts
ratio >= BLANK_RATIO.min - 1e-9 && ratio <= BLANK_RATIO.max + 1e-9
```

`BLANK_RATIO = { min: 0.4, max: 0.65 }` → 规则是 **40%~65%（闭区间）**。**代入 9×9（81 格）看边界**：

| 挖空数 | 比例 | 判定 |
|---|---|---|
| 32 | 0.3951 | ❌ 不到 40% |
| **33** | **0.4074** | ✅（`81 × 0.4 = 32.4`，第一个能过的就是 33） |
| 52 | 0.6420 | ✅ |
| **53** | **0.6543** | ❌ 超过 65%（`81 × 0.65 = 52.65`） |

**两个细节**：
- **`if (cells <= 0) return false`**：`B <= 0` 时先挡住，避免 `0/0 = NaN`（虽然 `NaN >= x` 恒为 `false` 也"恰好对"，但**显式返回更清楚**）；
- **`± 1e-9`**：浮点除法可能得 `0.6499999999999999`（本该是 0.65）→ 留极小容差，避免边界值被误判。

**它同时保证了前端与后端一致**：前端 `message.blankRatioErrorOf`（给用户看文案）与后端 `functions/utils/puzzle.ts` 的 `checkPuzzle`（服务端复校）**都调这一个函数**。
> 这也解释了 02 册那个 bug 为什么刺眼：**算法是对的、文案写错了**（写成 70%）—— 用户按错误提示去调数字，怎么调都不对。

---

## 8. `core/sudoku/parse.ts`（40 行 · 3 个导出）—— 字符串 ↔ 盘面

**① 这个文件是干嘛的**：**所有"用户粘贴的题面 / 接口返回的题面串"进入系统的必经之路**。核心任务一句话：**把乱七八糟的输入，要么变成合法盘面，要么明确返回 `null`**。

```ts
const parseNumArray = (str: string): number[] | null => {
    const tokens = str.trim().split(/[\s,，]+/).filter(Boolean)
    if (!tokens.length) return null
    const nums = tokens.map(t => Number(t))
    if (nums.some(n => !Number.isInteger(n))) return null
    return nums
}

const perfectSqrt = (n: number): number | null => {
    if (!Number.isInteger(n) || n < 1) return null
    const s = Math.round(Math.sqrt(n))
    return s * s === n ? s : null
}

export const parseNumBoard = (str: string): NumBoard | null => {
    const nums = parseNumArray(str)
    if (!nums) return null
    const side = perfectSqrt(nums.length)
    if (side === null) return null
    if (perfectSqrt(side) === null) return null
    if (nums.some(n => n < 0 || n > side)) return null
    return chunk<number>(nums, side)
}

export const boardToStr = (board: NumBoard): string => board.flat().join(' ')

export const parsePuzzle = (str: string): { board: NumBoard; boxSize: number } | null => {
    const board = parseNumBoard(str)
    if (!board) return null
    const boxSize = boxSizeOf(board.length)
    return boxSize === null ? null : { board, boxSize }
}
```

### 8.1 `parseNumArray`：切分 + 校验成"整数数组"

| 步骤 | 处理了什么真实输入 |
|---|---|
| `str.trim()` | 去掉首尾空白（从别处复制常带换行/空格） |
| `.split(/[\s,，]+/)` | **分隔符同时支持空白、英文逗号、中文逗号**（`\s` 含换行/制表）→ 用户怎么粘都能认 |
| `.filter(Boolean)` | 去掉空 token（连续分隔符会产生空串） |
| `nums.map(t => Number(t))` | `'5' → 5`；`'abc' → NaN`；`'1.5' → 1.5` |
| `some(n => !Number.isInteger(n))` | **一个不合格整体失败**（`NaN`、小数都算不合格） |

**注意一个配合**：`Number('')` 是 `0`，而 `filter(Boolean)` 已经把空串去掉了 —— **两个防御恰好互补**，缺一个就会多出一堆 0。

### 8.2 `perfectSqrt`：判断"完全平方数"并给出平方根

**逻辑与 §7.2 的 `boxSizeOf` 完全一样**（先 `round` 再平方回验），区别只是这里返回**平方根本身**、更贴合解析语义。
> **一个诚实的观察**：这属于"同一算法出现两处"。严格按"算式只有一份"的理念，第二处（`perfectSqrt(side)` 的非空判断）本可复用 `shape.boxSizeOf`。当前写法**不影响正确性**（R2 允许 core 内部互相依赖），只是将来改算法要记得改两处。**能识别出这种"可收口点"，就是读代码的水平。**

### 8.3 `parseNumBoard`：**四道关卡**（顺序有讲究）

| 关卡 | 代码 | 拦住什么输入 | 为什么必要 |
|---|---|---|---|
| ① | `parseNumArray(str)` | 空串、含字母、含小数 | 防止 `NaN` 流进后续计算 |
| ② | `perfectSqrt(nums.length)`（得 `S`） | 个数不是完全平方数（如 100 个） | 切不成方阵 |
| ③ | `perfectSqrt(side) === null` | **个数是平方数、但 `S` 不是完全平方数** | 数独要求 `S = B²` → **总格数必须是"四次方数"** |
| ④ | `n < 0 \|\| n > side` | 出现负数或大于 `S` 的数字 | 数字必须落在 `0 ~ S`，否则规则全乱 |

**关卡③ 是数独特有的一道（很多人会漏）**：81 个格子合法，因为 `81 = 9²` 且 `9 = 3²`；但 **36 个格子的"6×6 盘面"不合法**（`6` 不是完全平方数 → 没有整数宫边长）。
**这也解释了"支持 4×4 / 9×9 / 16×16 / 25×25 / 36×36（B=2..6）"是怎么落地的** —— 不是枚举白名单，而是**用数学关系判定**，所以 `B = 7~10`（49/64/81/100）**自动也被支持**。

### 8.4 `boardToStr`：盘面 → 字符串（空格分隔）

```ts
board.flat().join(' ')     // 9×9 → "0 0 5 0 ..."（81 个数字）
```
**必须与 `parseNumArray` 的分隔符约定匹配**（空格在 `[\s,，]+` 里）。
**用途**：导出题面串（`useGameFlow` 的导出遮罩）、后端入库前的归一化（`checkPuzzle` 存的是 `puzzleText.trim()`）。
**往返特性**：
- `parseNumBoard(boardToStr(g))` **一定能还原 `g`**；
- **反过来不保证逐字符相同**（用户可能用逗号、多空格粘进来）→ 所以本项目**展示/存储用归一化后的串**（`trim` + `boardToStr`），而不是保留用户原始格式。

### 8.5 `parsePuzzle`：解析 + 顺带算出 `boxSize`

**为什么返回 `{ board, boxSize }` 而不是只给盘面**：调用方（出题页 / 自定义页 / 后端 `checkPuzzle`）**下一步几乎必然需要 `B`**（算比例、算候选、判空宫/空行）。
一次算好给出去，**避免每个调用方各自 `boxSizeOf(board.length)`** —— 这就是"**在边界处完成归一化**"的思路：解析函数一次把"数据 + 它的形状"给全。

**谁在调用它**（前向引用）：

| 调用方 | 用途 |
|---|---|
| `functions/utils/puzzle.ts` 的 `checkPuzzle` | 服务端复校：题面与答案都要先 `parsePuzzle`（02 册 §5.5） |
| `usePuzzleStage` / `useCustomFlow` / `useSolveFlow` | 用户粘贴题面时的即时校验与初始化（06 册） |
| `stores/game` | 开局：`parsePuzzle(text).board` → `fromPuzzle(...)` 得到可玩盘（05 册） |

**改坏了会怎样**：把关卡④的 `n > side` 误写成 `n > 9` → **只有 9×9 能过**，16×16 的题目（数字最大 16）会被判定为非法 → 表现是"大棋盘粘贴后提示格式错误"。**这种"硬编码看常数"的 bug，只有理解了 `B → S` 的关系才能一眼看出。**

---

## 9. `core/sudoku/rules.ts`（178 行 · 2 个导出）—— 数独规则的唯一实现

**① 这个文件是干嘛的**：**整个项目里最重要的一个文件**。它定义"什么叫做合法数独"：行列宫冲突、候选数、判胜、题面校验。
**它被谁用**：

| 使用者 | 用它的什么 |
|---|---|
| `stores/game`（游玩） | `getSudoku(B).findConflicts(盘面)` → 高亮冲突格；`isSolved` 判胜 |
| `useGameFlow`（提示按钮） | `getSudoku(B).getCandidates(盘面, 选中格)` |
| `solver` / `multiSolver` | `hasConflict`（入口检查）、`S`/`B` |
| `generator` | `S`/`B`（生成时的尺寸） |
| `functions/utils/puzzle.ts`（**后端**） | `hasEmptyGroup` + `validatePuzzle` —— **服务端复校用同一套规则** |

**导出只有 2 个**：`createSudoku`（工厂）与 `getSudoku`（带缓存的工厂入口）—— 其余 11 个能力都挂在返回的对象上（R9 的"core 单文件导出 2~8 个"在这里体现为"**一个工厂 + 一个缓存入口**"）。

### 9.1 为什么是"工厂函数"而不是一堆全局函数

```ts
export const createSudoku = (boxSize: number): Sudoku => {
    const B = boxSize
    const S = sideOf(B)
    // … 内部所有函数都直接用 B 和 S …
    return { S, B, getCandidates, isSolved, findConflicts, hasConflict, hasEmptyGroup, validatePuzzle, makeEmptyBoard, makeEmptyMask }
}
```

**知识点：用闭包"固化配置"**。
如果写成全局函数，每个函数都得带 `boxSize` 参数：

```ts
// ❌ 假想写法：B 到处传
findConflicts(grid, boxSize)
getCandidates(grid, pos, boxSize)
```

**工厂写法的三个好处**：
1. **调用方少传一个参数**，且不可能"传错尺寸"（同一个 `sudoku` 实例永远对应同一个 `B`）；
2. **`S` / `B` 只算一次**（`sideOf(B)` 不重复计算）；
3. **前后端复用同一份规则**：后端 `checkPuzzle` 里就是 `getSudoku(boxSize)` 然后调方法（02 册 §5.5）。

**为什么还要 `getSudoku`**：工厂每次都建一批新闭包 + 新的 `S/B`；而**同一个 `boxSize` 的规则对象完全可以复用**（它是无状态的），所以外层加一个 `Map` 缓存（§9.10，也是 R11 的例外 E1）。

### 9.2 `findGroupConflicts`：从"一组格子"里找出重复数字

```ts
const findGroupConflicts = (grid: NumBoard, cells: Position[]): Position[] => {
    const map = new Map<number, Position[]>()
    for (const [r, c] of cells) {
        const v = grid[r][c]
        if (v === 0) continue                                   // ① 空格不参与
        if (!map.has(v)) map.set(v, [])                         // ② 没见过 → 先建空数组
        map.get(v)!.push([r, c])                                // ③ 记下这个位置
    }
    const conflicts: Position[] = []
    for (const ps of map.values()) {
        if (ps.length > 1) conflicts.push(...ps)                // ④ 重复 ≥2 → 全是冲突
    }
    return conflicts
}
```

**逐行**：

| # | 代码 | 说明 |
|---|---|---|
| ① | `if (v === 0) continue` | **0 是空格**，多个空格不算冲突（这是整个数独逻辑的基石约定） |
| ② | `if (!map.has(v)) map.set(v, [])` | 用 `Map<数字, 位置数组>` 统计"每个数字出现在哪些格子" |
| ③ | `map.get(v)!.push([r, c])` | `!` 告诉 TS"我刚 `set` 过，一定存在"（00 册 §4.8） |
| ④ | `if (ps.length > 1) conflicts.push(...ps)` | 某数字出现 ≥2 次 → **这些位置全是冲突格**（**全部返回**，不是只报一个） |

**为什么返回"全部冲突位置"而不是 `boolean`**：上层要**把冲突格画成红底**（`BOARD_COLOR.conflictBg`）。
如果只返回"有冲突"，渲染层就无法知道"哪几格红了" —— 这就是"**返回信息要够用**"的设计原则（`hasConflict` 才是布尔版，见 §9.6）。

**复杂度**：设这组有 `n` 个格子（行/列/宫分别是 `S`/`S`/`B²`）→ **O(n)**（`Map` 的 `has/get/set` 都是 O(1)）。
**边界**：全是空格 → 每个 `v === 0` 都 `continue` → `map` 空 → 返回 `[]` ✅。

### 9.3 三个生成器 + `allGroups`：把"行/列/宫"变成可遍历的序列

```ts
function* allRows(): Generator<Position[]> {
    for (let r = 0; r < S; r++) {
        const cells: Position[] = []
        for (let c = 0; c < S; c++) cells.push([r, c])
        yield cells
    }
}

function* allCols(): Generator<Position[]> {
    for (let c = 0; c < S; c++) {
        const cells: Position[] = []
        for (let r = 0; r < S; r++) cells.push([r, c])
        yield cells
    }
}

function* allBoxes(): Generator<Position[]> {
    for (let br = 0; br < S; br += B) {                 // 宫的左上角行（步长 B）
        for (let bc = 0; bc < S; bc += B) {             // 宫的左上角列（步长 B）
            const cells: Position[] = []
            for (let i = 0; i < B; i++)
                for (let j = 0; j < B; j++)
                    cells.push([br + i, bc + j])          // 宫内的 B×B 个格
            yield cells
        }
    }
}

/** 生成行、列、宫格等位置组 */
function* allGroups(): Generator<Position[]> {
    yield* allRows()      // 先所有行
    yield* allCols()      // 再所有列
    yield* allBoxes()     // 再所有宫
}
```

**为什么用生成器（`function*` + `yield`）**（00 册 §3.9 已讲过原理，这里看它的收益）：

| 返回 `Position[][]` | 生成器 |
|---|---|
| 一次把 `S` 行 + `S` 列 + `S` 宫（9 阶 = **27 组、243 个坐标对**）全建出来 | **用到才建下一组** |
| 调用方要自己写"三套遍历 + 顺序" | `for (const group of allGroups())` 一行，**顺序被封在函数里** |

**`allBoxes` 的循环写法**（容易写错的地方）：

```ts
for (let br = 0; br < S; br += B)         // br = 0, 3, 6（9 阶）
    for (let bc = 0; bc < S; bc += B)     // bc = 0, 3, 6
        // 宫内格：[br + i, bc + j]（i, j ∈ [0, B)）
```
**注意是 `br += B` 而不是 `br++`**：宫是"每隔 B 行开始一个"。写错成 `br++` → 会枚举出 9×9 个重叠的"伪宫" → 判定结果完全错（这个 bug 会让正常盘面被判成有冲突）。
**宫的数量**：`(S/B)² = B²` 个（9 阶是 9 个宫，正好等于 `S`）—— 这就是为什么 `boxIndexAt`（§3.6）的取值是 `0 ~ B²-1`。

**`allGroups` 的顺序有意义吗**：有（**性能**层面）：
`hasConflict` 是"发现即返回"，所以**先查行**（最容易出现冲突、且连续内存访问快）→ 大概率第一轮就返回 `true`；而 `findConflicts` 必须走完全部组（要标出所有冲突格），所以顺序对它无影响。

### 9.4 `getCandidates`：某一格还能填哪些数字（**"提示"按钮的核心**）

```ts
const getCandidates = (grid: NumBoard, [r, c]: Position): number[] => {
    if (grid[r][c] !== 0) return []                          // ① 已填 → 无候选

    // 用一个标记数组记录哪些数字已用（比 Set 快，零哈希开销）
    const used = new Array(S + 1).fill(false)                 // ② 下标 1..S

    // 行 + 列：一次循环搞定
    for (let i = 0; i < S; i++) {                            // ③
        if (grid[r][i] !== 0) used[grid[r][i]] = true          //    同行
        if (grid[i][c] !== 0) used[grid[i][c]] = true          //    同列
    }
    // 宫（宫起点来自 core/board/metrics，避免各处重算）
    const [sr, sc] = boxOriginOf(r, c, B)                     // ④
    for (let i = sr; i < sr + B; i++) {
        for (let j = sc; j < sc + B; j++) {
            if (grid[i][j] !== 0) used[grid[i][j]] = true
        }
    }

    const res: number[] = []                                  // ⑤
    for (let n = 1; n <= S; n++) {
        if (!used[n]) res.push(n)
    }
    return res
}
```

**逐块**：

| # | 块 | 说明 |
|---|---|---|
| ① | `if (grid[r][c] !== 0) return []` | **已经填了的格子没有"候选"** → 返回空数组（提示按钮会说"无法更改初始题目"之类） |
| ② | `new Array(S + 1).fill(false)` | **标记数组**，下标 `1~S`（第 0 位空着不用，这样 `used[v]` 与"数字 v"一一对应，不用 `-1` 换算） |
| ③ | **行列一次循环** | 走 `i = 0..S-1`，同时读 `grid[r][i]`（行）和 `grid[i][c]`（列）→ **两次遍历合成一次，cache 友好** |
| ④ | 宫 | 用 `boxOriginOf` 拿宫左上角，再扫 `B×B` |
| ⑤ | 收集 | 从 1 到 S 挑没被标记的 |

**注释里那句"比 Set 快，零哈希开销"值得展开**：
- `Set<number>` 的 `add/has` 需要**哈希**（虽然对整数很快，但仍有函数调用 + 桶查找）；
- `boolean[]` 是**数组下标访问**，几乎就是一条内存寻址指令；
- 而且 `used` 的长度固定 `S+1`，**一次分配**（在 `getCandidates` 里就是 O(S) 内存，S ≤ 100 完全可忽略）。

**复杂度**：`O(S)`（行列）+ `O(B²)`（宫）= `O(S + B²)`；对 9 阶是 `9 + 9 = 18` 次访问，非常快。
**边界**：格子坐标非法（`r/c` 越界）→ `grid[r][c]` 会是 `undefined`，`undefined !== 0` 为真 → 返回 `[]`（**不会崩，但也不正确**）。所以**调用方必须先保证坐标合法** —— 本项目里坐标只来自点击换算（`offsetToCell` 已做越界检查，§3.4）。
**谁在用**：`useGameFlow` 的"💡 提示"（`gameStore.getCandidates(selected)` → `hintTextOf`）、store 里的候选展示。

### 9.5 `makeEmptyBoard` / `makeEmptyMask`：两个"干净的初始盘"

```ts
const makeEmptyBoard = (): Board => makeGrid<Cell>(S, () => makeCell(0, false))
const makeEmptyMask = (): ConflictMask => makeGrid<boolean>(S, () => false)
```

**为什么要暴露这两个**（而不是让调用方自己 `makeGrid`）：
- **尺寸一致性**：调用方不需要知道 `S`（从 `sudoku` 实例拿就行），也不会写错尺寸；
- **语义清晰**：`makeEmptyBoard()` 一看就知道"格盘、全 0、全不锁"；`makeEmptyMask()` 是"冲突掩码全 false"；
- **`makeGrid` 的工厂函数在这里是必需的**（§2.2）：`() => makeCell(0, false)` 保证 `S×S` 个**独立**的 `Cell` 对象。

**谁在用**：
- `gameStore` 开新局时建盘；
- `findConflicts` 内部建掩码（§9.6）。

### 9.6 `findConflicts` vs `hasConflict`：同一逻辑的"完整版"与"短路版"

```ts
/** 找出所有冲突格 */
const findConflicts = (grid: NumBoard): ConflictMask => {
    const mask: ConflictMask = makeEmptyMask()
    for (const group of allGroups()) {
        for (const [r, c] of findGroupConflicts(grid, group)) {
            mask[r][c] = true
        }
    }
    return mask
}

/** 盘面是否存在任何冲突（发现即返回，不构造整张掩码） */
const hasConflict = (grid: NumBoard): boolean => {
    for (const group of allGroups()) {
        if (findGroupConflicts(grid, group).length) return true
    }
    return false
}
```

**对比**：

| | `findConflicts` | `hasConflict` |
|---|---|---|
| 返回 | `boolean[][]`（**哪几格冲突**） | `boolean`（**有没有冲突**） |
| 遍历 | **必须走完** 27 组 | **发现即 `return true`**（短路） |
| 额外开销 | 建一张 `S×S` 掩码 | 无 |
| 用在哪 | 游玩页**画红底** | solver/multiSolver/digger/后端的**入口校验**、`isSolved` 判胜 |

**这就是"同一逻辑分两个函数"的正当理由**：调用方需求不同（一个要"位置明细"，一个只要"是否"），**各取所需，避免"为了省一个函数而让所有调用方都付全量遍历的代价"**。
> 注释里那句"发现即返回，不构造整张掩码"就是在说明这个取舍 —— **写代码时把这种取舍写在注释里，比什么注释都有用。**

**性能数量级**：9 阶盘面（81 格）→ `findConflicts` 约 243 次格子访问 + 掩码分配；`hasConflict` 在"第一行就冲突"时只需 9 次访问。
**注意它对"全空盘"的表现**：所有 `v === 0` 都跳过 → `hasConflict` 返回 `false`（**全空不算冲突**，这是对的：空盘本来就没有冲突可言）；而 `isSolved` 会先看 `isFull`（§9.7）→ 所以空盘不会被判成"已完成"。

### 9.7 `hasEmptyGroup`：有没有"整行/整列/整宫全空"

```ts
/**
 * 是否有整行 / 整列 / 整宫全为 0 —— 只给「手选题面」的提交用
 * （行/列/宫的定义就在上面的 allGroups()，不另写一套；`?.` 防不规则输入越界）
 */
const hasEmptyGroup = (grid: NumBoard): boolean => {
    for (const group of allGroups()) {
        if (group.every(([r, c]) => grid[r]?.[c] === 0)) return true
    }
    return false
}
```

**三个知识点**：

1. **`group.every(...)` 全为 0 才成立** —— 注意与 `isBlankBoard`（§5.2，**整盘**全空）的区别：这里是**任意一组**全空。
2. **`grid[r]?.[c]` 的可选链**：如果传入的 `grid` 行数不足（**不规则输入**，比如只有 5 行），`grid[r]` 是 `undefined` → `?.` 短路 → 整体得 `undefined` → `undefined === 0` 为 `false` → 这一组"不算全空"。
   **没有 `?.` 会怎样**：`TypeError: Cannot read properties of undefined (reading '0')` → 500 错误。**这就是"防御不规则输入"的最小代价写法**。
3. **为什么"行/列/宫的定义不另写一套"**：直接复用 `allGroups()`（§9.3）→ 如果将来"宫"的定义变了，这里自动跟着变。**注释专门写这句，是提醒后人别在这里手写第二套遍历。**

**为什么只给"手选题面"用**（注释原文）：
- **系统生成**的题面由 `digPuzzle` 保证"每行/每列/每宫至少留 1 个数"（§14）→ 不可能出现空组，**不需要校验**；
- **手选/粘贴**的题面**可能**出现整行空 → 必须拦（否则这题在游玩时会出现"某一行完全没有线索"的退化情况）。

**谁在用**：前端 `message.puzzleSubmitErrorOf`（出题/编辑提交）、**后端 `functions/utils/puzzle.ts` 的 `checkPuzzle`**（服务端复校同一套规则）。

### 9.8 `isFull` / `isSolved` / `isSubset` / `sameShape` / `validatePuzzle`

```ts
/** 检查棋盘有没有填满 */
const isFull = (grid: NumBoard): boolean => grid.every(row => row.every(v => v !== 0))

/** 检查是否完成，即每个格子都填了且无冲突 */
const isSolved = (grid: NumBoard): boolean => isFull(grid) && !hasConflict(grid)

/** 检验题目是不是答案的子集 */
const isSubset = (puzzle: NumBoard, solution: NumBoard): boolean =>
    puzzle.every((row, r) => row.every((v, c) => v === 0 || v === solution[r][c]))

/** 两个盘面是否同形（行列都相同）—— 防 validatePuzzle 对不规则输入取越界下标 */
const sameShape = (a: NumBoard, b: NumBoard): boolean =>
    a.length === b.length && a.every((row, r) => row.length === b[r].length)

/** 检验出题的题目和答案 */
const validatePuzzle = (puzzle: NumBoard, solution: NumBoard): boolean => {
    if (!sameShape(puzzle, solution)) return false
    if (hasConflict(puzzle)) return false
    if (!isSubset(puzzle, solution)) return false
    if (!isSolved(solution)) return false
    return true
}
```

**逐个讲**：

| 函数 | 语义 | 关键点 |
|---|---|---|
| `isFull` | 没有 0 | `every` 短路：第一个空格就返回 `false` |
| `isSolved` | **填满 + 无冲突** | **顺序是先 `isFull` 再 `hasConflict`**：`isFull` 便宜（最坏 O(S²) 但一遇空格就停），`hasConflict` 贵（建 Map、遍历 27 组）→ **便宜的先查**（短路优化） |
| `isSubset` | 题面的每个非 0 格都与答案相同 | `v === 0 \|\| v === solution[r][c]` —— **空格跳过，非 0 必须一致** |
| `sameShape` | 行列数都相同 | **`a.length === b.length` 先判断**，这也是它安全的唯一原因：只有长度相等才会去读 `b[r]`（否则 `b[r].length` 会抛 TypeError） |
| `validatePuzzle` | **出题校验的四连问** | 顺序即优先级，见下 |

**`validatePuzzle` 的四步顺序为什么不能乱**：

```
① sameShape(puzzle, solution)   ← 必须最先：它保证后面按 r/c 取下标是安全的（否则越界读 undefined）
② hasConflict(puzzle)           ← 题面自身不能有冲突（两个相同数字在同一行/列/宫）
③ isSubset(puzzle, solution)    ← 题面的每个已知数字必须与答案一致（防"题面与答案对不上"）
④ isSolved(solution)            ← 答案必须是一个"填满且无冲突"的完整终盘
```
**缺任何一条会怎样**：
- 缺 ① → 不规则输入下**抛异常**（500）；
- 缺 ② → 题面里放两个 5 在同一行也能提交，玩家一进来就看到红底冲突；
- 缺 ③ → 题面写 5、答案是 7，玩家永远无法完成；
- 缺 ④ → 答案本身有重复（不是合法终盘），题目"无解"。

> **这段代码是"校验要成组、且顺序要对"的教科书例子**：单看每个函数都很简单，**价值在于组合方式**。前端 `checkPuzzle`（02 册 §5.5）与后端 `checkPuzzle` 都是调它。

### 9.9 工厂返回的对象（11 个成员）—— `Sudoku` 契约

```ts
return {
    S, B,
    getCandidates,
    isSolved, findConflicts, hasConflict,
    hasEmptyGroup,
    validatePuzzle,
    makeEmptyBoard, makeEmptyMask
}
```

| 成员 | 类型 | 用途 |
|---|---|---|
| `S` | `number` | 盘面边长（画布网格用、`slice` 用） |
| `B` | `number` | 宫边长（`boxOriginOf` / `boxIndexAt` 用） |
| `getCandidates` | `(grid, pos) => number[]` | 提示按钮、候选显示 |
| `isSolved` / `isFull`（内部） | `(grid) => boolean` | 判胜（游戏页通关遮罩） |
| `findConflicts` | `(grid) => ConflictMask` | 画红底 |
| `hasConflict` | `(grid) => boolean` | 各处入口校验（solver / 后端） |
| `hasEmptyGroup` | `(grid) => boolean` | 手选题面提交校验 |
| `validatePuzzle` | `(puzzle, solution) => boolean` | 出题/编辑提交校验（前后端共用） |
| `makeEmptyBoard` / `makeEmptyMask` | `() => Board / ConflictMask` | 造初始盘 |

**这个契约手写在 `types/sudoku.ts`**（不是从 `core` 推导来的）—— 因为 `types/` 是叶子层（R13），不能依赖 `core` 的实现（03 册 §3.2 ②）。

### 9.10 `getSudoku`：带缓存的入口（**R11 的例外 E1 就在这**）

```ts
/** 按 boxSize 缓存的 Sudoku 实例 */
const cache = new Map<number, Sudoku>()

export const getSudoku = (boxSize: number): Sudoku => {
    const cached = cache.get(boxSize)
    if (cached) return cached

    const created = createSudoku(boxSize)
    cache.set(boxSize, created)
    return created
}
```

**① 为什么需要缓存**：`getSudoku(B)` 的调用非常频繁（每次落子都要 `findConflicts`、每次点提示都要 `getCandidates`），而 `createSudoku` 每次都要建 **11 个闭包 + 3 个生成器函数 + 算一次 `S`**。
**知识点名**：这叫**记忆化（memoization）** —— "把纯函数的入参 → 结果记下来，下次直接取"。

**② 为什么这样做是安全的**（这是 E1 登记的理由）：
`Sudoku` 实例**没有可变状态**（`S`/`B` 是常量，所有方法只用传入的 `grid`）→ **同一个 `boxSize` 复用同一个实例，对任何入参的可观察行为完全一致**。
> 03 册 §5 的 E1 原文：*"模块级 Map 记忆化（对入参可观察等价于纯函数）"* —— **这就是"例外要说明理由"的标准写法**：不是"我不管 R11 了"，而是"这个 Map 不影响纯度"。

**③ 为什么它会被 R11 盯上**：R11 禁止 `core` 出现**模块级可变状态**（顶层 `let`/`Map`/`Set`），因为这种状态**会让用例互相串味**。
这里的 `cache` 确实会在"测试之间"保留数据 —— 但因为它**只影响性能、不影响结果**，所以登记为合法例外（`CORE_STATE_EXEMPT = ['src/core/sudoku/rules.ts']`）。

**④ 边界与使用约定**：
- **不校验 `boxSize`**：传 `0` 会缓存一个 `S = 0` 的实例（调用方保证合法：`B` 来自下拉项 / `parse` 的校验）；
- **只增不减**：`Map` 最多缓存 `B = 2..10` 共 9 个实例（内存可忽略）；
- **消费方应一律走 `getSudoku`**，不要直接调 `createSudoku`（否则失去缓存）—— 项目里 `createSudoku` 导出只是为了"可测试/可显式构造"，业务代码全用 `getSudoku`。

---

## 10. `core/sudoku/tracker.ts`（127 行 · 1 个导出）—— 回溯的"候选簿记器"

**① 这个文件是干嘛的**：它是**求解速度的关键**。回溯算法每次落子都要知道"哪些格子的候选被影响、每个空格还剩几个候选"。
朴素做法是"每次递归都重新扫一遍全盘算候选"（代价 `O(S² × S)`）；**簿记器把这件事变成增量维护**：落子时只更新"同行/同列/同宫"的格子，撤销时精确回滚。

**导出只有 1 个** `createTracker`（R9 允许"唯一入口模块"：单导出 + ≥50 行）。

### 10.1 数据结构：三张"已用表" + 三维"候选表" + 二维"计数表"

```ts
/** 一条落子记录：哪个格子的哪个候选被删了（本文件私有，不外泄） */
interface Change { r: number; c: number; n: number }

export const createTracker = (S: number, B: number, grid: NumBoard) => {
    /** rowUsed[r][n] = 第 r 行已用数字 n */
    const rowUsed: boolean[][] = Array.from({ length: S }, () => new Array(S + 1).fill(false))
    const colUsed: boolean[][] = Array.from({ length: S }, () => new Array(S + 1).fill(false))
    const boxUsed: boolean[][] = Array.from({ length: S }, () => new Array(S + 1).fill(false))

    /** cand[r][c][n] = (r,c) 可填 n；count[r][c] = 候选个数（供 MRV 快速比较） */
    const cand: boolean[][][] = Array.from({ length: S }, () =>
        Array.from({ length: S }, () => new Array(S + 1).fill(false)))
    const count: number[][] = Array.from({ length: S }, () => new Array(S).fill(0))
```

**逐个看**：

| 结构 | 维度 | 含义 | 为什么这么设计 |
|---|---|---|---|
| `rowUsed[r][n]` | `S × (S+1)` | 第 `r` 行用了数字 `n` 吗 | **下标即数字**（`n` 从 1 到 S，第 0 位不用）→ 判断"能不能放"是 O(1) 数组读 |
| `colUsed[c][n]` | 同上 | 第 `c` 列 | 同上 |
| `boxUsed[b][n]` | 同上 | 第 `b` 号**宫** | `b` 由 `boxIndexAt(r,c,B)` 算出（§3.6）→ **用一维数组代表"宫"，省掉二维宫坐标** |
| `cand[r][c][n]` | `S × S × (S+1)` | 这一格能不能填 `n` | 空间 `O(S³)`：9 阶 = 729 个布尔（≈0.7KB），16 阶 = 4096（可接受） |
| `count[r][c]` | `S × S` | 这一格**还剩几个**候选 | **MRV 的加速器**：比较"谁候选最少"只需读 `count`，不用遍历 `cand` 数一遍 |

**知识点：为什么 `new Array(S + 1)` 而不是 `S`** —— 让"数字 `n`"直接当下标（1-based），省掉到处 `-1` 的换算。这是本项目反复出现的约定（`used[grid[r][i]] = true` 同理，§9.4）。

**为什么用 `Array.from({length}, () => ...)` 造二维/三维**：`fill(new Array(S+1).fill(false))` 会让**所有行共享同一个数组**（§2.2 的坑）→ 必须每层都用工厂函数。

### 10.2 初始化：**两趟扫描**（顺序不能反）

```ts
    // ---------- 用现有盘面初始化 ----------
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            const v = grid[r][c]
            if (v === 0) continue
            rowUsed[r][v] = true
            colUsed[c][v] = true
            boxUsed[boxIndexAt(r, c, B)][v] = true
        }
    }
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            if (grid[r][c] !== 0) continue
            const b = boxIndexAt(r, c, B)
            let left = 0
            for (let n = 1; n <= S; n++) {
                if (!rowUsed[r][n] && !colUsed[c][n] && !boxUsed[b][n]) {
                    cand[r][c][n] = true
                    left++
                }
            }
            count[r][c] = left
        }
    }
```

**第一趟**：把盘面上**已有的数字**登记到三张 `used` 表（空格跳过）。
**第二趟**：为每个**空格**算候选 —— 某个数字 `n` 合法 ⟺ **该行没用过、该列没用过、该宫没用过**（三个条件同时成立），同时用 `left` 累计个数写进 `count`。

**为什么必须两趟**：算候选需要"**完整的**已用信息"。如果一趟搞定，就会遇到"后面的数字还没登记，前面格子的候选算多了"的错误。
**复杂度**：第一趟 `O(S²)`；第二趟 `O(S² × S) = O(S³)`（9 阶 729 次、16 阶 4096 次）—— **只在求解开始时做一次**，可接受。

### 10.3 `pickCell`：MRV 挑格 + `full` / `dead` 判别

```ts
    /** MRV：候选最少的空格。full = 已无空格；dead = 出现 0 候选（死路，需回溯） */
    const pickCell = (): { r: number; c: number; full: boolean; dead: boolean } => {
        let minCount = S + 1
        let bestR = -1
        let bestC = -1

        for (let r = 0; r < S; r++) {
            for (let c = 0; c < S; c++) {
                if (grid[r][c] !== 0) continue          // 已填 → 跳过
                const cnt = count[r][c]
                if (cnt === 0) return { r: -1, c: -1, full: false, dead: true }   // ① 死路
                if (cnt < minCount) {
                    minCount = cnt
                    bestR = r
                    bestC = c
                    if (cnt === 1) break                // ② 内层提前退出
                }
            }
            if (minCount === 1) break                    // ② 外层提前退出
        }

        if (bestR === -1) return { r: -1, c: -1, full: true, dead: false }        // ③ 全填满
        return { r: bestR, c: bestC, full: false, dead: false }
    }
```

**知识点：MRV（Minimum Remaining Values，最少候选优先）**

> **策略**：每次都填"**候选最少的那个空格**"。

**为什么它让求解快了一个数量级**：
- 候选只有 1 个的格子**没得选**（填它不会产生分支）；
- 候选少的格子**先填**，一旦填错，**很快就撞死**（立刻回溯）→ 也就是"**早发现失败**"；
- 如果反过来先填候选最多的格子（比如 9 种可能），会**白白展开一棵巨大的搜索树**才开始发现问题。

**逐行**：

| # | 代码 | 说明 |
|---|---|---|
| ① | `if (cnt === 0) return { …, dead: true }` | 某个空格**一个数都填不了** → 当前分支必失败，立即告诉调用方"回溯" |
| ② | `if (cnt === 1) break`（内外两层） | **提前退出优化**：候选数最小可能值是 1（0 已经在①返回了），所以**找到 1 就不用再扫** |
| ③ | `if (bestR === -1) return { full: true }` | 扫完一遍**一个空格都没遇到** → 盘面已填满（`full`），可以判定解出来了 |

**这个返回值设计很讲究**（`{ r, c, full, dead }` 四元组）：**一次扫描同时回答了三个问题** ——
"有没有解出来（`full`）"、"是不是死路（`dead`）"、"下一步该填哪（`r,c`）"。
调用方（`solver.ts`）因此只需要三行判断，不用自己遍历（§11）。

**复杂度**：最坏 `O(S²)`（全扫一遍），但 ② 让它**通常远小于此**（尤其在搜索后期，候选为 1 的格子很多）。

### 10.4 `candidatesOf`：取某格当前候选（未洗牌）

```ts
    /** 该格当前可填数字（未洗牌） */
    const candidatesOf = (r: number, c: number): number[] => {
        const list: number[] = []
        for (let n = 1; n <= S; n++) if (cand[r][c][n]) list.push(n)
        return list
    }
```

**注意两点**：
1. **它是从 `cand` 表里读的**（不是重新扫行列宫）→ 这就是簿记器的收益：**O(S)** 而不是 O(S + B²)；
2. **"未洗牌"写在注释里** → 洗牌是调用方的事（`solver.ts` 里 `shuffle(list, rng)`），因为随机源要由调用方注入（R3）。**职责边界写清楚，读代码时就不会到处找"随机在哪生成"**。

**返回值是"新数组"**（`list` 是本地新建的）→ 调用方可以放心 `shuffle(list, rng)`（`shuffle` 是原地修改，见 §2.1）而**不会破坏 `cand` 表**。

### 10.5 `place`：落子 + 记账 + **返回撤销闭包**（本册最精妙的一段）

```ts
    /** 落子：写 grid + 删掉同行/列/宫空格里的该候选；返回撤销函数 */
    const place = (r: number, c: number, n: number): (() => void) => {
        const changes: Change[] = []
        const b = boxIndexAt(r, c, B)
        grid[r][c] = n
        rowUsed[r][n] = true
        colUsed[c][n] = true
        boxUsed[b][n] = true

        /** 空格 (i,j) 去掉候选 n（改候选 + 记账，撤销时按 changes 回滚） */
        const drop = (i: number, j: number): void => {
            if (grid[i][j] !== 0 || !cand[i][j][n]) return      // ① 只处理"确实要删"的
            cand[i][j][n] = false
            count[i][j]--
            changes.push({ r: i, c: j, n })                     // ② 记账
        }

        for (let i = 0; i < S; i++) {
            if (i !== c) drop(r, i)      // 同行空格
            if (i !== r) drop(i, c)      // 同列空格
        }
        // 同宫空格（宫起点来自 core/board/metrics）
        const [sr, sc] = boxOriginOf(r, c, B)
        for (let i = sr; i < sr + B; i++) {
            for (let j = sc; j < sc + B; j++) {
                if (i !== r || j !== c) drop(i, j)
            }
        }

        return () => {                                          // ③ 撤销闭包
            for (const ch of changes) {
                cand[ch.r][ch.c][ch.n] = true
                count[ch.r][ch.c]++
            }
            rowUsed[r][n] = false
            colUsed[c][n] = false
            boxUsed[b][n] = false
            grid[r][c] = 0
        }
    }

    return { pickCell, candidatesOf, place }
}
```

**分成三块看**：

**① 前置写入（4 行）** —— 把这一格**真的填上**：
```ts
grid[r][c] = n; rowUsed[r][n] = true; colUsed[c][n] = true; boxUsed[b][n] = true
```
**注意 `grid` 是被"就地修改"的**：注释里写了"引擎就地改 grid（调用方传自己的副本）"（§11）—— **所以调用方必须传副本**，否则会污染调用方的盘面。

**② `drop`：删候选（带两个守卫）** —— 落子后，同行/同列/同宫的空格**不能再填 `n`**：

| 守卫 | 含义 | 为什么 |
|---|---|---|
| `grid[i][j] !== 0` | 这一格已经填了 → 不用管 | 已填格没有"候选"这个概念 |
| `!cand[i][j][n]` | 这个候选**本来就没了** → 不用再删 | **避免重复扣 `count`**（同一格可能被"行"和"宫"两次扫到！） |

> **第二个守卫是关键**：扫同行时会 `drop` 到某格，扫同宫时又可能 `drop` 到它。如果没这个判断，`count` 会被扣两次 → MRV 判断全错 → 求解结果错误（**而且是"有时对有时错"的隐蔽 bug**）。
> **`changes.push(...)` 也是同理**：只记真正发生的删除，撤销时才能精确回滚。

**`if (i !== c)` / `if (i !== r)` 是跳过自己**：自己已被 `grid[r][c] = n` 填上，`drop` 的第一个守卫（`grid[i][j] !== 0`）本来也会挡掉它 —— **这里显式跳过只是省一次函数调用**（不过它让代码更啰嗦，属于"可读性 vs 微优化"的取舍）。

**③ 撤销闭包：为什么是"返回函数"而不是"另一个 undo 方法"**

```ts
return () => {
    for (const ch of changes) { cand[ch.r][ch.c][ch.n] = true; count[ch.r][ch.c]++ }
    rowUsed[r][n] = false; colUsed[c][n] = false; boxUsed[b][n] = false
    grid[r][c] = 0
}
```

**这才是本段的精髓**：

- **`changes` 是每次 `place` 自己的局部数组** → **天然支持多层嵌套**：递归第 3 层撤销时，只回滚第 3 层删掉的那些候选；
- **撤销顺序无关**（`cand[n] = true` 与 `count++` 都是恢复性操作，`drop` 时是"删一格候选"，撤销是"加回一格候选"，一一对应）；
- **调用方代码变得极简**（`solver.ts`）：

```ts
const undo = place(r, c, n)
dfs()          // 递归探索
undo()         // 无论成败都回滚 → 恢复现场
```
**对比"用栈保存整盘快照"的做法**：快照法每次落子要复制整个盘面（`O(S²)`），而**闭包记账只记录"被改动的那几处"**（`O(S + B²)`），并且在深层递归里**内存占用与搜索深度成正比、而不是与盘面大小成正比**。

**这就是 E7 登记的内容**（03 册 §5）：
> *"`core/sudoku/tracker.ts` 的 `place()` 返回闭包撤销函数（撤销记录不跨模块，`Change` 保持私有）"*
登记的原因是：**`Change` 类型不外泄**（它是这个文件的私有实现细节，不需要进 `types/`）；**撤销函数也不出模块**（由 `solver.ts` 在同一次调用内立即使用）。所以它不违反"数据与行为分离"的设计。

### 10.6 正确性自检（你可以这样验证）

| 检查点 | 怎么验 |
|---|---|
| `place` 后 `count` 只被扣了一次 | 造一个"同行 + 同宫重叠"的格子（例如同一行且同一宫的相邻格），落子后看它的 `count` 减少了 1 |
| `undo` 完全恢复 | 连续 `place` / `undo` 若干次后，`cand`、`count`、`grid` 应该与初始完全一致（写个测试最直观） |
| MRV 不破坏搜索完整性 | 求解结果与"每次重算候选的朴素版"一致（这是最有力的验证：**优化不改结果**） |

**性能小结**（9 阶）：

| 操作 | 朴素实现 | 簿记器 |
|---|---|---|
| 算候选 | 每格 O(S + B²) | 落子时增量维护 |
| 挑格 | 每次重算候选再比较 O(S²(S+B²)) | 读 `count` → O(S²)（通常远小） |
| 落子 | O(1) | O(S + B²)（要删同行/列/宫的候选） |
| 撤销 | 复制整盘 O(S²) | O(改动数) |

**一句话总结这一节**：**"用一个精确记账的增量结构，换掉每次重算全盘"** —— 这就是所有高性能回溯求解器的共同套路。

### 10.7 谁在用它

| 调用方 | 用法 |
|---|---|
| `solver.solveGrid` | `createTracker(S, B, grid)` → 循环 `pickCell` / `candidatesOf` / `place`+`undo` |
| （间接）`generator.generateSolution` | 通过 `solveGrid` 补全棋盘 |
| （间接）`multiSolver` / `solvePuzzle` | 同上 |

**注意 `tracker` 不认识规则**（注释原文："这里只有数据与计数，不含任何规则/随机 —— 候选怎么用由调用方决定"）：
- 它**不做**"这一格能不能填"的业务判断（那在 `rules.getCandidates`）；
- 它**不做**洗牌（随机由 `solver` 注入 `rng`）；
- 它是纯粹的"**数据结构 + 维护操作**"。

**这种"纯数据结构"的定位让它 100% 可测**：给定盘面 + 一串 `place`/`undo`，断言内部表状态即可（R11 的"可测"在这里体现得最充分）。

---

## 11. `core/sudoku/solver.ts`（70 行 · 2 个导出）—— 回溯引擎 + 单解

**① 这个文件是干嘛的**：**"求解"这件事的唯一实现**。它把 §10 的簿记器组织成深度优先搜索（DFS），并暴露一个"只求第一个解"的入口。
**它被谁用**：`generator.generateSolution`（补全骨架）、`multiSolver`（多解枚举）、`solvePuzzle`（单解）。

### 11.1 `solveGrid`：引擎（**一个引擎、两种停止策略**）

```ts
/**
 * 回溯引擎（求解器内核）——「单解」与「多解」共用这一份，区别只在停止策略：
 * · 每凑满一盘就调一次 onSolution（传的是拷贝，引擎不会把它改掉），回调返回 true = 立刻停止搜索
 * · 引擎就地改 grid（调用方传自己的副本）；步数超过 maxIter 也停（保险丝，防死循环）
 * 挑格用 tracker 的 MRV；随机只来自注入的 rng（core 纯度，R3）
 */
export const solveGrid = (
    grid: NumBoard, boxSize: number, rng: Rng,
    onSolution: (solved: NumBoard) => boolean,
    maxIter = 20_000_000,
): void => {
    const S = sideOf(boxSize)
    const { pickCell, candidatesOf, place } = createTracker(S, boxSize, grid)
    let iter = 0
    let stop = false

    const dfs = (): void => {
        if (stop) return                                     // ① 已被叫停
        if (++iter > maxIter) {                              // ② 保险丝
            stop = true
            return
        }

        const { r, c, full, dead } = pickCell()              // ③ MRV 挑格
        if (dead) return                                     //    死路 → 回溯
        if (full) {
            if (onSolution(grid.map(row => [...row]))) stop = true   // ④ 找到一个解
            return
        }

        const list = candidatesOf(r, c)                      // ⑤ 该格候选
        shuffle(list, rng)                                    //    用注入的随机源洗牌

        for (const n of list) {
            if (stop) return                                  // ⑥ 每轮都检查停止标志
            const undo = place(r, c, n)                       //    落子（拿到撤销闭包）
            dfs()                                             //    深入
            undo()                                            //    回滚现场（无论成败）
        }
    }

    dfs()
}
```

| # | 代码 | 说明 |
|---|---|---|
| ① | `if (stop) return` | **停止标志**：上层回调说"够了"（或触发保险丝）后，**所有层递归立即退出** |
| ② | `if (++iter > maxIter) { stop = true; return }` | **保险丝**（默认 2000 万步）：如果盘面异常导致永远搜不完，不加限制会一直算到 Worker 超时；有它就能"有限时间内返回" |
| ③ | `const { r, c, full, dead } = pickCell()` | **§10.3 的四元组在这里被消费**：`dead` → 回溯；`full` → 找到解；否则拿到下一格 |
| ④ | `onSolution(grid.map(row => [...row]))` | **传整盘拷贝**：引擎随后还会改 `grid`（`undo` 会清空格子）→ 不拷的话调用方拿到的是"空盘" |
| ⑤ | `shuffle(list, rng)` | **随机只来自注入的 `rng`**（R3）：决定"多解时先出现哪个解""生成时题的走向" |
| ⑥ | `for (const n of list) { if (stop) return … }` | **每轮都检查 `stop`**：`dfs()` 内部可能已把 `stop` 置 `true`（不检查就会继续试同层其它候选，白费时间） |

**核心循环其实只有三拍**：

```ts
const undo = place(r, c, n)     // 选一个候选，落子
dfs()                           // 递归填下一格
undo()                          // 撤销，换下一个候选
```

**这份简洁来自前两步的铺垫**：`pickCell` 解决了"该填哪"（MRV），`place`/`undo` 解决了"落子和回滚"（§10.5）→ 搜索本身只剩"选 → 深入 → 回滚"。

**为什么用"回调 + 返回布尔"而不是直接返回值**（知识点：控制反转，00 册 §4.10）：

```ts
onSolution: (solved: NumBoard) => boolean      // 返回 true = 停止
```

- **单解**：回调存一份并返回 `true` → 找到第一个就停（**快**）；
- **多解**：回调 push 并返回"存够了吗" → 枚举到上限才停；
- **统计解数**（未来可加）：永远返回 `false` → 枚举完所有解。

**一个机制服务三种需求，不必写三份引擎** —— 这就是"把策略交给调用方"的收益。

**参数上三个约定（都写在注释里，值得学）**：
1. **`grid` 会被就地修改** → 调用方必须传副本；
2. **回调拿到的是拷贝** → 可以安全保存/比较；
3. **随机由 `rng` 注入** → core 纯度，可用固定序列复现。

### 11.2 `solvePuzzle`：单解入口（**带两道前置检查**）

```ts
/**
 * 求解（单解）：盘面副本 → 第一个解
 * 尺寸不是合法方阵 / 题面自带冲突 / 无解 → null
 * （冲突必须先拦：引擎只负责「填空」，不会重判盘面上已有的数字）
 */
export const solvePuzzle = (board: NumBoard, rng: Rng): NumBoard | null => {
    const boxSize = boxSizeOf(board.length)
    if (boxSize === null) return null                                // ① 尺寸不合法
    if (getSudoku(boxSize).hasConflict(board)) return null            // ② 题面自带冲突

    const found: NumBoard[] = []
    solveGrid(board.map(row => [...row]), boxSize, rng, solved => {   // ③ 传副本
        found.push(solved)
        return true                                                   // ④ 找到一个就停
    })
    return found[0] ?? null                                           // ⑤ 无解 → null
}
```

**四个知识点**：

1. **① 尺寸检查**：`boxSizeOf` 返回 `null` → 边长不是完全平方数（§7.2）→ 不是合法盘面，**绝不能让它流进引擎**（否则 `S` 全错）。
2. **② 冲突必须先拦**（注释专门解释了原因）：
   > *"引擎只负责「填空」，不会重判盘面上已有的数字"*
   因为 `tracker` 初始化时会把已有数字登记为"已用"；**但如果盘面上本来就有两个 5 在同一行，引擎并不知道这是非法的** —— 它只会把空格填完，返回一个"看似有解、实则非法"的结果。**所以必须在这里先判冲突。**
3. **③ `board.map(row => [...row])`**：把副本交给引擎（引擎就地改 `grid`）→ **调用方的 `board` 一个格子都不会被改**。
4. **⑤ `found[0] ?? null`**：用数组收集是"回调范式"下的常见写法；`?? null` 保证**无解时是 `null` 而不是 `undefined`**，让调用方判断更简单。

**一个重要对比**：游玩页判胜用的是 `rules.isSolved`（**不走回溯**）—— 因为玩家盘面"填满且无冲突"就够了，**不需要验证唯一性**（那要慢上千倍）。
> **"该不该求解"本身就是一个性能决策**：能不算就不算。

---

## 12. `core/sudoku/multiSolver.ts`（45 行 · 2 个导出）—— 多解枚举

**① 这个文件是干嘛的**：一次枚举**至多 N 个解**。用途是"**题目求解页**"（粘一份题面，看它有几个解 / 每个解长什么样）。

### 12.1 `solveLimitOf`：上限归一化

```ts
/** 单次枚举的硬上限（防止 UI 传入过分大的值把 Worker 占住） */
const MAX_SOLUTIONS = 50

/** 解数上限归一化：非整数向下取整，收敛到 1 ~ MAX_SOLUTIONS */
export const solveLimitOf = (maxSolutions: number): number =>
    Math.min(MAX_SOLUTIONS, Math.max(1, Math.floor(maxSolutions)))
```

**逐点**：
- `Math.floor`：`3.7 → 3`（解是离散的，"要 3.7 个"没意义）；
- `Math.max(1, …)`：最少 1 个（要 0 个解没有意义）；
- `Math.min(50, …)`：**上限 50** —— 注释写得直白："**防止 UI 传入过分大的值把 Worker 占住**"。

**为什么这条上限很重要**：空盘的解数是天文数字（9×9 空盘约 `6.67 × 10²¹` 个解）。如果前端传 `maxSolutions = 1e9`，Worker 会一直算到超时被杀 —— **上限是"核心的自保"**。
**值得记的四个字**：**上限归一化要放在 core**，而不是"相信 UI 不会传错"。这与后端"参数夹紧"（02 册 §3.6 的 `Math.min(limit, 50)`）是同一个思路 —— **边界处不信任输入**。

### 12.2 `solvePuzzleMulti`：枚举多个解

```ts
/**
 * 多解枚举：直接回**解列表**（`[]` = 一个解都没找到，题面由调用方自己拿着）
 * · 尺寸不是合法方阵 / 题面自带冲突 → `[]`
 * · 解的先后顺序由注入的 rng 决定（同一盘面多次求解，解集相同、顺序可能不同）
 * · 页面自己也会先判一次冲突（省一次 Worker 往返），这里的守卫是给其它调用方的
 */
export const solvePuzzleMulti = (board: NumBoard, rng: Rng, maxSolutions: number): NumBoard[] => {
    const boxSize = boxSizeOf(board.length)
    if (boxSize === null) return []
    if (getSudoku(boxSize).hasConflict(board)) return []

    const limit = solveLimitOf(maxSolutions)
    const solutions: NumBoard[] = []
    solveGrid(board.map(row => [...row]), boxSize, rng, solved => {
        solutions.push(solved)
        return solutions.length >= limit          // ← 存够上限就停
    })
    return solutions
}
```

**与 `solvePuzzle`（§11.2）的三处对照**：

| | `solvePuzzle`（单解） | `solvePuzzleMulti`（多解） |
|---|---|---|
| 不合法时返回 | `null` | `[]` |
| 回调返回 | `true`（立刻停） | `solutions.length >= limit` |
| 结果 | 第一个解 | 最多 `limit` 个解 |

**为什么返回值类型不同（`null` vs `[]`）—— 因为语义不同**：
- **单解**："**给不出一个解**" → `null`（明确的"没有"）；
- **多解**："**解集是空的**" → `[]`（**集合语义**，空集是天然的"零值"）。

> 这是"类型要贴合语义"的细节：如果多解也返回 `null`，调用方就得写 `if (sol === null || sol.length === 0)` —— 多一个没意义的判断。

**注释里三条都值得记**：

1. **"解的顺序由 rng 决定"**：同一盘面两次求解，**解集相同、顺序可能不同**（因为每层候选都洗过牌，§11 ⑤）。
   **这不是 bug，是有意设计**：传固定 `rng` → 顺序可复现；传真随机 → 每次看到不同的解排前面。
2. **"页面自己也会先判一次冲突（省一次 Worker 往返）"**：这是**性能分层**的典型做法 ——
   前端先用 `rules.hasConflict` 拦（同步、几微秒），只有"看起来有戏"才启动 Worker（异步、几百毫秒起）。
   **这里的守卫是给"其它调用方"（后端 / 未来新入口）兜底的。**
3. **`[]` 的三种来源**（要分清楚）：
   - 尺寸不合法 → `[]`；
   - 题面自带冲突 → `[]`（提前返回，**没进引擎**）；
   - 进了引擎但**一个解都没找到** → 也返回 `[]`（此时引擎已跑完，可能是题面自相矛盾且无重复）。
   而**空盘（全 0）不会返回 `[]`** —— 它解太多，会填满到 `limit`。

**它被谁调用**：`useSolveFlow`（题目求解页）→ 经 `services/sudoku/workerClient.ts` 的 `solveMultiInWorker` 在 Worker 里跑（01 册 §3.7）。
**为什么必须进 Worker**：枚举 50 个解可能是几百万步回溯（保险丝上限 2000 万步）→ 在主线程会**直接冻结页面**。

---

## 13. `core/sudoku/generator.ts`（144 行 · 2 个导出）—— 生成器

**① 这个文件是干嘛的**：**从零造出一道题**。对外两个入口：

| 入口 | 作用 | 谁在用 |
|---|---|---|
| `generateSolution(boxSize, rng)` | 只要**一盘完整合法终盘** | 编辑页/自定义需要"给定一个解"的场合 |
| `generatePuzzle(boxSize, blanks, rng)` | 完整解 + 挖空 = **一道能玩的题** | `services/sudoku/worker.ts`（Worker 入口） |

**内部三步**（文件头注释原话）：
> **模式盘 → 随机变换 → 随机保留一部分 → 交给求解器补全**

**为什么不能"从空盘直接回溯生成"**：空盘有 `6.67 × 10²¹` 个解（9 阶），回溯会**在解空间里乱撞**；而"先造一个合法盘、再随机改造"是 **O(S²)** 起步的确定性构造 → **快几个数量级**。

### 13.1 `patternBoard`：一个公式造出合法终盘（**本节的数学核心**）

```ts
const patternBoard = (S: number, B: number): NumBoard => {
    const grid = makeGrid<number>(S, () => 0)
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            grid[r][c] = ((r * B + Math.floor(r / B) + c) % S) + 1
        }
    }
    return grid
}
```

**公式**：`值 = ((r × B + ⌊r / B⌋ + c) mod S) + 1`

**为什么它一定合法**（三条都要成立，这也是"为什么敢直接用"的依据）：

**① 每一行都不含重复**（`r` 固定）：
`(r×B + ⌊r/B⌋ + c) mod S` 中只有 `c` 在变，`c = 0..S-1` → 结果正好是 `0..S-1` 的一个排列 ✅

**② 每一列都不含重复**（`c` 固定）：需要看 `r×B + ⌊r/B⌋` 在 `mod S` 下两两不同。
**代 9 阶（B=3）验一遍**：

| r | `r*B` | `⌊r/B⌋` | 和 | `mod 9` |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | **0** |
| 1 | 3 | 0 | 3 | **3** |
| 2 | 6 | 0 | 6 | **6** |
| 3 | 9 | 1 | 10 | **1** |
| 4 | 12 | 1 | 13 | **4** |
| 5 | 15 | 1 | 16 | **7** |
| 6 | 18 | 2 | 20 | **2** |
| 7 | 21 | 2 | 23 | **5** |
| 8 | 24 | 2 | 26 | **8** |

`0,3,6,1,4,7,2,5,8` —— **9 个值各不相同** ✅ 于是每一列也是 `0..S-1` 的排列。

**③ 每一宫都不含重复**：设宫左上角是 `(br, bc)`（`br` 是 `B` 的倍数），宫内第 `i` 行第 `j` 列满足 `r = br+i`、`c = bc+j`（`i, j < B`）。代入并化简：

```
floor((br+i)/B) = br/B + floor(i/B) = br/B      （因为 i < B）
→ 值 ≡ (br*B + br/B + bc) + (i*B + j)   (mod S)
```
前半是**常数**，后半 `i*B + j`（`i,j ∈ [0,B)`）正好取遍 `0,3,6,1,4,7,2,5,8`（同 ② 的表）→ **宫内也是 1..S 各一次** ✅

**结论**：`patternBoard` 产出的**必然是合法终盘**（这就是数独的经典"基础模式"构造）。
**它的价值**：**不用求解、不用验证**，`O(S²)` 一次赋值就得到一盘合法解。

### 13.2 `randomTransform`：六种变换（**每一种都保持合法性**）

**为什么需要变换**：`patternBoard` 永远产出**同一盘**（除了尺寸不同）→ 直接拿去出题，所有玩家的题面"骨架"一模一样（同一答案的不同挖空）。
**随机变换的作用**：在"**保持合法**"的前提下产生**天文数字级的变体**。

```ts
const randomTransform = (grid: NumBoard, S: number, B: number, rng: Rng): void => {
    const blocks = S / B                      // 宫带数量：9 阶 → 3
```

**① 数字随机重排**（`1..S` 的置换）

```ts
    const digits: number[] = []
    for (let n = 1; n <= S; n++) digits.push(n)
    shuffle(digits, rng)
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            grid[r][c] = digits[grid[r][c] - 1]
        }
    }
```
**为什么保持合法**：把 `1→7`、`2→3`…（一个**双射**）整体替换，**"哪些格子相同/不同"的关系完全没变** → 行/列/宫的"各不同一次"依然成立。
**`digits[grid[r][c] - 1]` 的 `-1`**：`digits` 是"长度为 S 的排列数组"（下标 `0..S-1`），而格子的值是 `1..S` → 减 1 对应上。
**变体数量**：`S!`（9 阶 = 362880 种）—— 仅这一项就已经很可观。

**② 宫带内行交换**（每个"3 行带"内部打乱行序）

```ts
    for (let bi = 0; bi < blocks; bi++) {
        const rows: number[] = []
        for (let i = 0; i < B; i++) rows.push(bi * B + i)     // 这一带的 B 行下标
        shuffle(rows, rng)
        const copies = rows.map(r => [...grid[r]])            // 先取拷贝
        for (let i = 0; i < B; i++) grid[bi * B + i] = copies[i]   // 再按新顺序写回
    }
```
**知识点：为什么"先拷 copies 再写回"而不是原地 `swap`**：
`rows` 是乱序下标（例如 `[2,0,1]`），如果直接 `grid[0] = grid[2]` 就开始改，**后面的读取会读到已被覆盖的内容**。
**先整体拷出来**（`copies`）再写回 → 一定正确。**这是"置换/轮换"类代码的标准避险写法。**

**为什么"只能在宫带内换行"**：整带交换（③）可以，但**带内任意换**必须限制在同一带 —— 否则会把第 0 行的数字搬到第 4 行，**破坏"宫"的约束**。
**变体数量**：每个带 `B!` 种 → 共 `(B!)^blocks`（9 阶 = `6³ = 216`）。

**③ 宫带整体交换**（把"3 行带"当作整体重排）

```ts
    const boxRows: number[] = []
    for (let i = 0; i < blocks; i++) boxRows.push(i)
    shuffle(boxRows, rng)
    const reordered: number[][] = []
    for (const bi of boxRows) {
        for (let i = 0; i < B; i++) reordered.push(grid[bi * B + i])
    }
    for (let r = 0; r < S; r++) grid[r] = reordered[r]
```
**为什么带之间可以整带换**：交换"整带"只是把 3 行一组整体上下搬 —— **每一行的内容没变、宫的分组也没变**（宫的行范围还是 `0-2/3-5/6-8`，只是内容换了位置）✅
**变体数量**：`blocks!`（9 阶 = 6）。

**④ 宫带内列交换**（与 ② 完全对称，只是把"行"换成"列"）

```ts
    for (let bi = 0; bi < blocks; bi++) {
        const cols: number[] = []
        for (let j = 0; j < B; j++) cols.push(bi * B + j)     // 这一带的 B 列
        shuffle(cols, rng)
        for (let r = 0; r < S; r++) {
            const copies = cols.map(c => grid[r][c])          // 这一行里取出这 B 个值
            for (let i = 0; i < B; i++) grid[r][bi * B + i] = copies[i]
        }
    }
```
**注意与 ② 的差别**：行交换是"整行搬"（一次 `copies` 就够）；**列交换要逐行做**（每行都要把该带内的 B 个值按新顺序重排）→ 所以 `for (let r = 0; r < S; r++)` 在里面。
**为什么只能在"宫带内"换列**：与 ② 同理 —— 跨带换列会破坏宫。

**⑤ 宫列带整体交换**（跨带重排列）

```ts
    const boxCols: number[] = []
    for (let i = 0; i < blocks; i++) boxCols.push(i)
    shuffle(boxCols, rng)
    const colOrder: number[] = []
    for (const bi of boxCols) {
        for (let j = 0; j < B; j++) colOrder.push(bi * B + j)   // 例：[0,1,2,3,4,5,6,7,8] → [6,7,8,0,1,2,3,4,5]
    }
    for (let r = 0; r < S; r++) {
        const oldRow = grid[r]
        const newRow = new Array<number>(S)
        for (let c = 0; c < S; c++) newRow[c] = oldRow[colOrder[c]]   // 按新顺序重建整行
        grid[r] = newRow
    }
```
**为什么这里必须"重建整行"而不能交换**：`colOrder` 描述的是**任意重排**（不只是交换两列）→ **必须先把旧行留住**（`oldRow`），再往 `newRow` 里按新顺序取；否则一边读一边写就乱了。
**注意 `grid[r] = newRow`**：把整行**换成一个新数组**（而不是逐格写回）—— 既快又不会有别名问题。
**变体数量**：`blocks!`（9 阶 = 6）。

**⑥ 50% 概率转置**（沿主对角线翻转）

```ts
    if (rng() < 0.5) {
        for (let r = 0; r < S; r++) {
            for (let c = r + 1; c < S; c++) {
                const t = grid[r][c]
                grid[r][c] = grid[c][r]
                grid[c][r] = t
            }
        }
    }
```
**逐点**：
- `rng() < 0.5`：**一半概率**做转置 → 又翻倍变体（转置后"长条形的题面"会变成"竖条形的"）；
- `for (let c = r + 1; c < S; c++)`：**只遍历上三角**（`c > r`）—— 因为转置是"成对交换"，只做一半才是"恰好一次"（如果遍历全矩阵，每个元素会被交换两次 → 等于没做）；
- **为什么转置保持合法**：转置后**行变列、列变行**，而"宫"在对角线转置下**映射到宫**（宫格 `(br..br+B, bc..bc+B)` 转置后是 `(bc..bc+B, br..br+B)`，还是同一个形状的宫）✅

**六种变换的变体总数**（9 阶数量级）：
`S! × (B!)^blocks × blocks! × (B!)^blocks × blocks! × 2` = `362880 × 6³ × 6 × 6³ × 6 × 2` ≈ **10¹⁴ 量级**（远超可枚举范围）。

> **知识点：这就是"算法层面的随机性"** —— 不是"随机试错"，而是"**在一个已知合法的结构上施加一组保持性变换**"。
> 这种思路在测试数据生成、密码学（置换/双射）、图形学（对称变换）里都是同一个套路：**先保证正确，再追求多样**。

### 13.3 `keepRatioOf`：保留多少"骨架"（**一个重要的工程折中**）

```ts
/** 骨架保留比例（盘面越大保留越多，补全才是「秒收」而不是「长考」） */
const keepRatioOf = (S: number): number => {
    if (S >= 100) return 0.85
    return Math.min(0.72, 0.35 + (S - 9) * 0.014)
}
```

**它在算什么**：`generateSolution` 会**随机保留 `keepRatio` 比例的格子**作为"骨架"，剩下的交给求解器补全。
**代入各尺寸**：

| `S`（盘面边长） | 公式结果 | 实际取值 |
|---|---|---|
| 9（9×9） | `0.35 + 0×0.014 = 0.35` | **0.35** |
| 16（16×16） | `0.35 + 7×0.014 = 0.448` | 0.448 |
| 25（25×25） | `0.35 + 16×0.014 = 0.574` | 0.574 |
| 36（36×36） | `0.35 + 27×0.014 = 0.728` | **0.72**（被 `min` 截断） |
| 49+ | 更大 | **0.72**（封顶） |
| 100（100×100） | — | **0.85**（特判） |

**为什么要"盘面越大保留越多"**（注释原文："补全才是「秒收」而不是「长考」"）：
- **保留太少**（例如 36×36 只留 35% ≈ 441 格）：留给求解器的空格有 800+ 个，**搜索空间爆炸** → 可能跑几秒甚至触发保险丝（`maxIter`）→ 生成失败；
- **保留够多**：空格大多是"唯一候选"，MRV 一路 `count === 1` 推下去 → **几毫秒就补完**（"秒收"）。

**代价要认识**：保留越多 → 骨架越接近模式盘 → **题目的"结构性"越强**（更规整、更难挖出"有趣"的题面）。
**这是一个典型的工程取舍**：**"生成时间可控"优先于"每一盘都极致随机"** —— 因为用户点"生成"之后等 2 秒是可以接受的，等 30 秒（还被超时杀掉）不可接受。

### 13.4 `generateSolution` / `generatePuzzle`：把三步串起来

```ts
/** 生成一盘完整解：模式盘 + 随机变换 + 随机挖掉一部分 → 回溯补全；失败（超迭代）抛错 */
export const generateSolution = (boxSize: number, rng: Rng): NumBoard => {
    const { S, B } = getSudoku(boxSize)          // ① 走 §9.10 的缓存拿尺寸
    const total = S * S
    const keepRatio = keepRatioOf(S)

    const full = patternBoard(S, B)              // ② 确定性合法终盘
    randomTransform(full, S, B, rng)             // ③ 随机变换（六种，全部保持合法）

    const indices: number[] = []                 // ④ 0 .. total-1
    for (let i = 0; i < total; i++) indices.push(i)
    shuffle(indices, rng)                        //    打乱
    const keepCount = Math.floor(total * keepRatio)
    const keep = new Uint8Array(total)           // ⑤ 开关表（§00-3.10）
    for (let i = 0; i < keepCount; i++) keep[indices[i]] = 1

    const seed: NumBoard = makeGrid<number>(S, () => 0)
    for (let r = 0; r < S; r++) {
        for (let c = 0; c < S; c++) {
            if (keep[r * S + c]) seed[r][c] = full[r][c]     // ⑥ 一维下标换算（§3.6）
        }
    }

    const solved: NumBoard[] = []
    solveGrid(seed, boxSize, rng, board => {     // ⑦ 交给引擎补全
        solved.push(board)
        return true                              //    找到一个就停
    })
    if (!solved.length) throw new Error('生成失败')   // ⑧
    return solved[0]
}

/** 生成一题：生成器出完整解 → 挖空器挖出题面（Worker 走这个入口） */
export const generatePuzzle = (boxSize: number, blanks: number, rng: Rng): PuzzleData => {
    const solution = generateSolution(boxSize, rng)
    return { puzzle: digPuzzle(solution, blanks, rng), solution }
}
```

**逐点**：

| # | 做法 | 为什么 |
|---|---|---|
| ① | `getSudoku(boxSize)` 取 `{S, B}` | 走缓存（§9.10）；**不要自己算 `S`**（算式只有一份） |
| ②③ | 模式盘 + 变换 | 见 §13.1 / §13.2 |
| ④⑤ | **打乱下标 + 取前 `keepCount` 个** | **为什么不用"每格 50% 概率保留"**：概率法**保留数量会波动**（大盘波动绝对量更大）→ 补全耗时不可控。**"打乱后取前 N 个"能精确控制比例** |
| ⑥ | `keep[r * S + c]` | 一维开关表 ↔ 二维坐标的换算（**成对出现**，§4.4） |
| ⑦ | `solveGrid(seed, …)` | 注意**传的是 `seed`，不拷贝** —— 因为 `seed` 是刚造的临时盘，**烧掉它没关系**（而 §11.2 的 `solvePuzzle` 必须拷贝，因为它改的是调用方的盘） |
| ⑧ | `throw new Error('生成失败')` | 见下 |

**⑧ 为什么这里可以 `throw`（而 core 平时不抛）**：
- 理论保证：`seed` 是 `full` 的**子集**，而 `full` 是合法终盘 → **至少有一个解存在**（就是 `full` 本身）。所以"找不到解"只可能意味着**保险丝被触发**（迭代超限）→ 这是"**前提被破坏**"级别的问题，不是业务分支；
- 这和 02 册 §4.5 的 `makeUniqueId` 抛错是同一判断：**基础设施层的兜底可以抛；业务分支一律用返回值**。

**一个值得注意的细节**：返回的是 **`solved[0]`（求解器的结果）**，而不是 `full`。
两者都合法：当骨架足够约束出唯一解时二者相同；否则求解器可能走到另一条解路上（因为每层候选都洗过牌）。
**需求明确"不检查唯一解"（多解允许）**，所以这不是问题 —— 反而正是"题目求解"能列出多个解的前提（11 册 §5.8）。
**重点是"不需要额外验证"**：`seed ⊂ full` 保证了"至少有一个解"，所以这里**不做 `isSolved` 校验** —— 省掉一次全盘检查。

**`generatePuzzle` 只是一行组合**：
```ts
generateSolution(boxSize, rng)  →  完整解
digPuzzle(solution, blanks, rng) →  挖空后的题面
return { puzzle, solution }
```
这正是 `services/sudoku/worker.ts` 里 `{ kind: 'generate', boxSize, blanks }` 的实现（01 册 §3.7 的 Worker 通道），返回的 `PuzzleData` 再通过 `postMessage` 回主线程。

---

## 14. `core/sudoku/digger.ts`（113 行 · 1 个导出）—— 挖空器

**① 这个文件是干嘛的**：拿一盘的**完整解** → 挖出**题面**（把一些格子改成 0）。
**文件头注释说清了全貌**：

> **三阶段（都想挖到 target，越往后越保守）**：
> ① 先保证「每行 / 每列 / 每宫至少留 1 个数」，逐格挖
> ② 软约束：行-宫 / 列-宫 交叉处还要留够 `k` 个数（题面才不至于过于空）
> ③ 兜底：只守「行 / 列 / 宫各留 1 个」的硬底线，尽量凑够 target

### 14.1 开头四件事：拷贝、合法性、目标收敛、软约束阈值

```ts
/** 挖空：solution 原样不动，返回一份新题面；blanks 会被收敛到 40%~65% 的允许区间 */
export const digPuzzle = (solution: NumBoard, blanks: number, rng: Rng): NumBoard => {
    const S = solution.length
    const puzzle = solution.map(row => [...row])    // ① 先拷一份（不改入参）
    const boxSize = boxSizeOf(S)
    if (boxSize === null) return puzzle              // ② 不是合法方阵 → 原样返回

    const B = boxSize
    const total = S * S

    const minBlanks = Math.ceil(total * BLANK_RATIO.min)          // ③
    const maxBlanks = Math.floor(total * BLANK_RATIO.max)
    const target = Math.max(minBlanks, Math.min(blanks, maxBlanks))

    const k = Math.max(1, Math.round(B * 0.35))                   // ④

    const rowKeep = new Array<number>(S).fill(S)
    const colKeep = new Array<number>(S).fill(S)
    const boxKeep = new Array<number>(S).fill(S)
    const rowBoxKeep: number[][] = Array.from({ length: S }, () => new Array<number>(B).fill(B))
    const colBoxKeep: number[][] = Array.from({ length: B }, () => new Array<number>(S).fill(B))
```

| # | 做法 | 说明 |
|---|---|---|
| ① | `solution.map(row => [...row])` | **二维深拷贝**（§3.11）→ 注释明说"**solution 原样不动**"：调用方（`generatePuzzle`）还要把 `solution` 一起返回，绝不能被挖空污染 |
| ② | `boxSizeOf(S) === null → 原样返回` | **温和失败**：不是合法方阵就不挖（返回完整解）。**不抛错**，因为这是"输入不合法"这种业务性情况（core 的常规策略，00 册 §3.13） |
| ③ | `target` 收敛到 `[minBlanks, maxBlanks]` | **`ceil(81×0.4) = 33`、`floor(81×0.65) = 52`** → 9×9 的 target 永远落在 **[33, 52]**。**意义**：挖出来的题面**必然能通过 40%~65% 的校验**（前端提交校验 + 后端复校）→ 生成与校验**永远一致** |
| ④ | `k = max(1, round(B×0.35))` | **软约束阈值**：9 阶 `round(1.05)=1`、25 阶 `round(1.75)=2`、100 阶 `round(3.5)=4` |

**五个计数器**（本文件的核心数据结构，`remove` 时同步维护）：

| 计数器 | 维度 | 初值 | 含义 |
|---|---|---|---|
| `rowKeep[r]` | `S` | `S` | 第 `r` 行**还剩几个非空格** |
| `colKeep[c]` | `S` | `S` | 第 `c` 列还剩几个 |
| `boxKeep[b]` | `S` | `S` | 第 `b` 号宫（`boxIndexAt`）还剩几个 |
| `rowBoxKeep[r][bc]` | `S × B` | `B` | 第 `r` 行在**宫列带 `bc`** 里还剩几个（一行在某宫带内正好 `B` 格） |
| `colBoxKeep[br][c]` | `B × S` | `B` | 第 `c` 列在**宫行带 `br`** 里还剩几个 |

> **"用计数器代替重新统计"**：每次判断"还能不能挖"都只需读一个数字（O(1)），而不是把整行/列/宫扫一遍。**这与 §10 的 `tracker.count` 是同一种思路** —— **增量维护 > 每次重算**。

### 14.2 `remove` 与两个判断函数

```ts
    const remove = (r: number, c: number): void => {
        puzzle[r][c] = 0                                       // 真正挖掉
        rowKeep[r]--
        colKeep[c]--
        boxKeep[boxIndexAt(r, c, B)]--
        rowBoxKeep[r][Math.floor(c / B)]--                     // 这一行在这一宫列带里 -1
        colBoxKeep[Math.floor(r / B)][c]--                     // 这一列在这一宫行带里 -1
    }

    const canHard = (r: number, c: number): boolean =>
        rowKeep[r] > 1 &&
        colKeep[c] > 1 &&
        boxKeep[boxIndexAt(r, c, B)] > 1

    const canSoft = (r: number, c: number): boolean => {
        const bc = Math.floor(c / B)
        const br = Math.floor(r / B)
        return rowBoxKeep[r][bc] > k && colBoxKeep[br][c] > k
    }
```

**`canHard` 为什么是 `> 1`（而不是 `>= 1`）**：
"挖掉这一格之后，这行/列/宫**还剩至少 1 个数**" ⟺ 挖之前**必须 > 1**。
**这就是"题面不会有空行/空列/空宫"的保证**（对应 `rules.hasEmptyGroup` 校验的那一条 —— §9.7 提到的"系统生成不需要校验"就是靠这里）。

**`canSoft` 在管什么**：`rowBoxKeep[r][bc] > k && colBoxKeep[br][c] > k`
含义是"**这一格挖掉后，它所在行在它所在的那一宫里还剩 > k 个数**，且它所在列在它所在的那一行带里还剩 > k 个数"。
**为什么需要软约束**：如果只守硬底线（每组留 ≥1），可能出现这样的题面 ——

```
行 0：0 0 0 | 5 0 0 | 0 0 0        ← 这一行的唯一线索挤在中间那个宫
行 1：0 0 0 | 0 0 0 | 0 0 7        ← 这一行只剩 1 个，而且在别的宫
```
这种题面**看起来"没线索"**，玩家体验差（甚至需要试错）。
`k` 让"**每行在每个宫里至少留 `k` 个**"→ 线索在盘面上**分布更均匀**。

**注意软约束是"尽力而为"，不是"必须"**：阶段②用 `canHard && canSoft`，挖不够就进阶段③**只守 `canHard`** —— **宁可少挖，绝不破坏硬底线**。

### 14.3 三阶段挖空（同一个打乱顺序，三轮不同严格度）

```ts
    const indices: number[] = []
    for (let i = 0; i < total; i++) indices.push(i)
    shuffle(indices, rng)                       // 全过程只用这一个顺序（→ 可复现）

    let removed = 0

    const rowDug = new Uint8Array(S)            // 这一行"已经挖过至少一格"了吗
    const colDug = new Uint8Array(S)
    const boxDug = new Uint8Array(S)
    let rowsLeft = S                            // 还没挖过的行数
    let colsLeft = S
    let boxesLeft = S

    // 阶段①：每个行 / 列 / 宫都至少挖掉一格（轮到的格子还必须是硬约束允许的）
    for (let i = 0; i < total && removed < target; i++) {
        if (rowsLeft === 0 && colsLeft === 0 && boxesLeft === 0) break
        const idx = indices[i]
        const r = Math.floor(idx / S)           // 一维下标 → 行列（§4.4）
        const c = idx % S
        const b = boxIndexAt(r, c, B)
        if (rowDug[r] && colDug[c] && boxDug[b]) continue    // 三个组都已挖过 → 别浪费配额
        if (!canHard(r, c)) continue                          // 硬底线

        remove(r, c)
        removed++
        if (!rowDug[r]) { rowDug[r] = 1; rowsLeft-- }
        if (!colDug[c]) { colDug[c] = 1; colsLeft-- }
        if (!boxDug[b]) { boxDug[b] = 1; boxesLeft-- }
    }

    // 阶段②：硬 + 软约束一起守，继续凑 target
    for (let i = 0; i < total && removed < target; i++) {
        const idx = indices[i]
        const r = Math.floor(idx / S)
        const c = idx % S
        if (puzzle[r][c] === 0) continue                      // 已经挖过 → 跳过
        if (!canHard(r, c) || !canSoft(r, c)) continue
        remove(r, c)
        removed++
    }

    // 阶段③：只要硬底线还在就挖（保证不会出现空行 / 空列 / 空宫）
    for (let i = 0; i < total && removed < target; i++) {
        const idx = indices[i]
        const r = Math.floor(idx / S)
        const c = idx % S
        if (puzzle[r][c] === 0) continue
        if (!canHard(r, c)) continue
        remove(r, c)
        removed++
    }

    return puzzle
}
```

**阶段① 的目标与硬底线是"两个方向"**（很容易搞反，一定要分清）：

| | 保证 | 靠什么 |
|---|---|---|
| **硬底线** | 每组**至少留 1 个数**（不会出现空行/列/宫） | `canHard`：`rowKeep > 1 && colKeep > 1 && boxKeep > 1` |
| **质量目标①** | 每组**至少挖掉 1 格**（不会出现"整行全是给定数字"） | `rowDug` / `colDug` / `boxDug` + `rowsLeft/colsLeft/boxesLeft` 计数 |

**"整行全是给定数字"为什么要避免**：那一行**完全不需要推理**（9 个数都给了），玩家只是"照抄" → 题目质量差。所以挖空器**主动保证每行/每列/每宫都有空格**。

**三个细节**：

1. **`if (rowsLeft === 0 && colsLeft === 0 && boxesLeft === 0) break`**：三个目标全达成才提前结束；否则继续扫（一轮可能覆盖不到某些组）。
2. **`if (rowDug[r] && colDug[c] && boxDug[b]) continue`（阶段① 唯一一处）**：这一格对**它涉及的三个组**都已经"挖过了" → **跳过多余的挖掘**。
   **为什么重要**：阶段① 有它自己的目标（覆盖所有组），**不该把 `target` 的配额浪费在"已经达成目标"的格子上**。
3. **阶段②③ 的 `if (puzzle[r][c] === 0) continue`**：已经挖过的格子不能重复挖 —— 否则 `removed++` 会**虚增**（计数与实际挖空数不一致 → 比例算错、题面比 `target` 少挖）。

**三阶段的"严格度递减"**（这就是文件头注释说的"越往后越保守"）：

```
阶段①  canHard        （+ 必须对"未覆盖的组"有贡献）   ← 最严：既要守底线，又要推进目标①
阶段②  canHard && canSoft                              ← 中：守底线 + 软约束
阶段③  canHard                                          ← 最松：只守底线，尽量凑 target
```

**为什么要分三段而不是"一个循环里按优先级判断"**：分阶段让**优先级显式**（"先满足质量目标① → 再用软约束② → 最后死守底线③"），代码可读、可测、也容易改（想加第四阶段就再加一个循环）。

### 14.4 结果、假设与性能

**能挖到 `target` 吗**（诚实说明）：
- 阶段③ 会一直尝试到 `removed === target` **或**"再没有满足 `canHard` 的格子"；
- 实践上 9 阶的 `target ∈ [33, 52]` **远低于**"硬底线允许的最大挖空量"（还要考虑行/列/宫各自 ≥1 的联合约束）→ **总能挖够**；
- **隐含假设**：如果把 `target` 调到接近理论上限，可能出现"挖不够"→ 这时题面比例会**偏小**（极端情况可能低于 40% 下限）。这是本实现的一个隐含前提，**知道它比不知道好**。

**性能**：三次扫描各 `O(S²)`，每次判断 `canHard`/`canSoft` 都是 O(1)（读计数器）→ **总体 `O(S²)`**。
对 9 阶（81 格）来说**完全可忽略**（比求解器补全的耗时小得多）。

**谁在调用**：`generatePuzzle`（§13.4）→ `services/sudoku/worker.ts`（Worker 生成通道）。
**为什么它在 core 而不是 Worker 里**：它是**纯算法**（不碰 DOM/网络）→ 放 core 才能被"未来可能的其它调用方"复用、也最容易被测试。

**回头看一眼这条链（把 §13/§14 串起来）**：

```
Worker 收到 { kind:'generate', boxSize, blanks }
  → generatePuzzle(boxSize, blanks, rng)
      → generateSolution(boxSize, rng)          §13：模式盘 → 变换 → 保留骨架 → solveGrid 补全
      → digPuzzle(solution, blanks, rng)        §14：三阶段挖空（保证不出现空行/列/宫 + 尽量均匀）
  → { puzzle, solution }                        → postMessage 回主线程（01 册 §3.7）
  → 前端：puzzle 进 store 当可玩盘；solution 用于"参考答案"遮罩
```

---

## 15. `core/game/derive.ts`（20 行 · 3 个导出）—— 棋局派生

**① 这个文件是干嘛的**：把"**事实**"派生成"**对外要用的值**"：状态、提示文案、百分数。
**它为什么在 core**：三件都是**纯计算**（给事实 → 给结果），而**页面/组合式都不许写算式**（R6/R7）→ 算式必须在这里。

```ts
/** 状态推导：已胜 > 无盘面 > 进行中 */
export const statusOf = (hasBoard: boolean, isWin: boolean): GameStatus =>
    isWin ? GAME_STATUS.Won : hasBoard ? GAME_STATUS.Playing : GAME_STATUS.Idle

/** 提示文案；未选中 / 锁定 / 有候选三种分支 */
export const hintTextOf = (cell: Cell | null, candidates: number[]): string => {
    if (!cell) return '请选中一个格子'
    if (cell.lock) return '无法更改初始题目'
    return `此格可以填：${candidates.join('、') || '无'}`
}

/** 比例 → 显示用整数百分数 */
export const percentOf = (ratio: number): number => Math.round(ratio * 100)
```

### 15.1 `statusOf`：状态是**推导**出来的，不是"维护"出来的

**真实调用点（`stores/game.ts:38`）**：

```ts
const status = computed<GameStatus>(() => statusOf(!!board.value.length, isWin.value))
```

**为什么不用一个 `status` 字段到处改**：如果 store 里存 `status`，那么"落子→判胜→改 status""重开→改 status""换盘→改 status"……**每个动作都得记得改**，漏一个就出现"通关遮罩没弹"或"赢了还显示进行中"。
**改成 `computed(statusOf(...))`**：状态**永远由事实（有没有盘 + 是否已胜）决定** → **不可能不一致**。
> 这是"**派生数据不存**"（01 册 §2.4）在 core 侧的体现：**能算出来的，一律现算**。

**注意 `!!board.value.length`**：把长度转成布尔（`0 → false`）—— 否则会往 `boolean` 参数里传数字（TS 也会拦）。

### 15.2 `hintTextOf`：提示文案的三个分支

**真实调用点（`useGameFlow.ts:63-64`）**：

```ts
const cands = gameStore.selected ? gameStore.getCandidates(gameStore.selected) : []
tip.value = hintTextOf(gameStore.selectedCell, cands)
```

| 分支 | 条件 | 文案 |
|---|---|---|
| ① | `!cell`（没选中格） | "请选中一个格子" |
| ② | `cell.lock`（题目给定格） | "无法更改初始题目" |
| ③ | 其它（空格） | "此格可以填：3、5、7" |

**亮点是 `candidates.join('、') || '无'`**：
- `[3,5,7].join('、')` → `'3、5、7'`；
- **`[].join('、')` → `''`**（空串 falsy）→ `|| '无'` 生效 → "此格可以填：无"。

**"无候选"这个提示很有价值**：它说明这个空格**三个方向都被堵死**（按规则不该发生）→ 等于告诉玩家"你前面某个数字放错了"。**文案本身就是诊断信息。**

**注意文案全在 core 里**（不散落在组合式）：想改措辞只改这里。

### 15.3 `percentOf`：百分数（**算式出口**）

**真实调用点**：
- `useDifficultyFlow.ts:24`：`const blankPercent = computed<number>(() => percentOf(draft.value.blankRatio))`（难度页显示"挖空 45%"）；
- `core/message.ts:16`：拼"（当前 30%）"。

**为什么这也要放 core**：`Math.round(ratio * 100)` 是算式（页面禁 `Math.`、组合式也禁）→ **必须由 core 提供**。
**顺带的好处**：所有百分数**舍入方式一致**（都是 `Math.round`），不会"这里四舍五入、那里向下取整"。

---

## 16. `core/message.ts`（27 行 · 3 个导出）—— 全站文案与提交校验的唯一出口

**① 这个文件是干嘛的**：**"错误与提示文案"的中央车站**。项目里十几处写错误文案的地方，全部经过它。

```ts
/** 统一错误文案：Error（含 ApiError，message 本身就是后端文案）直接用，否则用调用方兜底 */
export const errorTextOf = (err: unknown, fallback: string): string =>
    err instanceof Error ? err.message : fallback

/** 挖空比例不合规 → 文案；'' = 通过（当前百分比由 core 自己算，调用方不写算式） */
export const blankRatioErrorOf = (blanks: number, boxSize: number): string =>
    isBlankRatioOk(blanks, boxSize)
        ? ''
        : `${RATIO_COPY.bad}（当前 ${percentOf(blanks / cellCountOf(boxSize))}%）`
```

### 16.1 `errorTextOf`：一行函数，十几个调用点

**真实调用点（grep 出来的全部）**：

| 位置 | 兜底文案 |
|---|---|
| `useAuth.ts:81` | '请求失败，请重试' |
| `useCreateFlow.ts:80` | '提交失败，请重试' |
| `useCustomFlow.ts:114` | '提交失败，请重试' |
| `useDifficultyFlow.ts:36` | '生成失败，请重试' |
| `useEditFlow.ts:46 / 66` | '题目加载失败' / '保存失败，请重试' |
| `useMyPuzzles.ts:70` | `failText`（按场景传入） |
| `usePuzzleDetail.ts:55` | '题目加载失败' |
| `useSolveFlow.ts:133` | `SOLVE_COPY.fail` |
| `stores/puzzle.ts:41 / 83` | '加载失败，请重试' / '题目加载失败' |

**它解决的核心问题**：**"错误对象 → 给用户看的文案"只有一套规则**：

```ts
err instanceof Error ? err.message : fallback
```
- **`Error`（含 `ApiError`）→ 直接用 `message`**：因为 `services/api/client.ts` 抛错时**已经把后端的 `{error}` 塞进 `message`**（02 册 §2.4 的约定）→ **后端写的中文文案原样显示给用户**；
- **非 `Error`（字符串 / `null` / 任意对象）→ 用调用方兜底**：避免 `undefined`、`[object Object]` 这种垃圾出现在 UI 上。

**为什么参数是 `unknown` 而不是 `Error`**：`catch (err)` 抓到的**真的是未知类型** → 用 `unknown` 强制"先判断再使用"（00 册 §4.7）。
**为什么兜底文案由调用方传**：不同场景说不同的话（"生成失败" vs "保存失败"）→ **core 提供机制，调用方提供语境**。

### 16.2 `blankRatioErrorOf`：比例不合规的提示（**`''` = 通过**）

```ts
isBlankRatioOk(blanks, boxSize) ? '' : `${RATIO_COPY.bad}（当前 ${percentOf(blanks / cellCountOf(boxSize))}%）`
```

**三个设计点**：

1. **返回 `string`，`''` 表示通过**（而不是 `null` / `boolean`）→ 调用方写得极简洁（`useCustomFlow.ts:78`）：
   ```ts
   const bad = blankRatioErrorOf(countBlanks(p.board), p.boxSize)
   if (bad) { error.value = bad; return }
   ```
   > **知识点：把"是否失败 + 失败原因"合并成一个可判真假的值**（空串 falsy）—— JS 里非常实用的模式，也叫"**错误即文案**"。
2. **百分比由 core 自己算**（注释原话："调用方不写算式"）→ 调用方不需要 `percentOf` / `cellCountOf`（**信息隐藏**）。
3. **文案来自 `RATIO_COPY.bad`**（`constants/game.ts`）→ 文案集中；**范围写文案里、算法写 `isBlankRatioOk` 里，两者必须同值** —— 这正是 02 册那个 bug 的教训。

**顺带验证前后端一致**（02 册修完 bug 之后）：
- 前端 → `RATIO_COPY.bad + '（当前 30%）'` = **"挖空比例需在 40%~65% 之间（当前 30%）"**
- 后端（`functions/utils/puzzle.ts:23`）→ `` `${RATIO_COPY.bad}（当前 ${Math.round(...)}%）` `` = **同一句话** ✅

### 16.3 `puzzleSubmitErrorOf`：提交题面的校验（**顺序即优先级**）

```ts
/**
 * 提交题面的校验（出题 / 编辑共用）：整盘全空 → 有空行/列/宫 → 冲突 → 40%~65%
 * '' = 通过；否则返回第一条不合格的文案（书写顺序即报错优先级）
 */
export const puzzleSubmitErrorOf = (numBoard: NumBoard, boxSize: number, sudoku: Sudoku): string => {
    if (isBlankBoard(numBoard)) return '题目不能全空'
    if (sudoku.hasEmptyGroup(numBoard)) return EMPTY_GROUP_COPY.bad
    if (sudoku.hasConflict(numBoard)) return '题面存在冲突，请先修正'
    return blankRatioErrorOf(countBlanks(numBoard), boxSize)
}
```

**真实调用点（`usePuzzleStage.ts:36`）**：

```ts
const bad = puzzleSubmitErrorOf(gameStore.numBoard, gameStore.config.boxSize, gameStore.sudoku)
```

**为什么返回"第一条"而不是"所有错误"**：**用户一次只能改一处**，一次抛 4 条只会让人困惑。**按"从根本到细节"排序**：

| 顺序 | 检查 | 为什么在这个位置 |
|---|---|---|
| ① | 整盘全空 | 最根本：什么都没填 |
| ② | 有空行/列/宫 | 结构问题：题目会缺线索 |
| ③ | 有冲突 | 规则问题：重复数字 |
| ④ | 挖空比例 | 最后才是"调参"问题（前三项都对了才有意义） |

**注意它接受 `sudoku: Sudoku` 参数**（而不是自己 `getSudoku(boxSize)`）：
- **依赖注入**：调用方（`usePuzzleStage`）本来就有 `gameStore.sudoku` → 直接复用，不必再查缓存；
- 也让这个函数**更好测**（可以传一个假的 `Sudoku`）。

**与后端的关系**：后端 `checkPuzzle`（02 册 §5.5）**不调这个函数**（它要的是"HTTP 错误"而不是"文案"），但调的是**同一批 core 校验函数**（`isBlankBoard` / `hasEmptyGroup` / `isBlankRatioOk` / `validatePuzzle`）→ **规则一份、措辞各自**。

---

## 17. `core/page.ts`（29 行 · 5 个导出）—— 分页与列表条件的纯函数

**① 这个文件是干嘛的**：搜索页 / 我的题目页共用的分页计算 + 列表条件归一化。
**注释原话点出存在理由**：
> *"stores 与 composables 都不许写 `Math.` → 页数、收敛、offset、条件归一化一律从这里取"*

```ts
/** 总条数 → 总页数（无数据也算 1 页，避免页码出现 0） */
export const pageCountOf = (total: number, size: number): number => {
    if (size <= 0 || total <= 0) return 1
    return Math.ceil(total / size)
}

/** 页码收敛到 [1, pageCount] */
export const clampPage = (page: number, pageCount: number): number => {
    if (page < 1) return 1
    return page > pageCount ? pageCount : page
}

/** 页码 → 接口 offset */
export const offsetOf = (page: number, size: number): number => (page - 1) * size

/** 原始值（URL query）→ 合法排序：只认 hot，其余一律 time */
export const sortOf = (raw: unknown): ListSort => (String(raw ?? '') === SORT.Hot ? SORT.Hot : SORT.Time)

/** 原始值（本地偏好）→ 合法分页形态：只认 slider，其余一律 bar */
export const pagerModeOf = (raw: unknown): PagerMode =>
    String(raw ?? '') === PAGER_MODE.Slider ? PAGER_MODE.Slider : PAGER_MODE.Bar
```

### 17.1 三个分页函数（真实调用点已核）

| 函数 | 调用点 | 作用 |
|---|---|---|
| `pageCountOf` | `stores/puzzle.ts:26`：`computed(() => pageCountOf(total.value, LIST_PAGE_SIZE))` | 总条数 → 总页数 |
| `clampPage` | `useListQuery.ts:57`：`const bounded = clampPage(page.value, opts.pageCount())` | 越界收敛 |
| `offsetOf` | `services/api/puzzleApi.ts:24/34`：`offset: offsetOf(page, size)` | 第 N 页 → `LIMIT/OFFSET` 的 offset |

**四个细节**：

1. **`pageCountOf` 对"无数据"返回 `1`**（注释："避免页码出现 0"）：否则会出现"第 1 页 / 共 0 页"，甚至算出 `offset = -1`。
2. **`clampPage` 的隐含契约**：它只处理"低于 1"和"高于 pageCount"，**没处理 `pageCount < 1`**（那时会返回 `pageCount`）→ 它**必须配 `pageCountOf` 使用**（后者保证 ≥1）。**这种"配套函数"的约定，写在文档里比写在代码里更合适。**
3. **`offsetOf = (page-1) * size`**：页码 1-based、offset 0-based —— **这个 `-1` 是 off-by-one 的经典来源**，收在 core 一处就不会各写各的。
4. **R15 的两条收敛规则就落在这里**（03 册 §4 R15）：换排序/关键词 → 重置第 1 页（`useListQuery` 配合 `clampPage`）；页码越界 → 收敛到最后一页。

### 17.2 两个归一化函数（**白名单模式**）

```ts
String(raw ?? '') === SORT.Hot ? SORT.Hot : SORT.Time
```

**逐点**：
- **`raw: unknown`**：入参来自 URL query（可能是 `undefined`、数组、任意字符串）→ 用 `unknown` 强制先判断；
- **`String(raw ?? '')`**：`??` 先把 `null/undefined` 变 `''`，`String` 再统一成字符串；
- **只认一个值**（`'hot'` / `'slider'`），**其它一切回落默认**（`'time'` / `'bar'`）→ 与后端 `ORDER BY` 白名单（02 册 §3.4）**同一种思路**：**不接受白名单以外的输入**。

**真实调用点**：
- `useListQuery.ts:35/38`：`pagerMode = ref(pagerModeOf(readPref(PREF_KEY_PAGER_MODE)))` —— **从 localStorage 读出来的值也必须归一化**（用户可能手改过、可能是旧版本格式）；
- `useListQuery.ts:50/66`：`changeSort` / 读 `route.query.sort` —— **URL 是不可信输入**（用户可以随手改地址栏）。

> **一句话记住这个模式**：**"外部来的值（URL / localStorage / 接口）→ 先归一化再用"**。
> core 里的 `sortOf` / `pagerModeOf`、后端的 `visibilityOf`、`shape.boxSizeOf` 都是同一族函数。

**本册 16 个文件到此讲完**。回头看一遍 §1.2 的依赖图，你现在应该能"顺着箭头"把每个文件的职责、边界与调用方都串起来了。

---

## 18. 本册自测（20 题，覆盖全部 16 个文件）

### 基础层（array / metrics / model / ops / zoom / shape）

1. `shuffle` 为什么必须**从后往前**遍历？如果写成"每次从整个数组里随机选一个下标交换"，会出什么问题？
2. `makeGrid(S, fn)` 为什么参数是**工厂函数**而不是"值"？用 `new Array(S).fill(new Array(S).fill(0))` 会出什么事故？
3. `boardSideOf(contentWidth, zoom)` 里"**先夹紧 base、再乘 zoom**"这个顺序带来什么行为？（提示：放大能不能突破 `maxSide`？）
4. `offsetToCell` 在什么情况下返回 `null`？为什么"正好点在画布右下边界"也算越界？
5. `fromPuzzle(nums, true)` 与 `fromPuzzle(nums, false)` 的区别是什么？各自用在哪两个真实场景？
6. 为什么"要算之前先 `toNum`"？（提示：算法只吃 `NumBoard`、后端没有 `Cell`）
7. `givenBoard(board)` 和 `toNum(board)` 都能得到 `NumBoard`，为什么导出题面必须用前者？
8. `defaultZoomOf(boxSize)` 的键是宫边长 `B` 还是盘面边长 `S`？9×9 对应哪个值？搞错了会看到什么现象？
9. `canZoomInFrom` 里的 `EPS = 1e-9` 是防什么的？为什么说"当前 step=0.25 时它其实是保险"？
10. `isBlankRatioOk` 在 9×9 上：挖 32 格能过吗？挖 53 格呢？（说出判定依据的算式）

### 解析与规则（parse / rules）

11. `parseNumBoard` 的**四道关卡**各拦什么？为什么"36 个格子的 6×6 盘面"不合法？（提示：`S = B²`）
12. `rules.createSudoku` 为什么做成**工厂**（闭包固化 `B`/`S`）？如果做成全局函数会多出什么麻烦？
13. `getCandidates` 为什么用 `boolean[]` 标记数组而不用 `Set`？`new Array(S + 1)` 里的 `+1` 是为了什么？
14. `findConflicts` 与 `hasConflict` 的区别是什么？各自被谁用？为什么值得写成两个函数？
15. `hasEmptyGroup` 里 `grid[r]?.[c]` 的 `?.` 去掉会怎样？为什么这个检查**只给"手选题面"用**？
16. `validatePuzzle` 的四步顺序为什么不能乱？**缺第 ① 步（`sameShape`）**会导致什么错误？
17. `getSudoku` 的 `Map` 缓存为什么是 R11 的**合法例外**？（说清"可观察等价于纯函数"是什么意思）

### 求解链（tracker / solver / multiSolver）

18. `tracker.pickCell` 的 MRV 为什么能显著加速？返回值里 `full` 与 `dead` 各代表什么？
19. `tracker.place` 里 `drop` 的第二个守卫 `!cand[i][j][n]` 是防什么的？（说清"同一格被行和宫扫两次"的后果）
20. 撤销为什么要用"**返回闭包**"而不是"复制整盘快照"？`solveGrid` 的回调为什么必须收到**拷贝**？

### 生成链（generator / digger）与上层（derive / message / page）

> 追加 6 题（共 26 题，前 20 题为必答）：

21. `patternBoard` 的公式 `((r*B + ⌊r/B⌋ + c) mod S) + 1` 为什么能保证**每行/每列/每宫都是 1..S 各一次**？（至少说出"行"和"列"的论证思路）
22. `randomTransform` 的六种变换里，为什么"行交换"只能在**同一宫带内**？"整带交换"为什么就允许？
23. `keepRatioOf` 为什么"盘面越大保留越多"？保留太少会发生什么（结合 `solveGrid` 的 `maxIter` 与 Worker 超时说）？
24. `digPuzzle` 里"**硬底线**（`canHard`）"与"**质量目标**（`rowDug/colDug/boxDug`）"分别保证什么？三阶段为什么越来越松？
25. `digPuzzle` 的 `target` 为什么要收敛到 40%~65%？（与提交校验、后端复校有什么关系？）
26. `hintTextOf` 的 `candidates.join('、') || '无'` 里，空数组为什么能走到 `'无'` 分支？"无候选"这个提示对玩家意味着什么？

---

## 附：本册速查表（16 个文件的一句话）

| 文件 | 一句话 | 最该记住的点 |
|---|---|---|
| `array.ts` | 四个通用数组工具 | 洗牌从后往前；造网格必须用工厂函数 |
| `board/metrics.ts` | 像素 ↔ 格子换算 | 先夹紧 base 再乘 zoom；`offsetToCell` 三种 null |
| `board/model.ts` | 两种盘面互转 | `lock` 是"题目给定"的标记；`r*S+c` 与 `toRC` 成对 |
| `board/ops.ts` | 盘面六种操作 | `givenBoard` 才能导出"纯题面" |
| `board/zoom.ts` | 缩放规则 | 键是 `B`；`EPS` 防浮点导致按钮"能点没反应" |
| `sudoku/shape.ts` | 尺寸与比例 | `B⁴` 关系；`boxSizeOf` 用平方回验 |
| `sudoku/parse.ts` | 字符串 ↔ 盘面 | 四道关卡；总格数必须是"四次方数" |
| `sudoku/rules.ts` | 规则唯一实现 | 工厂 + `Map` 缓存（E1）；`findConflicts`/`hasConflict` 双版本 |
| `sudoku/tracker.ts` | 候选簿记器 | MRV；`drop` 双守卫；撤销闭包（E7） |
| `sudoku/solver.ts` | 回溯引擎 | 一个引擎两种策略；冲突必须先拦；`maxIter` 保险丝 |
| `sudoku/multiSolver.ts` | 多解枚举 | 上限归一化 `[1,50]`；返回 `[]` 而非 `null` |
| `sudoku/generator.ts` | 生成器 | 模式盘公式；六种保合法变换；保留比例随尺寸上调 |
| `sudoku/digger.ts` | 挖空器 | 三阶段递减严格度；硬底线 vs 质量目标 |
| `game/derive.ts` | 棋局派生 | 状态是推导的不是维护的 |
| `message.ts` | 文案与提交校验中央车站 | `errorTextOf` 一行服务十几处；`''` = 通过 |
| `page.ts` | 分页纯函数 | `(page-1)*size`；外部值先归一化再用 |

**到这里，`core/` 你已经完整读过一遍了。** 接下来（下一册 05）进入 `stores/`，看这些纯函数**被谁在什么时候调用**、状态**怎么被组织成"唯一真源"**。





















