import { onBeforeUnmount, onMounted, watchEffect, type Ref } from 'vue'
import { getClickPos, renderBoard } from '@/utils/render/board'
import type { Position } from '@/types/board'
import type { RenderParams } from '@/types/canvas'

/**
 * 棋盘画布：绑定 canvas、随入参重绘、容器尺寸变化重绘、点击换算成行列
 * canvas 由组件提供，其余入参沿用统一的 RenderParams
 */
export const useBoardCanvas = (
    canvasEl: Ref<HTMLCanvasElement | null>,
    input: () => Omit<RenderParams, 'canvas'>,
    onCellClick?: (pos: Position) => void,
) => {
    /** 按当前入参重绘；缺省值由 renderBoard 兜底 */
    const draw = (): void => {
        // 先读一遍依赖，保证 watchEffect 建立追踪（哪怕本次提前返回）
        const canvas = canvasEl.value
        const { board, boxSize, selected, conflictMask, zoom } = input()
        if (!canvas || !board.length) return

        renderBoard({ canvas, board, boxSize, selected, conflictMask, zoom })
    }

    // canvas / 棋盘 / 选中 / 冲突 / zoom 任一变化自动重绘；随组件卸载自动停止
    watchEffect(draw)

    // 容器尺寸变化不是响应式数据，靠 ResizeObserver 手动触发
    let ro: ResizeObserver | null = null
    onMounted(() => {
        const parent = canvasEl.value?.parentElement
        if (!parent) return
        ro = new ResizeObserver(draw)
        ro.observe(parent)
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
