import { BOARD_COLOR, BOARD_LINE } from "@/constants/board"
import type { BoardGeometry } from "@/types/render"

/**
 * 网格线：画法 + **离屏层工厂**
 * 为什么需要离屏层：线只随「盘面格数 / 每格边长 / 宫宽 / DPR」变，整盘重绘时每帧重画 3S 条线是纯重复劳动；
 * 而且线必须画在格子内容**之上**（顺序不能反），所以不能"先贴底图再画格"。
 * 做成**透明底**的层后：整盘重绘末尾贴一次（1 次调用顶掉 3S 次 stroke）；
 * 局量重绘时只把脏格那一小块贴回来（既恢复"线压格子"，又不碰邻居像素）。
 *
 * 本文件**不缓存任何东西**：`linesLayerKeyOf` 给签名、`createLinesLayer` 是纯工厂，
 * "要不要重建、层存在哪"由调用方（composables/board/useBoardCanvas）决定 —— 渲染层不留隐藏状态。
 */

/** 线层签名（`linesLayerKeyOf`）是 1 行字符串拼接 → 已内联进 `useBoardRender` 的 `linesKeyOf` */


/** 在给定画笔上画网格线（细线跳过宫的边界；粗线含宫边界与外框）——离屏层与兜底路径共用 */
export const drawLinesOn = (
    ctx: CanvasRenderingContext2D,
    size: number,
    boxSize: number,
    side: number,
    cellSize: number,
): void => {
    ctx.strokeStyle = BOARD_COLOR.thinLine
    ctx.lineWidth = BOARD_LINE.thin
    ctx.beginPath()
    for (let i = 1; i < size; i++) {
        if (i % boxSize === 0) continue
        const p = i * cellSize
        ctx.moveTo(p, 0); ctx.lineTo(p, side)
        ctx.moveTo(0, p); ctx.lineTo(side, p)
    }
    ctx.stroke()

    ctx.strokeStyle = BOARD_COLOR.thickLine
    ctx.lineWidth = BOARD_LINE.thick
    ctx.beginPath()
    for (let i = 0; i <= size; i += boxSize) {
        const p = i * cellSize
        ctx.moveTo(p, 0); ctx.lineTo(p, side)
        ctx.moveTo(0, p); ctx.lineTo(side, p)
    }
    ctx.stroke()
}

/** 建一张线层（**纯工厂**：同入参 → 同样的层；不缓存）。返回 null = 拿不到 2d 上下文（调用方退回 `drawLinesOn`） */
export const createLinesLayer = (size: number, boxSize: number, g: BoardGeometry): HTMLCanvasElement | null => {
    const layer = document.createElement("canvas")
    layer.width = g.pixel
    layer.height = g.pixel

    const ctx = layer.getContext("2d")
    if (!ctx) return null
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0)

    drawLinesOn(ctx, size, boxSize, g.side, g.cellSize)
    return layer
}
