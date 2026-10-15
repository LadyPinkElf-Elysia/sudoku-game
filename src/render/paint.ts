import { BOARD_COLOR, BOARD_FONT, BOARD_LINE } from "@/constants/board"
import { fontPxOf } from "@/core/board/metrics"
import type { Board, ConflictMask, Position } from "@/types/board"
import type { CellFonts } from "@/types/render"

/**
 * 单格绘制：整盘重绘与局量重绘**共用的纯绘制函数**
 * 顺序固定：底色 → 数字 → 选中框
 * 网格线**不在这里** —— 线要压在内容之上，由调用方在本函数之后补（整盘贴整层 / 局量贴那一小块）
 * 它不读 canvas 尺寸、不记得任何东西：字体与几何全部由参数给
 */

export const fontsOf = (cellSize: number): CellFonts => {
    const px = fontPxOf(cellSize)
    return {
        given: `${BOARD_FONT.given} ${px}px ${BOARD_FONT.family}`,
        player: `${BOARD_FONT.player} ${px}px ${BOARD_FONT.family}`,
    }
}

/** 画第 r 行第 c 列的内容 */
export const paintCell = (
    ctx: CanvasRenderingContext2D,
    board: Board,
    conflictMask: ConflictMask | undefined,
    selected: Position | null | undefined,
    r: number,
    c: number,
    cellSize: number,
    fonts: CellFonts,
): void => {
    const cell = board[r][c]
    if (!cell) return

    const x = c * cellSize
    const y = r * cellSize

    // 底色（冲突格红底）
    ctx.fillStyle = conflictMask?.[r]?.[c] ? BOARD_COLOR.conflictBg : BOARD_COLOR.bg
    ctx.fillRect(x, y, cellSize, cellSize)

    // 数字（题面粗体深色 / 玩家常规蓝色）
    if (cell.v !== 0) {
        ctx.font = cell.lock ? fonts.given : fonts.player
        ctx.fillStyle = cell.lock ? BOARD_COLOR.givenText : BOARD_COLOR.playerText
        ctx.fillText(String(cell.v), x + cellSize / 2, y + cellSize / 2)
    }

    // 选中框（内缩半个线宽，笔画才不会越到邻格）
    if (selected && selected[0] === r && selected[1] === c) {
        const inset = BOARD_LINE.selected / 2
        ctx.strokeStyle = BOARD_COLOR.selectedBorder
        ctx.lineWidth = BOARD_LINE.selected
        ctx.strokeRect(x + inset, y + inset, cellSize - BOARD_LINE.selected, cellSize - BOARD_LINE.selected)
    }
}

/** 把网格线层的**某一格区域**贴回来（源矩形按设备像素、目标按 CSS 像素；线因此压在内容之上） */
export const blitCellLines = (
    ctx: CanvasRenderingContext2D,
    layer: HTMLCanvasElement,
    r: number,
    c: number,
    cellSize: number,
    dpr: number,
): void => {
    const x = c * cellSize
    const y = r * cellSize
    // 按设备像素取源矩形，并夹到层边界内（最后一列/行会因取整多出 1px，越界会被浏览器拉伸）
    const sx = Math.min(Math.round(x * dpr), layer.width)
    const sy = Math.min(Math.round(y * dpr), layer.height)
    const sw = Math.max(0, Math.min(Math.round(cellSize * dpr), layer.width - sx))
    const sh = Math.max(0, Math.min(Math.round(cellSize * dpr), layer.height - sy))
    if (!sw || !sh) return
    ctx.drawImage(layer, sx, sy, sw, sh, sx / dpr, sy / dpr, sw / dpr, sh / dpr)
}
