import type { VISIBILITY } from "@/constants/game"
import type { NumBoard } from "./board"

export type Visibility =typeof VISIBILITY[keyof typeof VISIBILITY]

/** 搜索列表项（公开题；不含 uid、不含题面串） */
export interface SearchResult {
    pid: string
    title: string
    sideS: number
    blankCount: number
}

/** 我的题目列表项（含 rowId，不含 pid） */
export interface MyPuzzle {
    rowId: string
    title: string
    sideS: number
    blankCount: number
    visibility: Visibility
    showSolution: boolean
    playCount: number
    createdAt: number
}

/** 公开详情 GET /api/puzzles/:pid（solutionText 仅在 show_solution=1 或我是作者时下发） */
export interface PuzzleDetail {
    pid: string
    title: string
    uname: string
    sideS: number
    blankCount: number
    createdAt: number
    puzzleText: string
    solutionText?: string
}

/** 作者态详情 GET /api/puzzles/mine/:rowId（一次拿全：pid + 题面 + 答案 + 状态） */
export interface MyPuzzleDetail extends PuzzleDetail {
    rowId: string
    visibility: Visibility
    showSolution: boolean
    playCount: number
    solutionText: string
}

/** 统一数据：生成器 / 玩家出题 都产出这个（Worker 回传也用） */
export interface PuzzleData {
    puzzle: NumBoard
    solution: NumBoard
}
