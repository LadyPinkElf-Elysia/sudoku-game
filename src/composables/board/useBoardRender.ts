import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect, type Ref } from 'vue'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
import { canZoomInFrom, canZoomOutFrom, defaultZoomOf, zoomInOf, zoomOutOf } from '@/core/board/zoom'
import { boardSideOf, cellSizeOf, offsetToCell, pixelOf } from '@/core/board/metrics'
import { paintBoard, paintDirtyCells } from '@/render/board'
import { createLinesLayer } from '@/render/layer'
import type { Board, ConflictMask, Position } from '@/types/board'
import type { Actions } from '@/types/item'
import type { BoardGeometry, BoardRenderInput, FrameState, RedrawMode } from '@/types/render'

/**
 * 棋盘渲染（**render 层的组合式入口**）—— 对外**只暴露一个方法**：`onCanvasClick`
 *
 * 分工（这是本文件存在的理由）：
 *   · `render/*`：只留**复杂或通用**的纯绘制 —— `paintCell`（一格三层）· `drawLinesOn`（网格线）·
 *     `paintBoard` / `paintDirtyCells`（整盘 / 局量），给 ctx + 几何 + 数据就画，不碰生命周期
 *   · 本组合式：**薄壳 + 调度** —— 量宽 / 算几何（DPR）/ 适配画布 / 线层签名 / **帧快照与脏格 diff** /
 *     "什么时候画"（watchEffect 追踪入参 · ResizeObserver · 卸载清理）
 *   · 组件（`BoardView.vue`）：**只接线**（`canvasEl` / `boxEl` 模板 ref + `@click` + props 透传）
 *
 * **状态归属**：盘面 / 选中 / 冲突在 store（经 `input()` 现读）；**缩放是棋盘自己的内部状态**；
 * 本文件里的 `contentWidth` / 帧快照 / 线层 / 上次边长只是**渲染缓存**，随组件销毁，不外暴露、也不进 store。
 */
export const useBoardRender = (
    canvasEl: Ref<HTMLCanvasElement | null>,
    boxEl: Ref<HTMLElement | null>,
    input: () => BoardRenderInput,
    onCellClick?: (pos: Position) => void,
) => {
    /** 容器内容宽（0 = 还没量到，交由 geometry 自己兜底量一次）—— **渲染缓存，不是业务状态** */
    const contentWidth = ref(0)

    /**
     * 缩放（**棋盘自己的内部状态**）：值私有，只把按钮数据与三个动作交出去
     * · 跟着盘面大小取默认值；尺寸一变就复位
     * · 算式在 core（`zoomInOf` / `clampZoom`…），这里只做状态与按钮
     */
    const zoom = ref<number>(defaultZoomOf(input().boxSize))
    watch(() => input().boxSize, (b) => { zoom.value = defaultZoomOf(b) })

    const zoomIn = (): void => { zoom.value = zoomInOf(zoom.value) }
    const zoomOut = (): void => { zoom.value = zoomOutOf(zoom.value) }
    const resetZoom = (): void => { zoom.value = defaultZoomOf(input().boxSize) }

    /** 缩放按钮条：到界就不给点击函数（组件渲染成纯文本） */
    const zoomActions = computed<Actions>(() => [
        actionOf(ACTION.zoomOut, canZoomOutFrom(zoom.value) ? zoomOut : undefined),
        actionOf(ACTION.zoomIn, canZoomInFrom(zoom.value) ? zoomIn : undefined),
    ])

    /**
     * **渲染缓存**（不是业务状态）：帧快照双缓冲 / 离屏线层 / 上次绘制的边长
     * · 业务状态（盘面 / 选中 / 冲突 / 缩放）全在 store，每次 draw 用 `input()` 现读，**这里不存棋盘数据**
     * · 这些只是"上一帧画成什么样"的记忆，随组件卸载一起消失 —— 所以留在组合式内部、**不对外暴露**
     */
    /** 双缓冲快照（prev = 画面上的样子 / next = 本帧刚读到的样子）—— 避免每帧分配 */
    let prev: FrameState | null = null
    let next: FrameState | null = null
    /** 网格线离屏层 + 它的签名（缓存归调用方保管；`render/layer.ts` 的工厂是纯的） */
    let layer: HTMLCanvasElement | null = null
    let layerKey = ''
    /** 上一次绘制用的棋盘 CSS 边长（变了就不能走局量） */
    let lastSide = 0

    /** 量一次容器「内容宽」（去掉左右 padding）：只在 ResizeObserver 回调 / 首帧调用，避免每次重绘触发强制布局 */
    const measureContentWidth = (parent: HTMLElement): number => {
        const style = getComputedStyle(parent)
        return parent.clientWidth - (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight))
    }

    /** 几何：容器宽 → CSS 边长 → 每格边长 → 位图边长（算式全在 core；DPR 只有这里读） */
    const geometryOf = (canvas: HTMLCanvasElement, size: number, zoom: number): BoardGeometry | null => {
        const parent = canvas.parentElement
        if (!parent || size <= 0) return null

        const dpr = window.devicePixelRatio || 1
        const width = contentWidth.value || measureContentWidth(parent)
        const side = boardSideOf(width, zoom)
        return { side, cellSize: cellSizeOf(side, size), pixel: pixelOf(side, dpr), dpr }
    }

    /** 适配画布（**唯一写 DOM 的地方**）：位图 / CSS 尺寸 + 坐标系；`resized = true` 表示位图刚被重建、必须整盘重画 */
    const prepareCanvas = (
        canvas: HTMLCanvasElement,
        g: BoardGeometry,
    ): { ctx: CanvasRenderingContext2D | null; resized: boolean } => {
        let resized = false
        if (canvas.width !== g.pixel) {              // 给 width 赋值会清空位图 + 重置上下文状态
            canvas.width = g.pixel
            canvas.height = g.pixel
            resized = true
        }
        canvas.style.width = `${g.side}px`
        canvas.style.height = `${g.side}px`

        const ctx = canvas.getContext('2d')
        if (!ctx) return { ctx: null, resized }

        ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0)   // 之后一律按 CSS 像素画
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        return { ctx, resized }
    }

    /** 线层签名：尺寸 / 宫宽 / 边长 / 格宽 / DPR 任一项变了就重建 */
    const linesKeyOf = (size: number, boxSize: number, g: BoardGeometry): string =>
        `${size}|${boxSize}|${g.side}|${g.cellSize}|${g.dpr}`

    /* ===== 帧快照与脏格（**内部数据**：只在上面那两个 let 缓冲上工作，没有别处用 → 就地写） ===== */

    /** 建快照缓冲（盘面尺寸变化时重建）：只记"会影响像素的东西" */
    const makeFrameState = (size: number): FrameState => {
        const total = size * size
        return {
            vals: new Uint16Array(total), locks: new Uint8Array(total), mask: new Uint8Array(total),
            selected: null, size,
        }
    }

    /** 把当前数据写进快照（覆盖式、零分配）：值 / 归属（lock）/ 冲突 / 选中 */
    const fillFrameState = (
        st: FrameState,
        board: Board,
        conflictMask?: ConflictMask,
        selected?: Position | null,
    ): void => {
        const size = board.length
        const { vals, locks, mask } = st
        let i = 0
        for (let r = 0; r < size; r++) {
            const row = board[r]
            const mrow = conflictMask?.[r]
            for (let c = 0; c < size; c++, i++) {
                const cell = row[c]
                vals[i] = cell ? cell.v : 0
                locks[i] = cell && cell.lock ? 1 : 0
                mask[i] = mrow?.[c] ? 1 : 0        // 与 paintCell 取色条件保持一致
            }
        }
        st.selected = selected ?? null
    }

    /** 取某格在快照里的扁平下标；不在盘内返回 -1 */
    const indexOf = (p: Position, size: number): number =>
        p[0] >= 0 && p[0] < size && p[1] >= 0 && p[1] < size ? p[0] * size + p[1] : -1

    /** 比对两帧 → 本帧脏格（扁平下标）；null = 该整盘（尺寸变了 / 脏格超过 1/3，贴图不如整盘划算） */
    const dirtyCellsOf = (prevFrame: FrameState, nextFrame: FrameState, maxRatio = 1 / 3): number[] | null => {
        const size = nextFrame.size
        if (prevFrame.size !== size) return null

        const total = size * size
        const dirty: number[] = []
        for (let i = 0; i < total; i++) {
            if (nextFrame.vals[i] !== prevFrame.vals[i]
                || nextFrame.locks[i] !== prevFrame.locks[i]
                || nextFrame.mask[i] !== prevFrame.mask[i]) dirty.push(i)
        }

        // 选中变化的两个格子（旧格要抹掉框）
        const a = prevFrame.selected ? indexOf(prevFrame.selected, size) : -1
        const b = nextFrame.selected ? indexOf(nextFrame.selected, size) : -1
        if (a !== b) {
            if (a >= 0) dirty.push(a)
            if (b >= 0) dirty.push(b)
        }

        return dirty.length > total * maxRatio ? null : dirty
    }

    /** 本帧走哪条重绘路径：位图刚重建 / 边长变了 → 整盘；否则有脏格就走局量 */
    const redrawModeOf = (
        dirty: readonly number[] | null,
        resized: boolean,
        side: number,
        lastSide: number,
    ): RedrawMode => (dirty && !resized && side === lastSide ? 'dirty' : 'full')

    /** 重绘：薄壳算几何 / 适配画布 / 定线层，脏格与模式都在本文件里算 */
    const draw = (): void => {
        // 先读一遍依赖，保证 watchEffect 建立追踪（哪怕本次提前返回）
        const canvas = canvasEl.value
        const { board, boxSize, selected, conflictMask } = input()
        if (!canvas || !board.length) return

        const size = board.length
        const geom = geometryOf(canvas, size, zoom.value)
        if (!geom) return

        const { ctx, resized } = prepareCanvas(canvas, geom)
        if (!ctx) return

        // 线层：签名（尺寸 / 宫宽 / 边长 / 格宽 / DPR）变了才重建
        const key = linesKeyOf(size, boxSize, geom)
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
        const rect = canvas.getBoundingClientRect()
        if (!rect.width) return
        const pos = offsetToCell(e.clientX - rect.left, e.clientY - rect.top, rect.width, board.length)
        if (pos) onCellClick?.(pos)
    }

    /** **对外只有这些**：点击换算 + 缩放按钮数据 + 三个缩放动作（画布/测量/重绘/双缓冲全在内部） */
    return { onCanvasClick, zoomActions, zoomIn, zoomOut, resetZoom }
}
