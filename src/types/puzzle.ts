import type { VISIBILITY } from "@/constants/puzzle"
import type { PAGER_MODE, SORT } from "@/constants/puzzle"
import type { NumBoard } from "./board"

export type Visibility = typeof VISIBILITY[keyof typeof VISIBILITY]

/** 列表排序（值来自 constants/puzzle 的 SORT） */
export type ListSort = typeof SORT[keyof typeof SORT]

/** 分页形态（值来自 constants/puzzle 的 PAGER_MODE） */
export type PagerMode = typeof PAGER_MODE[keyof typeof PAGER_MODE]

/** 搜索列表项（公开题；不含 uid、不含题面串） */
export interface SearchResult {
    pid: string
    title: string
    sideS: number
    blankCount: number
    /** 出题人显示名（列表不展示，仅 uid 档搜索时做表头） */
    uname: string
    /** 游玩热度（挑战一次 +1） */
    playCount: number
    createdAt: number
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

/** 可提交的改动字段（`PATCH /api/puzzles/:pid`；services 层与组件层共用同一份形状） */
export interface PuzzlePatch {
    title?: string
    puzzleText?: string
    solutionText?: string
    visibility?: Visibility
    showSolution?: boolean
}

/** 统一数据：生成器 / 玩家出题 都产出这个（Worker 回传也用） */
export interface PuzzleData {
    puzzle: NumBoard
    solution: NumBoard
}
