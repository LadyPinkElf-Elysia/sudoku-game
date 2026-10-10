import { GAME_STATUS } from "@/constants/game";
import type { GameStatus } from "@/types/game";

export const statusOf = (hasBoard: boolean, isWin: boolean): GameStatus =>
    isWin ? GAME_STATUS.Won : hasBoard ? GAME_STATUS.Playing : GAME_STATUS.Idle