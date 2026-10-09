import type { RenderParams } from "@/types/canvas"
import { BOARD_COLOR, BOARD_FONT, BOARD_LINE, BOARD_SIZE } from "@/constants/board"
import type { Position } from "@/types/board"

/** 初始化画布：清晰度、尺寸、坐标对齐；返回画笔、边长、每格边长 */
const setupCanvas = (canvas: HTMLCanvasElement, size: number, zoom: number) => {
    const parent = canvas.parentElement
    if (!parent) return null

    const dpr = window.devicePixelRatio || 1
    const parentStyle = getComputedStyle(parent)
    const padX = parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight)
    const contentWidth = parent.clientWidth - padX
    
    const base = Math.max(contentWidth * BOARD_SIZE.widthRatio, BOARD_SIZE.minSide)
    const side = Math.round(Math.min(base, BOARD_SIZE.maxSide) * zoom)
    const pixel = Math.round(side * dpr)

    if (canvas.width !== pixel) {
        canvas.width = pixel
        canvas.height = pixel
        canvas.style.width = `${side}px`
        canvas.style.height = `${side}px`
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    return { ctx, side, cellSize: side / size }
}

export const renderBoard = (params: RenderParams): void => {
    const { canvas, board, selected, conflictMask, boxSize, zoom = 1 } = params
    if (!board.length) return

    const size = board.length
    const info = setupCanvas(canvas, size, zoom)
    if (!info) return
    const { ctx, side, cellSize } = info


    const fontSize = Math.max(BOARD_SIZE.minFontSize, Math.floor(cellSize * BOARD_SIZE.fontSizeRatio))
    const fontGiven = `${BOARD_FONT.given} ${fontSize}px ${BOARD_FONT.family}`
    const fontPlayer = `${BOARD_FONT.player} ${fontSize}px ${BOARD_FONT.family}`

    /** 画第 r 行第 c 列这一格 */
    const drawCell = (r: number, c: number): void => {
        const cell = board[r][c]
        if (!cell) return

        const x = c * cellSize
        const y = r * cellSize
        const isSelected = !!selected && selected[0] === r && selected[1] === c
        const isConflict = conflictMask[r][c]

        // 底色
        ctx.fillStyle = isConflict ? BOARD_COLOR.conflictBg : BOARD_COLOR.bg
        ctx.fillRect(x, y, cellSize, cellSize)

        // 数字
        if (cell.v !== 0) {
            ctx.font = cell.lock ? fontGiven : fontPlayer
            ctx.fillStyle = cell.lock ? BOARD_COLOR.givenText : BOARD_COLOR.playerText
            ctx.fillText(String(cell.v), x + cellSize / 2, y + cellSize / 2)
        }

        // 选中框
        if (isSelected) {
            const inset = BOARD_LINE.selected / 2
            ctx.strokeStyle = BOARD_COLOR.selectedBorder
            ctx.lineWidth = BOARD_LINE.selected
            ctx.strokeRect(x + inset, y + inset, cellSize - BOARD_LINE.selected, cellSize - BOARD_LINE.selected)
        }
    }

    /** 画网格线 */
    const drawLines = (): void => {
        const boardSide = size * cellSize

        ctx.strokeStyle = BOARD_COLOR.thinLine
        ctx.lineWidth = BOARD_LINE.thin
        ctx.beginPath()
        for (let i = 1; i < size; i++) {
            if (i % boxSize === 0) continue
            const p = i * cellSize
            ctx.moveTo(p, 0); ctx.lineTo(p, boardSide)
            ctx.moveTo(0, p); ctx.lineTo(boardSide, p)
        }
        ctx.stroke()

        ctx.strokeStyle = BOARD_COLOR.thickLine
        ctx.lineWidth = BOARD_LINE.thick
        ctx.beginPath()
        for (let i = 0; i <= size; i += boxSize) {
            const p = i * cellSize
            ctx.moveTo(p, 0); ctx.lineTo(p, boardSide)
            ctx.moveTo(0, p); ctx.lineTo(boardSide, p)
        }
        ctx.stroke()
    }

    // 擦干净 + 铺白底
    ctx.clearRect(0, 0, side, side)
    ctx.fillStyle = BOARD_COLOR.bg
    ctx.fillRect(0, 0, side, side)

    // 逐格画
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            drawCell(r, c)
        }
    }

    drawLines()
}

/** 点击位置 → 行列坐标；越界返回 null */
export const getClickPos = (
    canvas: HTMLCanvasElement,
    e: MouseEvent,
    size: number,
): Position | null => {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width) return null

    const cellSize = rect.width / size
    const c = Math.floor((e.clientX - rect.left) / cellSize)
    const r = Math.floor((e.clientY - rect.top) / cellSize)

    if (r < 0 || r >= size || c < 0 || c >= size) return null
    return [r, c] as const
}

