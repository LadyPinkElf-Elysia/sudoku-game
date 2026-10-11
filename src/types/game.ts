import type { GAME_STATUS, GAME_MODE, CREATE_PHASE } from "@/constants/game"

export interface GameConfig {
    boxSize: number,
    blankRatio: number
}

/** 当前盘面的来源信息（FR-11 题目信息行）；系统生成 / 自定义为空 */
export interface GameMeta {
    pid: string
    title: string
    uname: string
}

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS]
export type GameMode = typeof GAME_MODE[keyof typeof GAME_MODE]
export type CreatePhase = typeof CREATE_PHASE[keyof typeof CREATE_PHASE]
