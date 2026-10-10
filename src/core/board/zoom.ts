import { BOARD_ZOOM } from '../../constants/board'

/** 浮点累加：2.8+0.1=2.9000000000000004，直接用 >= 比较按钮永远不禁用 */
const EPS = 1e-9

export const clampZoom = (v: number): number =>
    Math.min(BOARD_ZOOM.max, Math.max(BOARD_ZOOM.min, v))

export const zoomInOf = (v: number): number => clampZoom(v + BOARD_ZOOM.step)
export const zoomOutOf = (v: number): number => clampZoom(v - BOARD_ZOOM.step)

export const canZoomInFrom = (v: number): boolean => v < BOARD_ZOOM.max - EPS
export const canZoomOutFrom = (v: number): boolean => v > BOARD_ZOOM.min + EPS
