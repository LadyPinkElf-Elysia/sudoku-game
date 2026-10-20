import type { GAME_STATUS, GAME_MODE, CREATE_PHASE, GAME_ORIGIN } from "@/constants/game"
import type { Board, NumBoard, Position } from "./board"

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
/** 开局来源（值来自 constants/game 的 GAME_ORIGIN） */
export type GameOrigin = typeof GAME_ORIGIN[keyof typeof GAME_ORIGIN]
export type CreatePhase = typeof CREATE_PHASE[keyof typeof CREATE_PHASE]

/**
 * 本地存档（localStorage 里的一整局）
 * · **只存真源**：配置 / 来源 / 题目信息 / 答案 / 历史快照 / 当前步 / 选中 —— 派生值（状态、冲突、候选）恢复时重算
 * · 快照带 `lock` 标记：恢复后「题面粗体、玩家填的蓝色」与存档时完全一致
 * · `version` 是格式版本：结构一变就 +1，读到不认识的版本直接丢弃（绝不去猜旧格式）
 */
export interface GameSave {
    version: number
    /** 存档 id（同一局重复存档会覆盖同一行；列表按它定位） */
    id: string
    /** 存档时间（ms） */
    savedAt: number
    origin: GameOrigin
    meta: GameMeta
    config: GameConfig
    /** 答案（可能为空：挑战题未下发答案串） */
    solution: NumBoard
    /** 历史快照（第 0 步 = 开局盘面） */
    snapshots: Board[]
    /** 存档时停在第几步 */
    currentStep: number
    selected: Position | null
}
