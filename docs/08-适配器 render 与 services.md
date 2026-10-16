# 08 · 适配器层：render 与 services

> **这一册讲什么**：**唯一碰"外部世界"的两层** —— `render/`（canvas）与 `services/`（HTTP / Worker / localStorage）。
> **前置**：00 册 §2（`fetch` 与 `import.type`）、01 册 §3（canvas / DPR / Worker / localStorage）、04 册（core 的纯函数）。

---

## 0. 这一册的固定结构

| 段 | 内容 |
|---|---|
| **① 它是谁** | 一句话定位 + 依赖规则（它允许 import 什么、禁止什么） |
| **② 逐段解释** | 真实代码 + "为什么这么写" |
| **③ 边界与坑** | 出错会怎样、有什么隐含前提 |
| **④ 谁在用它** | 调用方（前向引用） |

---

## 1. 全景：三类适配器

### 1.1 什么是"适配器"

**适配器 = 项目与外部世界之间的那层薄壳。**
外部世界是"不纯"的（会失败、有状态、有环境差异），把不干净的东西**集中封在少数文件里**，其余 90% 的代码（core / stores / composables / 组件）才能保持干净。

| 适配器 | 目录 | 唯一碰的东西 | 文件 |
|---|---|---|---|
| **渲染适配器** | `render/` | **canvas**（`ctx` / `devicePixelRatio`） | `geometry.ts` · `board.ts` · `layer.ts` · `paint.ts` · `dirty.ts`（五文件） |
| **服务适配器** | `services/` | **HTTP**（`fetch`）· **Worker**（`new Worker`）· **本地存储**（`localStorage`） | `prefs.ts` · `api/{client,session,userApi,puzzleApi}.ts` · `sudoku/{worker,workerClient}.ts` |
| **后端适配器** | `functions/`（仓库顶层） | D1（`D1Database` / `PagesFunction`） | 见 **02 册** |

### 1.2 依赖规则（R2 矩阵）

```
render/    允许：render/ · core/ · constants/ · types/        外部包：无
services/  允许：services/ · core/ · constants/ · types/      外部包：无
          ❌ 不许 stores/（否则形成"请求层反向依赖状态层"的环）
          ❌ 不许 vue-router
          ❌ 全局禁 axios（统一用 fetch）
```

**为什么"服务适配器"不许碰 store**（03 册 §3.2 ④ 已详述）：会让"请求"与"全局状态"绑死，并形成循环依赖。
**那 401 怎么通知 store 清登录态**？→ **回调注册**（`onUnauthorized`），方向还是"上层 → 下层"✅

### 1.3 一句话记住这一层的职责

| 层 | 它回答的问题 |
|---|---|
| `core` | **怎么算**（纯函数） |
| `services` | **从哪拿 / 往哪写**（网络、存储、线程） |
| `render` | **怎么画到像素上** |

---

## 2. `render/` 五个文件（geometry 34 · board 96 · layer 62 · paint 76 · dirty 89 行）—— canvas 渲染器

> **旧名映射（2026-10 拆文件前）**：`render/board.ts` 的 `setupCanvas` → **`prepareCanvas`**；几何计算从 `board.ts` 移出 → **`render/geometry.ts` 的 `boardGeometryOf`**；`renderBoard` 拆成分离的 **`paintBoard`（整盘）/ `paintDirtyCells`（局量）**。本节若还有旧名，一律按此对应理解。

**① 它是谁**：**唯一把棋盘画到 canvas 上的地方**（拆成 5 个小文件：`geometry` 几何 / `paint` 单格 / `layer` 线层 / `dirty` 脏格 / `board` 适配与绘制，一文件一职责）。
**依赖**：`constants/board`（颜色/字体/线宽）+ `core/board/metrics`（尺寸换算）+ `types` —— **不碰 store、不碰业务**。

**分工与导出**（**类型全部在 `types/render.ts`**：`BoardGeometry` / `CellFonts` / `FrameState` / `RedrawMode`）：

| 文件 | 导出 | 作用 |
|---|---|---|
| `geometry.ts` | `measureContentWidth(parent)` · `boardGeometryOf(canvas, size, zoom, contentWidth?)` | **纯计算**：内容宽 → CSS 边长 → 每格边长 → 位图边长（DPR 在这里读） |
| `board.ts` | `prepareCanvas(canvas, g)` | **唯一写 DOM 的点**：按几何设位图/CSS 尺寸 + 坐标系；返回 `{ ctx, resized }` |
| | `paintBoard(ctx, g, params, layer)` | **整盘重绘**（纯绘制） |
| | `paintDirtyCells(ctx, g, params, dirty, layer)` | **局量重绘**（纯绘制） |
| | `getClickPos(canvas, e, size)` | 点击 → 行列坐标 |
| `layer.ts` | `drawLinesOn(...)` · `linesLayerKeyOf(...)` · `createLinesLayer(...)` | 网格线画法 + **离屏线层**（**纯工厂、不缓存**；层由调用方保管，见 §2.3） |
| `paint.ts` | `fontsOf(cellSize)` · `paintCell(...)` · `blitCellLines(...)` | 一格的内容（**两种重绘共用**）+ 把线层贴回一格 |
| `dirty.ts` | `makeFrameState` · `fillFrameState` · `dirtyCellsOf` · `redrawModeOf` | **纯函数模块**：帧快照 + 脏格 + 走整盘还是局量（见 §2.3 的"局量重绘"） |

> **一句话记这一层**：**几何是纯计算、绘制是纯绘制、只有 `prepareCanvas` 碰 DOM**；
> 状态（上一帧快照 / 线层 / 上次边长）全部由调用方 `useBoardCanvas` 持有 —— `render/` 里没有一行模块级可变状态。


### 2.1 `geometry.ts` 的 `measureContentWidth`：量容器（**在 `boardGeometryOf` 与 `useBoardCanvas.measure` 各调一次**）

> **它在 `render/geometry.ts`**（几何的输入之一）；**重绘路径不读布局** —— 宽度由 ResizeObserver 量一次存进 ref，之后一路传进来。

```ts
/**
 * 量一次容器的「内容宽」（去掉左右 padding）
 * 只在 ResizeObserver 回调/首帧调用，避免每次重绘都触发强制布局
 */
export const measureContentWidth = (parent: HTMLElement): number => {
    const style = getComputedStyle(parent)
    return parent.clientWidth - (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight))
}
```

**三个知识点**：
1. **`getComputedStyle` + `clientWidth` 都会让浏览器"结算布局"（强制 reflow）** → 所以注释强调"**只在 ResizeObserver 回调/首帧调用**"（01 册 §3.9 的性能纪律）；
2. **为什么减 padding**：`clientWidth` 包含 padding → 棋盘要贴在"内容区"里，必须减掉左右 padding（否则棋盘会溢出一点点）；
3. **`parseFloat('12px')`**：计算样式返回的是带单位的字符串 → `parseFloat` 取数字（`'12px'` → `12`）。

### 2.2 `geometry.ts` + `prepareCanvas`：几何与画布适配（**DPR 的核心**）

**几何（纯计算）** —— 算出来的东西由调用方保管：

```ts
/** 解析棋盘几何：容器宽（没给就量一次）→ CSS 边长 → 每格边长 → 位图边长 */
export const boardGeometryOf = (canvas, size, zoom, contentWidth?): BoardGeometry | null => {
    const parent = canvas.parentElement
    if (!parent || size <= 0) return null

    const dpr = window.devicePixelRatio || 1
    const width = contentWidth ?? measureContentWidth(parent)
    const side = boardSideOf(width, zoom)
    return { side, cellSize: cellSizeOf(side, size), pixel: Math.round(side * dpr), dpr }
}
```

**画布适配（`render/` 里唯一写 DOM 的点）** —— `render/board.ts`：

```ts
/** 初始化画布：清晰度、尺寸、坐标对齐；resized = 位图刚被重建（画面已空，只能整盘重画） */
export const prepareCanvas = (canvas: HTMLCanvasElement, g: BoardGeometry): { ctx; resized } => {
    let resized = false
    if (canvas.width !== g.pixel) {              // 赋值会清空位图 + 重置上下文状态
        canvas.width = g.pixel
        canvas.height = g.pixel
        resized = true
    }
    canvas.style.width = `${g.side}px`
    canvas.style.height = `${g.side}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return { ctx: null, resized }

    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0)   // 之后一律按 CSS 像素画
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    return { ctx, resized }
}
```

> **为什么要拆成两半**：`boardGeometryOf` 是**纯计算**（同入参 → 同结果，可单测），
> `prepareCanvas` 是**副作用**（写 canvas 尺寸、取画笔）。
> 混在一起时几何没法单独测、也没法在别处复用（"点击换算"也要用 `side`）；现在**几何算一次、处处用同一份**。

| 步骤 | 代码 | 说明 |
|---|---|---|
| ① | `const dpr = window.devicePixelRatio \|\| 1` | 高清屏比例；`\|\| 1` 兜底（某些环境是 `undefined`） |
| ② | `width = contentWidth ?? measureContentWidth(parent)` | **优先用外部量好的宽度**（性能，见 2.1）；没传才自己量（**兜底**，E6 登记的就是这条兜底分支） |
| ③ | `side = boardSideOf(width, zoom)` | **尺寸算法在 core**（04 册 §3.1），这里只调用 |
| ④ | `pixel = Math.round(side * dpr)` | **物理像素 = CSS 像素 × dpr** |
| ⑤ | `if (canvas.width !== pixel) { … }` | **像素尺寸**：给 `canvas.width` 赋值会**清空画布 + 重置状态** → 尺寸没变就别赋（性能 + 不打断） |
| ⑥ | `canvas.style.width/height = …` | **CSS 尺寸**：与像素尺寸**必须分别设**（§3.3 的"两者不能只设一个"） |
| ⑦ | `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` | **坐标系整体放大 dpr 倍** → 之后所有绘制坐标按 **CSS 像素**写 |
| ⑧ | `textAlign: 'center'` + `textBaseline: 'middle'` | 让 `fillText` 的坐标 = **格子中心**（否则默认是从基线/左边开始，数字会偏） |
| ⑨ | 返回 `{ ctx, resized }` | `ctx` 交给下游绘制；**`resized = true` 表示位图刚被重建**（画面已清空 → 本次只能整盘重画，`dirty.ts` 的 `redrawModeOf` 会据此退回 `full`） |

**⑩ `if (!parent) return null`**：极端情况（canvas 还没挂到 DOM）→ 返回 `null` 让调用方早退（**不抛错**，与 core 的"用返回值表达失败"一致）。

### 2.3 `paintBoard`：画一整盘（**顺序就是图层顺序**）

```ts
export const paintBoard = (ctx: CanvasRenderingContext2D, g: BoardGeometry, params: BoardRenderInput, layer: HTMLCanvasElement | null): void => {
    const { board, selected, conflictMask, boxSize } = params
    if (!board.length) return

    const size = board.length
    const fonts = fontsOf(g.cellSize)              // 两种字重预先拼好（paint.ts）
    …
    // 擦干净 + 铺白底
    ctx.clearRect(0, 0, side, side)
    ctx.fillStyle = BOARD_COLOR.bg
    ctx.fillRect(0, 0, side, side)

    // 逐格画内容（paint.ts 的 paintCell：底色 → 数字 → 选中框）
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            paintCell(ctx, board, conflictMask, selected, r, c, cellSize, fonts)
        }
    }

    // 网格线：优先一次贴离屏层（1 次调用顶掉 3S 次 stroke）；拿不到层才逐条画
    if (layer) ctx.drawImage(layer, 0, 0, g.side, g.side)
    else drawLinesOn(ctx, size, boxSize, g.side, g.cellSize)
}
```

**① 四个"早退"（全部是"不抛错"）**：
| 检查 | 为什么 |
|---|---|
| `!board.length` | 空盘（还没开局）→ 什么都不画 |
| `boardGeometryOf` 返回 `null`（没 parent / `size ≤ 0`）· 或 `prepareCanvas` 拿不到 2d 上下文 | 都是**不抛错**：几何算不出来就不画；画笔拿不到也不画（比如 canvas 被浏览器禁用） |
| `zoom = 1` 默认值 | `BoardRenderInput.zoom` 是可选的 → 缺省按 1 倍 |
| `board.length` 当 `size` | **盘面边长 = 棋盘行数**（`Board` 是方阵，所以不用另外传 S） |

**② 字体字符串在循环外拼好**（性能小节）：
```ts
const fontGiven = `${BOARD_FONT.given} ${fontSize}px ${BOARD_FONT.family}`
```
`ctx.font` 的赋值是**昂贵**的（浏览器要解析字体串）→ **每格都拼一次就会白费**；
而且**两种字重（题目粗 / 玩家常规）预先拼成两个字符串**，格子里直接用（见 `paint.ts` 的 `paintCell`）。
> **知识点**：**canvas 的"状态设置"（`font` / `fillStyle` / `lineWidth`）比"绘制命令"更贵** —— 能挪到循环外就挪出去。

**③ 绘制顺序 = 图层顺序**（一定要记住）：
```
① clearRect  清干净
② 铺白底
③ 逐格画（每格：底色 → 数字 → 选中框）
④ 最后画网格线（压在格子上）
```
**为什么线在最后**：网格线要**覆盖**在格子底色与数字之上（否则会被格子底色盖住）。
**为什么先铺白底**：`clearRect` 之后是**透明**的；如果只透明不铺白，深色主题/纱窗背景下会透出后面的东西。

#### `paint.ts` 的 `paintCell`：一格的三层（底色 → 数字 → 选中框）

```ts
/** 画第 r 行第 c 列的内容 */
export const paintCell = (
    ctx: CanvasRenderingContext2D,
    board: Board,
    conflictMask: ConflictMask | undefined,
    selected: Position | null | undefined,
    r: number,
    c: number,
    cellSize: number,
    fonts: CellFonts,
): void => {
    const cell = board[r][c]
    if (!cell) return

    const x = c * cellSize
    const y = r * cellSize

    // 底色（冲突格红底）
    ctx.fillStyle = conflictMask?.[r]?.[c] ? BOARD_COLOR.conflictBg : BOARD_COLOR.bg
    ctx.fillRect(x, y, cellSize, cellSize)

    // 数字（题面粗体深色 / 玩家常规蓝色）
    if (cell.v !== 0) {
        ctx.font = cell.lock ? fonts.given : fonts.player
        ctx.fillStyle = cell.lock ? BOARD_COLOR.givenText : BOARD_COLOR.playerText
        ctx.fillText(String(cell.v), x + cellSize / 2, y + cellSize / 2)
    }

    // 选中框（内缩半个线宽，笔画才不会越到邻格）
    if (selected && selected[0] === r && selected[1] === c) {
        const inset = BOARD_LINE.selected / 2
        ctx.strokeStyle = BOARD_COLOR.selectedBorder
        ctx.lineWidth = BOARD_LINE.selected
        ctx.strokeRect(x + inset, y + inset, cellSize - BOARD_LINE.selected, cellSize - BOARD_LINE.selected)
    }
}
```

> **为什么把它单独放一个文件（`render/paint.ts`）**：**整盘重绘与局量重绘都要用它** ——
> 它只管"一格的内容"（不清屏、不画网格线、不算尺寸），所以两种重绘路径能**共用同一份**，
> 从而保证"局量画出来的像素 = 整盘画出来的那一格"。
> 同文件还有 `fontsOf(cellSize)`（预拼两种字重）与 `blitCellLines(...)`（把线层贴回一格，见 §2.4）。

**四个要点**：
1. **`x = c * cellSize` / `y = r * cellSize`**：**列 → x、行 → y**（写反了棋盘会转置 —— 这是最容易犯的错，**和 `[r, c]` 的顺序对照着看**）；
2. **`conflictMask?.[r]?.[c]`**：**两层可选链** —— 因为 `conflictMask` 本身是可选的、且可能比盘面小（防御不规则数据）；
3. **"锁定的格用粗体深色、玩家填的用常规蓝色"**：直接读 `cell.lock` **决定字体与颜色**（这就是 `Cell` 比 `number` 多带的那点信息的用途）；**注意 `lock` 变化也会改变像素** —— 局量重绘的快照因此必须把 `lock` 也记进去（§2.5）；
4. **选中框用 `inset = lineWidth / 2`**：
   `strokeRect` 是**沿路径居中描边**（笔画一半在内、一半在外）→ 不内缩半个线宽就会**盖住相邻格子**的边缘（看起来像越界）。
   `cellSize - BOARD_LINE.selected` 保证右边/下边与左边/上边**对称内缩**。

#### `layer.ts` 的 `drawLinesOn`：两遍画线（细线 + 粗线）

```ts
export const drawLinesOn = (ctx: CanvasRenderingContext2D, size: number, boxSize: number, side: number, cellSize: number): void => {
    ctx.strokeStyle = BOARD_COLOR.thinLine
    ctx.lineWidth = BOARD_LINE.thin
    ctx.beginPath()
    for (let i = 1; i < size; i++) {
        if (i % boxSize === 0) continue            // ① 跳过宫的边界（留给粗线画）
        const p = i * cellSize
        ctx.moveTo(p, 0); ctx.lineTo(p, side)
        ctx.moveTo(0, p); ctx.lineTo(side, p)
    }
    ctx.stroke()

    ctx.strokeStyle = BOARD_COLOR.thickLine
    ctx.lineWidth = BOARD_LINE.thick
    ctx.beginPath()
    for (let i = 0; i <= size; i += boxSize) {     // ② 两端都包含（0 与 size → 外框）
        const p = i * cellSize
        ctx.moveTo(p, 0); ctx.lineTo(p, side)
        ctx.moveTo(0, p); ctx.lineTo(side, p)
    }
    ctx.stroke()
}
```

**① `if (i % boxSize === 0) continue`**：**宫的边界跳过细线** —— 否则细线会被随后的粗线盖一半，边缘发虚（两条线错位会显得脏）。
**② `i <= size; i += boxSize`**：**粗线包含最外框**（`0` 与 `size`）→ 一次循环同时画出"宫分隔线 + 棋盘外框"。
**③ 两次 `beginPath() ... stroke()`**：**同一批线一次提交**（性能）；
**如果每条线都 `stroke()` 一次**，等于给浏览器发几千次绘制调用（36×36 盘面就是 72 条线）→ 慢且没必要。
> **知识点：`beginPath()` 开一批、`stroke()` 提交一批** —— canvas 里最常用的性能优化。

**④ 但"每帧都画这 3S 条线"仍然是浪费** —— 它们只随「`size` / `boxSize` / `side` / `cellSize` / DPR」变，
而重绘**每次落子都会发生**。所以现在把它画进一张**透明底的离屏层**：

```ts
/** 线层的尺寸签名（纯函数）：任一项变化都要重建 */
export const linesLayerKeyOf = (size: number, boxSize: number, g: BoardGeometry): string =>
    `${size}|${boxSize}|${g.side}|${g.cellSize}|${g.dpr}`

/** 建一张线层（**纯工厂**：同入参 → 同样的层；**不缓存**） */
export const createLinesLayer = (size: number, boxSize: number, g: BoardGeometry): HTMLCanvasElement | null => {
    const layer = document.createElement("canvas")        // 与主画布同像素尺寸
    layer.width = g.pixel
    layer.height = g.pixel
    const ctx = layer.getContext("2d")
    if (!ctx) return null
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0)
    drawLinesOn(ctx, size, boxSize, g.side, g.cellSize)   // 画法与上面完全一致
    return layer
}
```
**四个要点**：
1. **透明底**（层里不铺白底）：贴回主画布时**只叠线**、不会盖掉格子内容 ✅ 这正是"线压在内容之上"的落地方式；
2. **整盘重绘末尾一次 `ctx.drawImage(layer, 0, 0, g.side, g.side)`**：**1 次调用顶掉 3S 次 `stroke`**；
3. **工厂是纯的、不缓存**：`linesLayerKeyOf` 给签名、`createLinesLayer` 造层；**"要不要重建、层存在哪"由调用方决定**
   （`useBoardCanvas` 里就是 `if (key !== layerKey) { layer = createLinesLayer(...); layerKey = key }`）→ **渲染层没有隐藏状态**；
4. **拿不到 2d 上下文时返回 `null`** → 调用方走整盘 + `drawLinesOn` 逐条画（兜底、不丢网格线）。


#### 局量重绘：只重画"脏格"（`paintDirtyCells` + `dirty.ts`）

**动机**：一次落子只改变 1 格数字（+ 可能几十格的红底），但整盘重绘要重画 `S²` 格。
`B=10` 时整盘 1 万格 ≈ 10~30ms；而"填一个数"通常只涉及 **1~5 格**。

**链路**（`composables/board/useBoardCanvas.ts` —— **状态都在这里，判断全在纯函数里**）：
```
① boardGeometryOf(...)                      纯：几何（边长 / 格宽 / 位图边长）
② linesLayerKeyOf(...) 比签名 → 变了才 createLinesLayer(...)   纯签名 + 纯工厂（层存在这里）
③ prepareCanvas(canvas, geom) → { ctx, resized }              唯一副作用
④ fillFrameState(next, …) + dirtyCellsOf(prev, next)          纯：脏格
⑤ redrawModeOf(dirty, resized, side, lastSide) → 'dirty' | 'full'   纯：走哪条
⑥ paintDirtyCells(…) 或 paintBoard(…)                          纯绘制
⑦ 交换 prev / next（下帧以"刚画出来的那帧"为基准）
```

`render/dirty.ts` 是**纯函数模块**（可单测）：`dirtyCellsOf` 算脏格，`redrawModeOf` 决定路径。
```ts
/** 本帧该走哪条重绘路径（纯函数）：位图刚重建 / 边长变了 → 整盘；否则"有脏格"就走局量 */
export const redrawModeOf = (
    dirty: readonly number[] | null, resized: boolean, side: number, lastSide: number,
): RedrawMode => (dirty && !resized && side === lastSide ? 'dirty' : 'full')
```
```ts
export const dirtyCellsOf = (prev: FrameState, next: FrameState, maxRatio = 1 / 3): number[] | null => {
    const dirty: number[] = []
    for (let i = 0; i < total; i++) {
        if (nv[i] !== pv[i] || nl[i] !== pl[i] || nm[i] !== pm[i]) dirty.push(i)   // 值 / 归属 / 掩码
    }
    // 选中变化 → 旧格要去框、新格要画框（两个都要重画）
    if (a !== b) { if (a >= 0) dirty.push(a); if (b >= 0) dirty.push(b) }

    if (dirty.length > total * maxRatio) return null      // 太碎 → 整盘一遍更划算
    return dirty
}
```
**为什么"不会漏画"**（这是设计的关键）：**快照只记录"会被画出来的东西"** ——
`v`（数字）、`lock`（字体/颜色）、`mask`（红底）、`selected`（选中框），正好是 `paintCell` 的全部输入。
所以"两帧快照不同" ⟺ "两帧画面不同"，**不需要去猜"哪些格子可能受影响"**。
> 注意 `lock` 那一项：**`v` 没变、`lock` 变了也要重画**（出题"提交题面"时会把题面格锁定 → 数字要从"玩家蓝"换成"题面黑"）。

**脏格的三步**（`render/board.ts` 的 `renderBoardDirty`）：
```ts
for (const i of dirty) {
    const r = (i / size) | 0
    const c = i % size
    paintCell(ctx, board, conflictMask, selected, r, c, cellSize, fonts)   // ① 内容（与整盘同一个函数）
    blitCellLines(ctx, layer, r, c, cellSize, dpr)                         // ② 贴回该格的网格线
}
```
**② 就是把线层里"那一格的小矩形"贴回来**（`paint.ts` 的 `blitCellLines`）：
```ts
const sx = Math.min(Math.round(x * dpr), layer.width)                        // 源：设备像素
const sy = Math.min(Math.round(y * dpr), layer.height)
const sw = Math.max(0, Math.min(Math.round(cellSize * dpr), layer.width - sx))   // 夹到层边界内
const sh = Math.max(0, Math.min(Math.round(cellSize * dpr), layer.height - sy))
if (!sw || !sh) return
ctx.drawImage(layer, sx, sy, sw, sh, sx / dpr, sy / dpr, sw / dpr, sh / dpr)     // 目标：CSS 像素（1:1）
```
- **为什么要贴回线**：线必须压在内容之上（§2.3 的顺序）；贴回的那一小块里含**该格 4 条边的"内侧一半"**，外侧一半本来就在画布上、没被擦掉 → 合起来正好是整条居中描边的线 ✅
- **为什么要夹边界**：`Math.round` 会让最后一列/行的源矩形超出层 1px，浏览器遇到越界源矩形会**拉伸**（画面会歪 1px）
- **目标矩形用 `sx / dpr`**：保证与源**同尺寸**（不缩放）✅

**`redrawModeOf` 判"整盘"的三种情况**（纯函数，一条表达式；再加上"没有线层"——见下面的注）：

| 情况 | 为什么 |
|---|---|
| `resized`（`canvas.width` 刚被重建） | 位图已被清空（首帧 / **zoom 变了** / 容器宽变了 / **DPR 变了**）→ 画面上什么都没有 |
| `side !== lastSide` | 棋盘 CSS 边长变了 → `cellSize` 变了，旧像素的位置全对不上 |
| `dirty === null`（脏格 > 总量 1/3） | 小块贴图的调用次数太多，不如整盘一遍 |

> **还有"没有线层"这一条**：`createLinesLayer` 拿不到 2d 上下文时会返回 `null`（极端降级），此时局量贴不出正确的线
> → 调用方写的是 `if (layer && redrawModeOf(...) === 'dirty' && dirty)`：**层为 null 就走整盘**（整盘有 `drawLinesOn` 兜底）；
> `paintDirtyCells` 开头还有一道 `if (!layer) return` 作为"别画错"的最后防线。

**收益**：`B=10` 时"填一个数"从"重画 1 万格 + 600 条线"降到"重画 1~5 格 + 5 次小贴图"；
叠加离屏线层后，**整盘重绘**本身也从"3S 次 stroke"降到"1 次 drawImage"。



```ts
/** 点击位置 → 行列坐标；越界返回 null */
export const getClickPos = (canvas: HTMLCanvasElement, e: MouseEvent, size: number): Position | null => {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width) return null
    return offsetToCell(e.clientX - rect.left, e.clientY - rect.top, rect.width, size)
}
```

### 2.4 `getClickPos`：点击 → 行列（**换算全在 core**）

**三行代码，职责切得极干净**：
| 部分 | 谁做 | 为什么 |
|---|---|---|
| 取视口坐标与元素矩形 | `getClickPos`（**只能在这做**：要 DOM） | 浏览器 API 只允许在适配器里出现 |
| **相减得到元素内偏移** | `getClickPos` | 同上 |
| **偏移 → 行列（含边界判断）** | **`offsetToCell`（core）** | 纯数学 → 归 core（04 册 §3.4），于是**可测、前端后端都能用** |

**注意 `rect.width` 而不是 `offsetWidth`**：`getBoundingClientRect()` 返回的是**渲染后的实际尺寸**（含 CSS 缩放）→ 与 `side`/`cellSize` 的口径一致；
**如果 canvas 被 CSS 拉宽/压扁**，`rect.width` 也如实反映 → 换算依然正确。
> **这就是为什么 04 册的 `offsetToCell` 把 `side` 当参数传**（而不是内部去读 DOM）：**算的人不需要知道 DOM，量的人不需要知道数学。**

---

## 3. `services/prefs.ts`（17 行）—— localStorage 的薄封装

> 01 册 §3.6 已从"浏览器平台"角度讲过它；这里从**适配器职责**角度补两句。

```ts
/**
 * 纯 UI 偏好的本地存储（与 api/session.ts 同规则）
 * 键名统一 sudoku. 前缀；隐私模式下 localStorage 可能抛错 → 全部包一层
 */
const PREFIX = 'sudoku.'

export const readPref = (key: string): string => {
    try { return localStorage.getItem(PREFIX + key) ?? '' } catch { return '' }
}
export const writePref = (key: string, value: string): void => {
    try { localStorage.setItem(PREFIX + key, value) } catch { /* 忽略 */ }
}
export const clearPref = (key: string): void => {
    try { localStorage.removeItem(PREFIX + key) } catch { /* 忽略 */ }
}
```

**适配器的三条纪律在这里都体现了**：
| 纪律 | 体现 |
|---|---|
| **只暴露"值"，不暴露存储机制** | 调用方写 `readPref('pagerMode')`，**不知道**背后是 localStorage、也不知道前缀 —— 将来换 sessionStorage / IndexedDB 只改这一个文件 |
| **把"环境怪癖"封在适配器里** | 隐私模式抛异常 → **每个函数自己 try/catch**（调用方不用管） |
| **缺省值统一** | `?? ''` → 调用方永远拿到字符串（不用处理 `null`） |

**谁在用它**（两个调用方，都是"纯偏好"）：
- `useListQuery`：`pagerMode`（06 册 §2.4 ③）；
- `services/api/session.ts`：token 与 lastUid（**借用了同一套前缀规则**，注释里写明了）。

---

## 4. `services/api/client.ts`（61 行）—— **HTTP 适配器（本册最重要）**

**① 它是谁**：**全站唯一的 HTTP 出口**。
所有网络请求都经它；`services/api/*` 里的 `userApi` / `puzzleApi` 只是"把路径与参数写清楚"。

### 4.1 `ApiError`：把"HTTP 状态码"带进错误对象

```ts
/** 接口错误（status 便于上层区分 401 / 403 / 404 / 429） */
export class ApiError extends Error {
    readonly status: number
    constructor(status: number, message: string) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}
```
**三个知识点**：
1. **`extends Error`**：继承内置错误（`message`/`stack` 都有）→ **`errorTextOf(err, fallback)` 能识别它**（04 册 §16.1 用 `err instanceof Error`）；
2. **`readonly status`**：额外带**状态码**，上层想区别对待时可用（如"404 就显示'题目不存在'而不是'网络错误'"）；
3. **`this.name = 'ApiError'`**：让控制台/日志里能看出错误类型（否则显示 `Error`）。

### 4.2 401 广播：**回调集合 + 单向依赖**

```ts
type Listener = () => void
const unauthorizedListeners = new Set<Listener>()

/** 401 通知订阅者（stores/user 用它把登录态置空；services 不反向依赖 stores） */
export const onUnauthorized = (cb: Listener): void => { unauthorizedListeners.add(cb) }

const notifyUnauthorized = (): void => {
    clearToken()
    unauthorizedListeners.forEach(cb => cb())
}
```

**这段 7 行代码解决了架构上的一个死结**（03 册 §3.2 ④）：

```
❌ 不允许：client.ts  import { useUserStore } from '@/stores/user'    （services 不能反向依赖 stores → 环）
✅ 实际做法：client.ts 暴露 onUnauthorized(cb)
            stores/user.ts 在加载时订阅：onUnauthorized(() => { profile.value = null })
```

**三个细节**：
| 细节 | 说明 |
|---|---|
| **`Set` 而不是数组** | 天然去重（同一个回调订阅两次不会重复触发）—— 与 04 册 §3.8 的 `new Set(Listener)` 同款 |
| **`clearToken()` 在广播之前** | **先把 token 清掉再通知** → 任何被通知到的代码再去请求时，不会带着已经失效的 token |
| **通知是"广播"（forEach）** | 将来若还有别的地方关心 401（例如"弹出登录框"），**再加一个订阅者即可**，`client.ts` 不用改 |

### 4.3 `request`：四种出口 + 三处防御

```ts
export const request = async <T>(path: string, { method = 'GET', body, auth = true }: Options = {}): Promise<T> => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['content-type'] = 'application/json'
    if (auth) {
        const token = getToken()
        if (token) headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(`/api${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (res.status === 204) return undefined as T
    if (res.status === 401) notifyUnauthorized()

    if (!(res.headers.get('content-type') ?? '').includes('json'))
        throw new ApiError(res.status, '接口不存在或服务异常')

    const data = (await res.json()) as T & { error?: string }
    if (!res.ok) throw new ApiError(res.status, data.error ?? `请求失败（${res.status}）`)
    return data
}
```

**① 四个出口（把"HTTP 的复杂性"收成四条路）**：

| 出口 | 条件 | 返回/抛 |
|---|---|---|
| ① 空响应 | `status === 204` | **`undefined`**（`logout` 用；`Promise<void>`） |
| ② 401 | `status === 401` | 先广播（清 token + 通知），**再**继续往下走（最终抛 `ApiError`） |
| ③ 非 JSON | `content-type` 不含 `json` | 抛 **「接口不存在或服务异常」** |
| ④ JSON | 其它 | `res.ok` → 返回数据；否则抛 `ApiError(status, 后端文案)` |

**② ③ 那条"非 JSON 检查"是一个真实踩坑记录**（注释原文）：
> *"非 JSON 响应（打到静态资源）→ 抛「接口不存在或服务异常」，避免 `Unexpected token <`"*

**什么情况会拿到非 JSON**：请求路径写错了（例如 `/api/puzzless`）→ 请求打到**前端的 `index.html`** → `res.json()` 解析 HTML 会抛 **`Unexpected token <`**（一个对用户毫无意义的报错）。
**现在的做法**：先看 `content-type`，不对就抛**人能看懂**的话。
> **适配器的重要职责之一：把"底层框架的报错"翻译成"人能理解的错误"。**

**③ 三处防御（每一处都对应一个真实场景）**：

| 代码 | 场景 |
|---|---|
| `body !== undefined` 才加 `content-type` | **GET 没有 body** → 加了反而不规范 |
| `body === undefined ? undefined : JSON.stringify(body)` | **`fetch` 只收字符串 body**；`undefined` 时不传（否则会发出 `"undefined"` 这种垃圾） |
| `data.error ?? \`请求失败（${res.status}）\`` | **后端可能没给 `error`**（例如 500 的 HTML 兜底）→ 用状态码兜底文案 |
| `auth = true` 默认 | **绝大多数接口要登录**；只有 `register` / `login` 显式传 `auth: false`（02 册 §5.1） |

**④ `const data = (await res.json()) as T & { error?: string }`**：
**一次类型断言同时表达两件事**：成功时是 `T`、失败时可能带 `error`。
**为什么不用两次 `json()`**：body 只能读一次（流已消费）→ 所以**先解析成宽类型，再按 `res.ok` 分流**。

**⑤ `path` 拼成 `` `/api${path}` ``**：
**Base 路径只在这里出现一次** → 所有接口函数都写 `/puzzles`、`/me` 这种**相对路径**（清爽且不会写错前缀）。
**为什么是 `/api` 而不是完整域名**：同源部署（Cloudflare Pages 同时伺服前端与 `/api/*`）→ **开发时由 Vite 代理转发**（00 册 §1.6）。

---

## 5. `services/api/session.ts`（17 行）—— 只存"登录凭据"

```ts
import { clearPref, readPref, writePref } from '../prefs'

/**
 * 本地会话存储（键名由 prefs 统一补 `sudoku.` 前缀）
 * 只放「登录凭据」相关：token 与上次登录的账号 ID
 */
const TOKEN_KEY = 'token'
const UID_KEY = 'lastUid'

export const getToken = (): string => readPref(TOKEN_KEY)
export const setToken = (token: string): void => writePref(TOKEN_KEY, token)
export const clearToken = (): void => clearPref(TOKEN_KEY)

/** 上次登录的账号 ID（登录页预填用） */
export const getLastUid = (): string => readPref(UID_KEY)
export const setLastUid = (uid: string): void => writePref(UID_KEY, uid)
```

**三个要点**：
1. **它只是一个"命名层"**：把 `'token'` / `'lastUid'` 两个键名固定下来，**上层不用记字符串**（`client.ts` 只调 `getToken()`）；
2. **复用 `prefs`** → 前缀、try/catch、缺省值一套规则（§3）；
3. **只放两样东西**：**token**（凭据）与 **lastUid**（预填）—— **不放密码、不放用户资料**（资料在 `userStore.profile`，以服务端为准）。

**它和 `client.ts` 的关系（一个闭环）**：
```
client.ts 每次请求：getToken() → 加 Authorization 头
client.ts 遇到 401：clearToken() → 广播 → stores/user 清 profile
userApi 登录成功：setToken() + setLastUid()
```

---

## 6. `services/api/userApi.ts`（37 行）—— 账号相关的五个接口

```ts
/** 注册：成功即登录（顺带记下 uid 供登录页预填） */
export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/register', { method: 'POST', body: payload, auth: false })
    setToken(res.token)
    setLastUid(res.user.uid)
    return res
}

/** 登录 */
export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/login', { method: 'POST', body: payload, auth: false })
    setToken(res.token)
    setLastUid(res.user.uid)
    return res
}

/** 退出：先通知后端删 session，再清本地 token */
export const logout = async (): Promise<void> => {
    try { await request<void>('/logout', { method: 'POST' }) } finally { clearToken() }
}

/** 用本地 token 静默恢复登录态；无 token 直接返回 null（不发请求） */
export const me = async (): Promise<User | null> => {
    if (!getToken()) return null
    const res = await request<{ user: User }>('/me')
    return res.user
}

/** 改显示名（PATCH /api/me）：返回改完的自己 */
export const updateMe = async (uname: string): Promise<User> => {
    const res = await request<{ user: User }>('/me', { method: 'PATCH', body: { uname } })
    return res.user
}
```

**① 每个函数只做三件事**：`request(路径, 方法, body)` → **整理返回值** → （必要时）**写凭据**。
**它不判断业务**（不校验密码长度、不处理错误文案）→ 那些在 `useAuth` / `userStore`（06 册 §3.1、05 册 §4）里。

**② `register` / `login` 的两处副作用（`setToken` + `setLastUid`）为什么放在这层**：
- **"登录成功"的必然结果就是"记住凭据"** → 这是**协议的一部分**（后端返回 token 就是让你存的），不是"某个页面的决定"；
- 放在这里的好处：**`useAuth`、`userStore`、以及将来任何登录入口都不会忘记存 token**（少一处遗漏点）；
- `setLastUid` 是"顺带"的体验优化（下次预填账号 ID，06 册 §3.1 ④）。

**③ `auth: false` 的两处**：`register` / `login` **不需要带 token**（此时还没有 token）→ 显式关掉（`request` 默认 `true`）。
> **"默认要登录"这个默认值选得好**：**忘了传的接口会是"安全的"**（要 token），而不是"意外开放的"。

**④ `logout` 的 `try ... finally`（与 store 层呼应）**：
```ts
try { await request<void>('/logout', { method: 'POST' }) } finally { clearToken() }
```
**服务端删 session 失败，本地也必须清 token**（01 册 §2.3 ⑤ 的同一纪律）—— 否则用户看到"退出成功"但本地还留着凭据。

**⑤ `me()` 的"无 token 直接返回 null"（省一次必然失败的往返）**：
```ts
if (!getToken()) return null
```
没有 token 时 `/api/me` **必然**返回 401 → **不如先判断**（省一次网络请求、也避免触发 401 广播）。
**谁在用它**：`userStore.restore()`（01 册 §2.3 ⑥）→ **它内部就有这个短路**，所以"刷新页面时未登录用户不会发请求"。

**⑥ 返回类型都用 `types/user.ts` 的**：`AuthResponse` / `LoginPayload` / `RegisterPayload` / `User`。
**注意 `updateMe` 返回的是 `User`**（不是 `{ user }`）：**在这个函数里"拆包"** → 调用方（`userStore.rename`）拿到就能直接赋值给 `profile`。

---

## 7. `services/api/puzzleApi.ts`（60 行）—— 题目相关的八个接口

```ts
/** 带总数的分页响应（total 用来算页数、收敛越界页码） */
export interface Paged<T> { items: T[]; total: number }

export interface SearchQuery { keyword?: string; uid?: string; sort?: ListSort; page?: number; size?: number }

const qs = (q: Record<string, string | number | undefined>): string => {
    const p = new URLSearchParams()
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, String(v)) })
    const s = p.toString()
    return s ? `?${s}` : ''
}
```

**① `qs`：查询串构造（注意它**跳过**了什么）**

```ts
if (v !== undefined && v !== '') p.set(k, String(v))
```
| 行为 | 为什么 |
|---|---|
| **`undefined` 跳过** | 没传的参数**不该出现在 URL**（`?uid=undefined` 是灾难） |
| **空字符串跳过** | **空关键词不该发 `?keyword=`** —— "没搜"和"搜空串"语义相同，但**少传更干净** |
| **用 `URLSearchParams` 而不是手拼 `&`** | **自动做 URL 编码**（中文关键词、特殊字符都不会坏） |
| **`s ? '?' + s : ''`** | 没有任何参数时**不产生一个孤零零的 `?`** |

**② 两个列表接口（都用 `offsetOf` 换算）**

```ts
/** 搜索公开题（回 pid / title / sideS / blankCount / uname） */
export const search = (q: SearchQuery = {}): Promise<Paged<SearchResult>> => {
    const size = q.size ?? LIST_PAGE_SIZE
    const page = q.page ?? 1
    return request<Paged<SearchResult>>(`/puzzles${qs({
        keyword: q.keyword, uid: q.uid, sort: q.sort ?? SORT.Time,
        limit: size, offset: offsetOf(page, size),
    })}`)
}

/** 我的题目（需登录；只回 rowId，不含 pid） */
export const listMine = (q: { page?: number; size?: number; sort?: ListSort } = {}): Promise<Paged<MyPuzzle>> => {
    const size = q.size ?? LIST_PAGE_SIZE
    const page = q.page ?? 1
    return request<Paged<MyPuzzle>>(`/puzzles${qs({
        mine: 1, sort: q.sort ?? SORT.Time,
        limit: size, offset: offsetOf(page, size),
    })}`)
}
```

| 要点 | 说明 |
|---|---|
| **默认值在这里兜底**（`?? LIST_PAGE_SIZE` / `?? SORT.Time`） | 调用方可以只传关心的参数（`search({ keyword })`，06 册 §3.4） |
| **`limit` / `offset` 是接口的参数名，`page` / `size` 是前端的语义** | **换算由 core 的 `offsetOf` 做**（04 册 §17.1）→ **"前端说页码、接口说偏移"的翻译只在这一处** |
| **`mine: 1`** | 后端用 `searchParams.get('mine') === '1'` 分流（02 册 §5.5）→ 前端只需带这个标记 |

**③ 六个"一行接口"**

```ts
export const getOne = (pid: string): Promise<PuzzleDetail> => request<PuzzleDetail>(`/puzzles/${pid}`)
export const getMine = (rowId: string): Promise<MyPuzzleDetail> => request<MyPuzzleDetail>(`/puzzles/mine/${rowId}`)
export const create = (payload: {…}): Promise<{ pid: string; rowId: string }> =>
    request<{ pid: string; rowId: string }>('/puzzles', { method: 'POST', body: payload })
export const update = (pid: string, patch: PuzzlePatch): Promise<{ ok: true }> =>
    request<{ ok: true }>(`/puzzles/${pid}`, { method: 'PATCH', body: patch })
export const remove = (pid: string): Promise<{ ok: true }> =>
    request<{ ok: true }>(`/puzzles/${pid}`, { method: 'DELETE' })
export const play = (pid: string): Promise<{ playCount: number; counted: boolean }> =>
    request<{ playCount: number; counted: boolean }>(`/puzzles/${pid}/play`, { method: 'POST' })
```
**每个都是一行：路径 + 方法 + 返回类型**。它们的作用是**"把 URL 形状固定下来"** —— 不让 `/puzzles/${pid}/play` 这类字符串散落在业务代码里。

**④ 三处值得注意的类型**

| 接口 | 返回类型 | 为什么 |
|---|---|---|
| `create` | `{ pid: string; rowId: string }` | **只回两个 id**（新题的完整信息前端并不需要；`useCreateFlow` 拿到后去"我的题目"看） |
| `update` / `remove` | **`{ ok: true }`** | **字面量类型 `true`**：一旦后端改成 `{ ok: false }`，类型检查会立刻报错（03 册 §2.4"删除类只回成功标记"） |
| `play` | `{ playCount: number; counted: boolean }` | **`counted` 告诉前端"这次算没算"**（02 册 §5.7 的 1 小时去重） |

**⑤ 与后端接口的一一对应（前端文件 ↔ 后端文件）**

| 前端 | 后端（02 册） |
|---|---|
| `getOne` | `functions/api/puzzles/[pid].ts` 的 `onRequestGet` |
| `getMine` | `functions/api/puzzles/mine/[rowId].ts` |
| `create` | `functions/api/puzzles/index.ts` 的 `onRequestPost` |
| `update` / `remove` | `functions/api/puzzles/[pid].ts` 的 `onRequestPatch` / `onRequestDelete` |
| `play` | `functions/api/puzzles/[pid]/play.ts` |
| `search`（无 `mine`）/ `listMine`（`mine=1`） | `functions/api/puzzles/index.ts` 的 `onRequestGet`（两种分流） |

> **一个可收口点**：`Paged<T>` 与后端的 `{ items, total }` 约定是**两端各写一份**（后端在 SQL 里拼、前端在 `types/puzzle.ts` 里描述）。
> 因为**后端不能用前端的 `types/`？** 其实可以（`functions` 允许 import `src/types`，03 册 §3.1）—— 所以这里**可以**改成共享同一个类型，但目前是各自手写。

---

## 8. `services/sudoku/worker.ts`（26 行）—— Worker 另一端（"干活"的那一头）

```ts
/// <reference lib="webworker" />
import { generatePuzzle } from "@/core/sudoku/generator"
import { solvePuzzleMulti } from "@/core/sudoku/multiSolver"
import { SOLVE_COPY } from "@/constants/solve"
import type { WorkerRequest } from "@/types/worker"

/** 按 kind 派活：单解/多解/生成都只是调 core，随机由这里注入（services 层才允许宿主对象） */
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
    try {
        const req = e.data
        if (req.kind === 'solve') {
            const solutions = solvePuzzleMulti(req.board, Math.random, req.maxSolutions)
            if (!solutions.length) {
                self.postMessage({ ok: false, error: SOLVE_COPY.noSolution })
                return
            }
            self.postMessage({ ok: true, result: solutions })
            return
        }
        self.postMessage({ ok: true, result: generatePuzzle(req.boxSize, req.blanks, Math.random) })
    } catch (err) {
        self.postMessage({ ok: false, error: (err as Error).message })
    }
}

export { }
```

**① `/// <reference lib="webworker" />`（本文件独有的一行）**
它告诉 TypeScript："**这个文件跑在 Worker 环境里**" → 于是全局对象 `self` 的类型是 `WorkerGlobalScope`（有 `postMessage` / `onmessage`）而不是浏览器的 `Window`。
**没有它**：`self.onmessage` 会报类型错（`Window` 上没有 worker 语义的 `onmessage`）。
> **知识点**：`/// <reference lib="…" />` 是"**在这个文件里换一套全局 API 类型**"的手段 —— 同一份代码在"页面 / Worker / 后端"三种环境里，全局对象的类型完全不同。

**② 三个 import 都是"值"，只有一个 `import type`**：
`generatePuzzle` / `solvePuzzleMulti` / `SOLVE_COPY` 是运行时要用到的；`WorkerRequest` 只当类型 → `import type`（00 册 §2.1 / §4.12）。

**③ "按 kind 派活"：判别联合的分支收窄**
```ts
if (req.kind === 'solve') { … req.board … req.maxSolutions … }
else { … req.boxSize … req.blanks … }
```
`WorkerRequest` 是**判别联合**（`{kind:'generate'|'solve', …}`，02 册 §3.7 的 `types/worker.ts`）→ TS 靠 `kind` **自动收窄**：`solve` 分支里能访问 `board`、`generate` 分支里能访问 `boxSize`。
> **"一个通道两种任务"** 的写法：**一条消息通道 + 一个 kind 字段**，比"两条消息类型各自处理"更省（Worker 只建一次）。

**④ `Math.random` 在这里注入（本文件最重要的一句话）**
```ts
solvePuzzleMulti(req.board, Math.random, req.maxSolutions)
generatePuzzle(req.boxSize, req.blanks, Math.random)
```
注释原文：*"随机由这里注入（**services 层才允许宿主对象**）"*。
- **core 禁止 `Math.random`**（R3，因为不可复现）；
- **注入点就在"边界层"**：这里的 Worker（services 层）—— 也可以换成"固定序列"来做可复现测试；
- **两个调用各传一次 `Math.random`**：**函数本身是 `Math.random` 的引用**（不是调用结果）—— 传的是"随机源"这笔函数，core 内部需要时自己调（04 册 §13.2 的 `rng()`）。

**⑤ `try/catch` + 手工回传错误（关键细节）**
```ts
} catch (err) {
    self.postMessage({ ok: false, error: (err as Error).message })
}
```
**Worker 里未捕获的异常不会自动带信息回主线程**（只会触发主线程的 `worker.onerror`，那里拿不到 `message`）。
**这里手工"把错误也 postMessage 回去"** → 主线程的 `onmessage` 就能拿到**具体原因**（例如 `generator.ts:136` 那个 `throw new Error('生成失败')`）。
> **两端的分工**：`onmessage` 里带 `error`（**精确原因**）+ `onerror`（**兜底**，见 §9）—— 与 01 册 §3.7 的表格对应。

**⑥ `if (!solutions.length)` 单独处理**：
**无解**不是"异常"，而是一种**正常结果** → 回 `{ ok:false, error: SOLVE_COPY.noSolution }`（文案来自常量，02 册 §5.6 的"这盘无解"）。
（注意与"抛错"的区别：这里**没有进 catch**，是显式分支。）

**⑦ 最后一行 `export { }`**：
文件里有 `import`，本身已是 ESM 模块；这一行是**显式声明"这是模块"**（配合 `new Worker(url, { type: 'module' })` 的模块语义）。
**作用**：让"没有实际导出"的文件仍然明确是模块（也避免某些工具把它当成全局脚本处理）。

---

## 9. `services/sudoku/workerClient.ts`（79 行）—— 主线程这一端

> **01 册 §3.7 已逐段精读过它**（`settled` 闸门、`terminate`、超时、`new URL(..., import.meta.url)`、泛型 `<Res>`）。
> 这里只补**适配器视角**的三点。

**① 它是"Worker 的适配器"**：把"postMessage / onmessage / 超时 / 清理"这些**线程细节**封装成两个普通函数：
```ts
export const generateInWorker = (boxSize: number, blanks: number, timeoutMs = DEFAULT_TIMEOUT): Promise<PuzzleData>
export const solveMultiInWorker = (board: NumBoard, maxSolutions: number, timeoutMs = SOLVE_TIMEOUT): Promise<NumBoard[]>
```
**调用方（`useDifficultyFlow` / `useSolveFlow`）只看到"一个返回 Promise 的函数"** —— 完全不知道背后有 Worker、有超时、有 terminate。
> **这就是适配器的核心价值：把"复杂/易错的底层"变成"简单的接口"。**

**② 两端契约的对齐（一张图）**

```
主线程                                       Worker（worker.ts）
  runInWorker<Res>(req)                        self.onmessage = (e) => { … }
      │ worker.postMessage(req)  ──────────►        const req = e.data   ← WorkerRequest（判别联合）
      │                                            
      │ ◄──────────  self.postMessage({ ok:true, result })   成功
      │ ◄──────────  self.postMessage({ ok:false, error })   失败（无解 / 内部抛错）
      │ onerror  ──────────────────────►  fail(failCopy)     兜底（脚本错误）
  finish(data) / fail(msg)  ← 两条路都只"结算一次"（settled 闸门）
```
**两端的类型来自同一个文件**（`types/worker.ts` 的 `WorkerRequest` / `GenerateResponse` / `SolveResponse`）→ **协议只有一份定义**（这正是"契约集中"的收益）。

**③ 为什么"每次 `new Worker`、用完 `terminate`"**（01 册 §3.7 的两个设计决定）：
| 好处 | 说明 |
|---|---|
| **没有跨任务的残留状态** | 上一次的中间变量不会污染下一次（生成/求解是"一次性任务"） |
| **超时后能立刻杀掉** | 复用 Worker 时，`terminate` 会把"还在跑的旧任务"一起杀掉；而"新建 + 杀掉"语义干净 |
| 代价 | 新建线程有一次性开销（几十毫秒）—— 对"几百毫秒起步"的任务完全划算 |

**④ 与"core 三环境复用"的关系**（把整条链收口）：
```
core/sudoku/{generator,multiSolver}
   ↑ 纯函数、零外部依赖（R3）
   ├── 被 worker.ts 用（本册）      → 放着算，不卡 UI
   ├── 被前端 store / composable 用  → 小盘面直接算（如 findConflicts）
   └── 被 functions/utils/puzzle.ts 用 → 服务端复校（02 册）
```
**同一份算法，三个环境** —— 这就是"core 不碰平台对象"这条铁律换来的最大收益。

---

## 10. 适配器的四条纪律（能直接迁移）

### 10.1 四条纪律

**纪律一：外部世界的一切"不纯"，只在这里出现**

| 不纯的东西 | 只允许出现在 | 不许出现在 |
|---|---|---|
| `window` / `document` / `localStorage` | `services/` · `render/` · `composables/`（边界） | **`core/`（R3 拦截）** |
| `fetch` / `new Worker` | `services/` | core / stores / components |
| `ctx` / `devicePixelRatio` | `render/` | 其它任何层 |
| `Date.now()` / `Math.random()` | 边界层（注入点） | core（R3 拦截） |

**纪律二：把"复杂/易错"变成"简单接口"**

| 底层复杂度 | 适配器给出的简单接口 |
|---|---|
| `fetch` 的 4 种响应形态 + 401 + 非 JSON | `request<T>(path, opts)` → 要么返回 `T`、要么抛 `ApiError` |
| postMessage / 超时 / terminate / 只结算一次 | `generateInWorker(...)` / `solveMultiInWorker(...)`（两个普通函数） |
| localStorage 隐私模式抛错 / 前缀 / null | `readPref` / `writePref` / `clearPref`（永远不抛、永远返回字符串） |
| canvas 的 DPR / 像素尺寸 / 坐标系 | `boardGeometryOf`（几何）+ `prepareCanvas`（适配）+ `paintBoard`（绘制） |

**纪律三：把"底层报错"翻译成"人能看懂的话"**
| 底层 | 翻译后 |
|---|---|
| `res.json()` 解析 HTML → `Unexpected token <` | **"接口不存在或服务异常"**（§4.3 ③） |
| 后端 429 + 剩余分钟 | **"尝试次数过多，请 3 分钟后再试"**（02 册 §4.4） |
| Worker 超时 | **"生成超时，请重试"**（01 册 §3.7） |
| 复制被浏览器拒绝 | **"复制失败，请手动选中复制"**（06 册 §2.1） |

**纪律四：适配器"只做一件事"，业务判断留给上层**
| 适配器 | 它**不**做的事 |
|---|---|
| `request` | 不判断"401 之后跳哪个页面"（只广播）、不决定"错误怎么显示"（只抛 Error） |
| `puzzleApi` | 不校验 title 长度、不管"提交后跳哪" |
| `workerClient` | 不判断"要不要进 Worker"（调用方决定） |
| `renderBoard` | 不判冲突（只按 `conflictMask` 上色）、不知道数独规则 |

### 10.2 加一个"新接口"的检查清单（5 步）

1. **后端**：先在 `functions/api/…` 写好（02 册的"五步"）→ 定好路径、方法、入参、出参形状；
2. **类型**：出参形状写进 `src/types/*.ts`（**手写契约**，不从后端推导 —— R13）；
3. **前端接口函数**：在 `services/api/xxxApi.ts` 加一行（路径 + 方法 + 返回类型）；
4. **状态/编排**：store 或 composable 里调用它（`try/catch` + `errorTextOf`）；
5. **自检**：`pnpm guard`（确认没有越层）+ `pnpm typecheck:functions` + `pnpm typecheck`。

### 10.3 加一个"新适配器"的检查清单（4 问）

1. 它碰的是"外部世界"的什么？→ 该放 `render/`（画）还是 `services/`（取/存/算）？
2. **它会不会 import `stores` / `vue-router`？**（**会 → 说明放错层了**：那是 composable 的活）
3. **它对外暴露的接口是否"只用基本类型 + core 类型"**？（不要把 DOM / Worker 对象漏出去）
4. **出错时是"返回失败值"还是"抛错"**？（沿用项目策略：**预期内的失败给返回值，意外才抛**）

---

## 11. 本册自测（20 题）

### 渲染适配器（§2）

1. `render/board.ts` 为什么不能 import `stores`？它只允许 import 什么？
2. `measureContentWidth` 为什么要减掉 padding？为什么注释强调"只在 ResizeObserver 回调/首帧调用"？
3. `setupCanvas` 里 `canvas.width`（像素尺寸）与 `canvas.style.width`（CSS 尺寸）为什么必须都设？`if (canvas.width !== pixel)` 这个判断是优化什么？
4. `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` 之后，绘制代码里的坐标是什么单位？
5. `renderBoard` 的绘制顺序（底色 → 数字 → 选中框 → 网格线）为什么不能乱？
6. `paintCell` 里 `x = c * cellSize` / `y = r * cellSize` —— 如果写反了会看到什么？
7. 选中框为什么要 `inset = lineWidth / 2`？不内缩会怎样？
8. `drawLinesOn` 里细线为什么跳过 `i % boxSize === 0`？为什么两次循环各自只 `stroke()` 一次？**离屏线层**又是怎么把"每帧 3S 次 stroke"降到"1 次 drawImage"的？
9. `getClickPos` 为什么用 `getBoundingClientRect().width` 而不是 `canvas.offsetWidth`？为什么"偏移 → 行列"的换算放在 core？

### HTTP 与存储适配器（§3~§7）

10. `readPref` 里为什么每个函数都要 `try/catch`？（举一个真实会抛错的浏览器场景）
11. `client.request` 的四个出口分别是什么？204 与 401 各怎么处理？
12. 401 广播（`onUnauthorized`）为什么不让 `client.ts` 直接 import store？（用"依赖方向"回答）
13. `notifyUnauthorized` 里为什么先 `clearToken()` 再 `forEach` 通知？
14. 那条"非 JSON 检查"是防什么的？不加它用户会看到什么报错？
15. `body === undefined ? undefined : JSON.stringify(body)` 这一行的两个分支各防什么？
16. `userApi.me()` 为什么要先 `if (!getToken()) return null`？
17. `register` / `login` 为什么把 `setToken` / `setLastUid` 放在 **api 层**而不是 store 层？
18. `puzzleApi.qs()` 为什么跳过 `undefined` 与**空字符串**？用 `URLSearchParams` 比手拼有什么好处？
19. `search()` 里 `offset: offsetOf(page, size)` 体现了哪条分层原则？（页码 → offset 的换算为什么不在 api 层现算）

### Worker 适配器（§8~§9）

20. `worker.ts` 的第一行 `/// <reference lib="webworker" />` 是干什么的？为什么只有这个文件需要它？`Math.random` 为什么能在这里出现（而 core 里不行）？Worker 里 `try/catch` 之后为什么要手工 `postMessage` 错误？

> **答不上来的题号 → 回看**：1 → §1.2/§2.1；2 → §2.1；3-4 → §2.2；5-7 → §2.3；8 → §2.3 drawLines；9 → §2.4；10 → §3；11-15 → §4.3；16-17 → §6；18-19 → §7；20 → §8。

---

## 附：本册速查表

| 这件事 | 谁做 | 关键点 |
|---|---|---|
| 发一个请求 | `services/api/*Api.ts` → `request` | 路径/方法/返回类型；**错误抛 `ApiError`** |
| 带 token | `client.request` 自动 | `auth: false` 才不带（register/login） |
| 401 处理 | `client` 广播 → `stores/user` 订阅 | **不反向依赖 store** |
| 存/读偏好 | `prefs.readPref/writePref` | 前缀 `sudoku.`；隐私模式安全 |
| 存/读凭据 | `services/api/session` | 只有 token 与 lastUid |
| 量容器宽 | `render/geometry.ts` 的 `measureContentWidth` | 只在 ResizeObserver 里调 |
| 画整盘 | `paintBoard(ctx, g, params, layer)` | 几何 `g` 由 `boardGeometryOf` 算、线层可传 null（退回逐条画线） |
| 只重画脏格 | `dirtyCellsOf` + `redrawModeOf` + `paintDirtyCells` | 全纯函数：先算脏格、再判路径、最后只画那几格 |
| 点击 → 坐标 | `getClickPos` → `core.offsetToCell` | DOM 在适配器、数学在 core |
| 生成/求解 | `generateInWorker` / `solveMultiInWorker` | 一次性 Worker、超时、只结算一次 |

**下一册（09）把所有层串起来**：10 条端到端数据流（从"点一下"到"落库/落画"），每条都标出**每一跳经过哪个文件、哪一层、哪些函数**。






