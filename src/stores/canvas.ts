import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { useGameStore } from './game'
import { renderBoard, getClickPos } from '@/utils/canvas'
import { getSudoku } from '@/utils/sudoku/cache'
import { BOARD_ZOOM } from '@/constants/board'

export const useCanvasStore = defineStore('canvasStore', () => {
    const gameStore = useGameStore()

    /** canvas DOM 引用，BoardView 挂载时绑定、卸载时置空 */
    const el = ref<HTMLCanvasElement | null>(null)

    /** 缩放倍数，1 表示铺满容器宽度 */
    const zoom = ref<number>(BOARD_ZOOM.default)

    /** 按当前 gameStore 数据 + zoom 重绘 */
    const draw = (): void => {
        // 先读一遍依赖，保证 watchEffect 建立追踪（哪怕本次提前返回）
        const canvas = el.value
        const board = gameStore.board
        const selected = gameStore.selected
        const conflictSet = gameStore.conflictSet
        const boxSize = gameStore.config.boxSize
        const z = zoom.value

        if (!canvas || !board.length) return

        const sudoku = getSudoku(boxSize)
        renderBoard({
            canvas,
            board,
            selected,
            conflictSet,
            boxSize: sudoku.B,
            zoom: z,
        })
    }

    // el / 棋盘 / 选中 / 冲突 / zoom 任一变化，自动重绘
    watchEffect(draw)

    // 容器尺寸变化不是响应式数据，靠 ResizeObserver 手动触发
    let ro: ResizeObserver | null = null

    /** 绑定 canvas；传 null 等于解除绑定 */
    const attach = (canvas: HTMLCanvasElement | null): void => {
        el.value = canvas

        ro?.disconnect()
        ro = null
        if (canvas?.parentElement) {
            ro = new ResizeObserver(draw)
            ro.observe(canvas.parentElement)
        }
    }

    /** 解除绑定，停掉观察 */
    const detach = (): void => {
        ro?.disconnect()
        ro = null
        el.value = null
    }

    /** 处理 canvas 点击：换算成行列，写回 gameStore.selected */
    const handleClick = (e: MouseEvent): void => {
        const canvas = el.value
        if (!canvas || !gameStore.board.length) return
        const pos = getClickPos(canvas, e, gameStore.board.length)
        if (pos) gameStore.select(pos)
    }

    const setZoom = (v: number): void => {
        zoom.value = Math.min(BOARD_ZOOM.max, Math.max(BOARD_ZOOM.min, v))
    }
    const zoomIn = (): void => setZoom(zoom.value + BOARD_ZOOM.step)
    const zoomOut = (): void => setZoom(zoom.value - BOARD_ZOOM.step)
    const resetZoom = (): void => setZoom(BOARD_ZOOM.default)

    return {
        el, zoom,
        attach, detach, handleClick,
        zoomIn, zoomOut, resetZoom,
    }
})

export type CanvasStore = ReturnType<typeof useCanvasStore>