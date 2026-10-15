import { boardSideOf, cellSizeOf } from "@/core/board/metrics"
import type { BoardGeometry } from "@/types/render"

/**
 * 棋盘几何：**纯计算**（唯一的外部读是 `getComputedStyle` 量容器宽 —— 那是"查询"，不改状态）
 * 为什么单独一个文件：几何只该算一次、由调用方保管；
 * render/ 的绘制函数只接收算好的几何，自己不去问 DOM（"画"与"量"分开）
 */

/** 量一次容器的「内容宽」（去掉左右 padding）；只在 ResizeObserver 回调/首帧调用，避免每次重绘强制布局 */
export const measureContentWidth = (parent: HTMLElement): number => {
    const style = getComputedStyle(parent)
    return parent.clientWidth - (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight))
}

/**
 * 解析棋盘几何：容器宽（没给就量一次）→ CSS 边长 → 每格边长 → 位图边长
 * 返回 null = 画布还没挂到 DOM / 盘面尺寸非法（调用方直接跳过本次绘制）
 */
export const boardGeometryOf = (
    canvas: HTMLCanvasElement,
    size: number,
    zoom: number,
    contentWidth?: number,
): BoardGeometry | null => {
    const parent = canvas.parentElement
    if (!parent || size <= 0) return null

    const dpr = window.devicePixelRatio || 1
    const width = contentWidth ?? measureContentWidth(parent)
    const side = boardSideOf(width, zoom)

    return { side, cellSize: cellSizeOf(side, size), pixel: Math.round(side * dpr), dpr }
}
