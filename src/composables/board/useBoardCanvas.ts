import { onBeforeUnmount, onMounted, ref, watchEffect, type Ref } from 'vue'
import type { Position } from '@/types/board'
import type { BoardRenderInput, FrameState } from '@/types/render'
import { boardGeometryOf, measureContentWidth } from '@/render/geometry'
import { createLinesLayer, linesLayerKeyOf } from '@/render/layer'
import { getClickPos, paintBoard, paintDirtyCells, prepareCanvas } from '@/render/board'
import { dirtyCellsOf, fillFrameState, makeFrameState, redrawModeOf } from '@/render/dirty'

/**
 * 棋盘画布（**唯一持有画布相关状态的地方**）：绑定 canvas、随入参重绘、容器尺寸变化重绘、点击换算成行列
 * 容器宽度只由 ResizeObserver 量一次写入 ref —— 重绘路径不再读布局（避免每次输入强制 reflow）
 * `boxEl` 是外层滚动框（量它的宽度）；canvas 的直接父级会随棋盘收缩，量它会形成反馈
 *
 * 这里只做"取数据 → 调纯函数 → 落副作用"，判断全交给 render/ 的纯函数：
 *   · `boardGeometryOf`  几何（CSS 边长 / 每格边长 / 位图边长）
 *   · `linesLayerKeyOf` + `createLinesLayer`  线层要不要重建（层存在这里，渲染层不留缓存）
 *   · `dirtyCellsOf`     脏格（比对两张帧快照）
 *   · `redrawModeOf`     走整盘还是局量
 */
export const useBoardCanvas = (
    canvasEl: Ref<HTMLCanvasElement | null>,
    boxEl: Ref<HTMLElement | null>,
    input: () => BoardRenderInput,
    onCellClick?: (pos: Position) => void,
) => {
    /** 容器内容宽（0 = 还没量到，交由 geometry 自己兜底量一次） */
    const contentWidth = ref(0)

    /** 双缓冲快照（prev = 画面上的样子 / next = 本帧刚读到的样子）—— 避免每帧分配 */
    let prev: FrameState | null = null
    let next: FrameState | null = null
    /** 网格线离屏层 + 它的签名（缓存归调用方保管；`render/layer.ts` 的工厂是纯的） */
    let layer: HTMLCanvasElement | null = null
    let layerKey = ''
    /** 上一次绘制用的棋盘 CSS 边长（变了就不能走局量） */
    let lastSide = 0

    /** 重绘：纯函数算几何 / 脏格 / 模式，这里只负责"画"与"记状态" */
    const draw = (): void => {
        // 先读一遍依赖，保证 watchEffect 建立追踪（哪怕本次提前返回）
        const canvas = canvasEl.value
        const { board, boxSize, selected, conflictMask, zoom } = input()
        if (!canvas || !board.length) return

        const size = board.length
        const geom = boardGeometryOf(canvas, size, zoom ?? 1, contentWidth.value || undefined)
        if (!geom) return

        const { ctx, resized } = prepareCanvas(canvas, geom)
        if (!ctx) return

        // 线层：签名（尺寸 / 宫宽 / 边长 / 格宽 / DPR）变了才重建
        const key = linesLayerKeyOf(size, boxSize, geom)
        if (key !== layerKey) {
            layer = createLinesLayer(size, boxSize, geom)
            layerKey = key
        }

        if (!next || next.size !== size) next = makeFrameState(size)
        fillFrameState(next, board, conflictMask, selected)
        const dirty = prev ? dirtyCellsOf(prev, next) : null

        const params = { board, boxSize, selected, conflictMask }
        // 没有线层就只能整盘（局量贴不出正确的线）→ 这一条与 redrawModeOf 的两个条件并列
        if (layer && redrawModeOf(dirty, resized, geom.side, lastSide) === 'dirty' && dirty)
            paintDirtyCells(ctx, geom, params, dirty, layer)
        else paintBoard(ctx, geom, params, layer)

        lastSide = geom.side
        const old = prev
        prev = next
        next = old            // 交换：下帧把"刚画出来的这一帧"当基准
    }

    /** 量外层滚动框的内容宽；值变了才会触发重绘（watchEffect 追踪 contentWidth） */
    const measure = (): void => {
        const box = boxEl.value
        const width = box ? measureContentWidth(box) : 0
        if (width !== contentWidth.value) contentWidth.value = width
    }

    // canvas / 棋盘 / 选中 / 冲突 / zoom / 容器宽 任一变化自动重绘；随组件卸载自动停止
    watchEffect(draw)

    // 容器尺寸变化不是响应式数据，靠 ResizeObserver 触发（observe 时会先回调一次 → 完成首测）
    let ro: ResizeObserver | null = null
    onMounted(() => {
        const box = boxEl.value
        if (!box) return
        ro = new ResizeObserver(measure)
        ro.observe(box)
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
