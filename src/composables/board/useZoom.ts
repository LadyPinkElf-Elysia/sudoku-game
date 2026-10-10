import { BOARD_ZOOM } from "@/constants/board"
import { canZoomInFrom, canZoomOutFrom, clampZoom, zoomInOf, zoomOutOf } from "@/core/board/zoom"
import type { Actions } from "@/types/item"
import { ref, computed, type ComputedRef } from "vue"

export const useZoom = (initial: number = BOARD_ZOOM.default) => {
    const zoom = ref<number>(clampZoom(initial))
    const zoomIn = (): void => { zoom.value = zoomInOf(zoom.value) }
    const zoomOut = (): void => { zoom.value = zoomOutOf(zoom.value) }
    const resetZoom = (to:number=initial): void => { zoom.value = clampZoom(to) }
    const canZoomIn = computed(() => canZoomInFrom(zoom.value))
    const canZoomOut = computed(() => canZoomOutFrom(zoom.value))
    const zoomActions: ComputedRef<Actions> = computed(() => [
    { key: 'zoomOut', icon: '➖', message: '缩小', disabled: !canZoomOut.value, onClick: zoomOut },
    { key: 'zoomIn',  icon: '➕', message: '放大', disabled: !canZoomIn.value,  onClick: zoomIn },
])
    return { zoom, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut,zoomActions }
}


