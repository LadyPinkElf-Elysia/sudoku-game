import { BOARD_SIZE } from '@/constants/board'
import type { Position } from '@/types/board'

/** 容器内容宽 + 缩放 → 棋盘 CSS 边长（像素） */
export const boardSideOf = (contentWidth: number, zoom: number): number => {
    const base = Math.max(contentWidth * BOARD_SIZE.widthRatio, BOARD_SIZE.minSide)
    return Math.round(Math.min(base, BOARD_SIZE.maxSide) * zoom)
}

/** 棋盘 CSS 边长 → 每格边长（可能带小数） */
export const cellSizeOf = (side: number, gridSize: number): number => side / gridSize

/** 每格边长 → 字号（像素），有下限 */
export const fontPxOf = (cellSize: number): number =>
    Math.max(BOARD_SIZE.minFontSize, Math.floor(cellSize * BOARD_SIZE.fontSizeRatio))

/** 画布内偏移 → 行列坐标；非正边长或越界返回 null */
export const offsetToCell = (
    offsetX: number,
    offsetY: number,
    side: number,
    gridSize: number,
): Position | null => {
    if (side <= 0 || gridSize <= 0) return null
    const cellSize = cellSizeOf(side, gridSize)
    const r = Math.floor(offsetY / cellSize)
    const c = Math.floor(offsetX / cellSize)
    if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) return null
    return [r, c] as const
}
