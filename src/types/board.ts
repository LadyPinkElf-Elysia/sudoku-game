export interface Cell {
    v: number
    lock: boolean
}
export type Board = Cell[][]
export type NumBoard=number[][]
export type ConflictMask=boolean[][]
export type Snapshot = Cell[][]
export type Position = readonly [row: number, col: number]
