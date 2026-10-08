import type { NumBoard } from "./game"

export interface Puzzle {
    pid?: number
    title: string
    puzzle: string       
    solution: string
    boardSize: number
}

/** 搜索结果（带作者名） */
export interface SearchResult extends Puzzle {
    uid: number
    uname: string
}

/** ★ 统一数据:生成器 / 玩家出题 都产出这个 */
export interface PuzzleData {
    puzzle: NumBoard
    solution: NumBoard
}
