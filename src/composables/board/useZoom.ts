import { BOARD_ZOOM } from "@/constants/board"
import { canZoomInFrom, canZoomOutFrom, clampZoom, zoomInOf, zoomOutOf } from "@/core/board/zoom"
import type { Actions } from "@/types/item"
import { ref, computed, type ComputedRef } from "vue"

export const useZoom = (initial: number = BOARD_ZOOM.default) => {
    const zoom = ref<number>(clampZoom(initial))
    const zoomIn = (): void => { zoom.value = zoomInOf(zoom.value) }
    const zoomOut = (): void => { zoom.value = zoomOutOf(zoom.value) }
    const resetZoom = (to: number = initial): void => { zoom.value = clampZoom(to) }
    const canZoomIn = computed(() => canZoomInFrom(zoom.value))
    const canZoomOut = computed(() => canZoomOutFrom(zoom.value))
    /** 缩放这一对按钮的数据：到界就不给点击函数（组件就渲染成纯文本） */
    const zoomActions: ComputedRef<Actions> = computed(() => [
        { key: 'zoomOut', text: '➖', onClick: canZoomOut.value ? zoomOut : undefined },
        { key: 'zoomIn', text: '➕', onClick: canZoomIn.value ? zoomIn : undefined },
    ])
    return { zoom, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut, zoomActions }
}


