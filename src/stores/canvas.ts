import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { useGameStore } from './game'
import { renderBoard, getClickPos } from '@/utils/canvas'
import { getSudoku } from '@/utils/getSudoku'

export const useCanvasStore = defineStore('canvasStore', () => {
    const game = useGameStore()

    /** canvas DOM 引用，BoardView 挂载时绑定、卸载时置空 */
    const el = ref<HTMLCanvasElement | null>(null)

    /** 缩放倍数，1 表示铺满容器宽度 */
    const zoom = ref(1)

    /** 按当前 game 数据 + zoom 重绘 */
    const draw = (): void => {
        // 先读一遍依赖，保证 watchEffect 建立追踪（哪怕本次提前返回）
        const canvas = el.value
        const board = game.board
        const selected = game.selected
        const conflictSet = game.conflictSet
        const boxSize = game.config.boxSize
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

    /** 处理 canvas 点击：换算成行列，写回 game.selected */
    const handleClick = (e: MouseEvent): void => {
        const canvas = el.value
        if (!canvas || !game.board.length) return
        const pos = getClickPos(canvas, e, game.board.length)
        if (pos) game.select(pos)
    }

    const setZoom = (v: number): void => {
        zoom.value = Math.min(3, Math.max(0.5, v))
    }
    const zoomIn = (): void => setZoom(zoom.value + 0.1)
    const zoomOut = (): void => setZoom(zoom.value - 0.1)
    const resetZoom = (): void => setZoom(1)

    return {
        el, zoom,
        attach, detach, handleClick,
        zoomIn, zoomOut, resetZoom,
    }
})

export type CanvasStore = ReturnType<typeof useCanvasStore>