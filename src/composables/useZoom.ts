import { BOARD_ZOOM } from "@/constants/board"
import { clampZoom, zoomInOf, zoomOutOf, canZoomInFrom, canZoomOutFrom } from "@/utils/zoom"
import { ref, computed } from "vue"

export const useZoom = (initial: number = BOARD_ZOOM.default) => {
    const zoom = ref<number>(clampZoom(initial))
    const zoomIn = (): void => { zoom.value = zoomInOf(zoom.value) }
    const zoomOut = (): void => { zoom.value = zoomOutOf(zoom.value) }
    const resetZoom = (): void => { zoom.value = BOARD_ZOOM.default }
    const canZoomIn = computed(() => canZoomInFrom(zoom.value))
    const canZoomOut = computed(() => canZoomOutFrom(zoom.value))
    return { zoom, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut }
}
