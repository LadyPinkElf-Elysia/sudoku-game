import { BOARD_COLOR } from "@/constants/board"
import type { Position } from "@/types/board"
import { offsetToCell } from "@/core/board/metrics"
import type { BoardGeometry, BoardRenderInput } from "@/types/render"
import { drawLinesOn } from "./layer"
import { blitCellLines, fontsOf, paintCell } from "./paint"

/**
 * 画布适配：`render/` 里**唯一写 DOM** 的地方
 * 让"位图尺寸 + CSS 尺寸"与几何一致，并设好坐标系与文字对齐；
 * `resized = true` 表示位图刚被重建（内容已清空 → 本次**必须**整盘重画）
 * 几何由外面传进来（`render/geometry.ts` 的 `boardGeometryOf`），所以这里不查布局、不留状态
 */
export const prepareCanvas = (
    canvas: HTMLCanvasElement,
    g: BoardGeometry,
): { ctx: CanvasRenderingContext2D | null; resized: boolean } => {
    let resized = false
    if (canvas.width !== g.pixel) {              // 给 width 赋值会清空位图 + 重置上下文状态
        canvas.width = g.pixel
        canvas.height = g.pixel
        resized = true
    }
    canvas.style.width = `${g.side}px`
    canvas.style.height = `${g.side}px`

    const ctx = canvas.getContext("2d")
    if (!ctx) return { ctx: null, resized }

    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0)   // 之后一律按 CSS 像素画
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    return { ctx, resized }
}

/** 整盘重绘（**纯绘制**：给 ctx + 几何 + 数据 + 线层就画；不查 DOM、不留状态、没有返回值） */
export const paintBoard = (
    ctx: CanvasRenderingContext2D,
    g: BoardGeometry,
    params: BoardRenderInput,
    layer: HTMLCanvasElement | null,
): void => {
    const { board, selected, conflictMask, boxSize } = params
    const size = board.length
    if (!size) return

    const fonts = fontsOf(g.cellSize)

    // 擦干净 + 铺白底
    ctx.clearRect(0, 0, g.side, g.side)
    ctx.fillStyle = BOARD_COLOR.bg
    ctx.fillRect(0, 0, g.side, g.side)

    // 逐格画内容
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            paintCell(ctx, board, conflictMask, selected, r, c, g.cellSize, fonts)
        }
    }

    // 网格线：优先一次贴离屏层（1 次调用顶掉 3S 次 stroke）；拿不到层才逐条画
    if (layer) ctx.drawImage(layer, 0, 0, g.side, g.side)
    else drawLinesOn(ctx, size, boxSize, g.side, g.cellSize)
}

/**
 * 局量重绘：只重画脏格（`dirty` = 扁平下标 `r*S+c`）—— **纯绘制**
 * 调用方负责保证"这次真的可以局量"（见 `dirty.ts` 的 `redrawModeOf`：位图刚重建 / 边长变了 / 没有线层都不行）
 * 每格两步（内容 → 贴回该格区域的网格线）与整盘重绘的顺序完全一致，所以像素结果相同
 */
export const paintDirtyCells = (
    ctx: CanvasRenderingContext2D,
    g: BoardGeometry,
    params: BoardRenderInput,
    dirty: readonly number[],
    layer: HTMLCanvasElement | null,
): void => {
    const { board, selected, conflictMask } = params
    const size = board.length
    if (!size || !layer) return          // 没有线层就贴不出正确的线（调用方本应先判断，这里再兜一层）

    const fonts = fontsOf(g.cellSize)
    for (const i of dirty) {
        const r = (i / size) | 0
        const c = i % size
        paintCell(ctx, board, conflictMask, selected, r, c, g.cellSize, fonts)
        blitCellLines(ctx, layer, r, c, g.cellSize, g.dpr)
    }
}

/** 点击位置 → 行列坐标；越界返回 null */
export const getClickPos = (canvas: HTMLCanvasElement, e: MouseEvent, size: number): Position | null => {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width) return null
    return offsetToCell(e.clientX - rect.left, e.clientY - rect.top, rect.width, size)
}
