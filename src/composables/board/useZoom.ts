import { ACTION } from "@/constants/actions"
import { actionOf } from "@/core/action"
import { BOARD_ZOOM } from "@/constants/board"
import { canZoomInFrom, canZoomOutFrom, clampZoom, defaultZoomOf, zoomInOf, zoomOutOf } from "@/core/board/zoom"
import type { Actions } from "@/types/item"
import { computed, ref, watch, type ComputedRef } from "vue"

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
 * · 页面只写一行，流程（出题 / 编辑 / 落地页）不用再管缩放复位
 * · 盘面大小取自 store 的派生值（`config.boxSize` / `sudoku.B`），所以载入大盘面后会自己跟上
 */
export const useBoardZoom = (boxSize: () => number) => {
    const state = useZoom(defaultZoomOf(boxSize()))
    watch(() => boxSize(), (next) => { state.resetZoom(defaultZoomOf(next)) })
    return state
}


