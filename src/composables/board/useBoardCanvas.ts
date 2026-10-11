import { onBeforeUnmount, onMounted, ref, watchEffect, type Ref } from 'vue'
import type { Position } from '@/types/board'
import { measureContentWidth, renderBoard, getClickPos } from '@/render/board'
import type { BoardRenderInput } from '@/types/render'

/**
 * 棋盘画布：绑定 canvas、随入参重绘、容器尺寸变化重绘、点击换算成行列
 * 容器宽度只由 ResizeObserver 量一次写入 ref —— 重绘路径不再读布局（避免每次输入强制 reflow）
 */
export const useBoardCanvas = (
    canvasEl: Ref<HTMLCanvasElement | null>,
    input: () => BoardRenderInput,
    onCellClick?: (pos: Position) => void,
) => {
    /** 容器内容宽（0 = 还没量到，交由渲染器自己兜底量一次） */
    const contentWidth = ref(0)

    /** 按当前入参重绘；缺省值由 renderBoard 兜底 */
    const draw = (): void => {
        // 先读一遍依赖，保证 watchEffect 建立追踪（哪怕本次提前返回）
        const canvas = canvasEl.value
        const { board, boxSize, selected, conflictMask, zoom } = input()
        if (!canvas || !board.length) return

        renderBoard(canvas, { board, boxSize, selected, conflictMask, zoom }, contentWidth.value || undefined)
    }

    /** 量容器内容宽；值变了才会触发重绘（watchEffect 追踪 contentWidth） */
    const measure = (): void => {
        const parent = canvasEl.value?.parentElement
        const width = parent ? measureContentWidth(parent) : 0
        if (width !== contentWidth.value) contentWidth.value = width
    }

    // canvas / 棋盘 / 选中 / 冲突 / zoom / 容器宽 任一变化自动重绘；随组件卸载自动停止
    watchEffect(draw)

    // 容器尺寸变化不是响应式数据，靠 ResizeObserver 触发（observe 时会先回调一次 → 完成首测）
    let ro: ResizeObserver | null = null
    onMounted(() => {
        const parent = canvasEl.value?.parentElement
        if (!parent) return
        ro = new ResizeObserver(measure)
        ro.observe(parent)
        measure()
    })
    onBeforeUnmount(() => { ro?.disconnect(); ro = null })

    /** canvas 点击 → 行列坐标；越界或关闭交互则不发事件 */
    const onCanvasClick = (e: MouseEvent): void => {
        const canvas = canvasEl.value
        const { board, interactive } = input()
        if (!canvas || interactive === false || !board.length) return
        const pos = getClickPos(canvas, e, board.length)
        if (pos) onCellClick?.(pos)
    }

    return { onCanvasClick }
}
