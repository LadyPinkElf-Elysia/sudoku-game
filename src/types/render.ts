import type { Board, ConflictMask, Position } from './board'

/**
 * 棋盘渲染入参：BoardView props / 页面 boardParams / useBoardCanvas input 共用这一份契约
 * 不含 canvas —— canvas 与几何都是函数参数（见 render/board.ts）
 */
export interface BoardRenderInput {
    board: Board
    boxSize: number
    selected?: Position | null
    conflictMask?: ConflictMask
    zoom?: number
    interactive?: boolean
}

/**
 * 棋盘几何（纯计算的结果，见 render/geometry.ts 的 boardGeometryOf）
 * 由调用方算一次、保管；render/ 的绘制函数只管"按给定几何去画"
 */
export interface BoardGeometry {
    /** 棋盘 CSS 边长（像素） */
    side: number
    /** 每格边长（CSS 像素，可能带小数） */
    cellSize: number
    /** 位图像素边长 = round(side × dpr) */
    pixel: number
    /** 设备像素比 */
    dpr: number
}

/** 一格的两种字重（预先拼好；字体赋值是 canvas 里较贵的操作） */
export interface CellFonts {
    given: string
    player: string
}

/**
 * 一帧的可比较快照（用于算脏格，见 render/dirty.ts）
 * **只记"会被画出来的东西"**：值 / 归属 / 冲突标记 / 选中 —— 正好是 paintCell 的全部输入，
 * 所以"两帧快照不同"等价于"两帧画面不同"，不需要去猜"哪些格子受影响"
 */
export interface FrameState {
    /** 扁平值（r*S+c；0 = 空） */
    vals: Uint16Array
    /** 扁平归属（1 = 题面给定）—— 它变也会换字体/颜色，所以必须记 */
    locks: Uint8Array
    /** 扁平冲突标记（1 = 红底） */
    mask: Uint8Array
    /** 选中格（null = 没选） */
    selected: Position | null
    /** 盘面格数（变了必须整盘重画） */
    size: number
}

/** 本帧的重绘方式：`full` = 整盘，`dirty` = 只重画脏格 */
export type RedrawMode = 'full' | 'dirty'

