import { mapGrid } from './grid'
import type { Board, NumBoard } from '@/types/board'

/** 深拷贝盘面：Cell 是对象，历史快照必须与当前盘面隔离 */
export const cloneBoard = (b: Board): Board => mapGrid(b, cell => ({ ...cell }))

/** 盘面是否全空 */
export const isBlankBoard = (grid: NumBoard): boolean => grid.every(row => row.every(v => v === 0))
