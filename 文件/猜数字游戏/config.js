export const DIFFICULTY_PRESETS = {
    easy: {
        label: '简单',
        length: 4,
        allowRepeat: false,
        purpleMode: false,
        maxAttempts: 10
    },
    hard: {
        label: '困难',
        length: 6,
        allowRepeat: false,
        purpleMode: false,
        maxAttempts: 10
    },
    hell: {
        label: '地狱',
        length: 8,
        allowRepeat: false,
        purpleMode: false,
        maxAttempts: 10
    }
}

export const BASE_SCORE_TABLE = {
    4: { unique: 35, repeatable: 40 },
    6: { unique: 50, repeatable: 60 },
    8: { unique: 65, repeatable: 80 },
    10: { unique: 80, repeatable: 100 },
}

export const MAX_ATTEMPT_BONUS_RATES = {
    4: 0.30,
    5: 0.25,
    6: 0.20,
    7: 0.15,
    8: 0.10,
    9: 0.05,
    10: 0.00,
}

export const NO_PURPLE_BONUS_RATE = 0.20
export const MAX_HINTS = 2
export const DEFAULT_HISTORY_LIMIT = 10

export const GAME_STATUS = {
    IDLE: 'idle',
    PLAYING: 'playing',
    WON: 'won',
    LOST: 'lost'
}

export const FONT_FAMILIES = {
    default: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif",
    songti: "SimSun, '宋体', serif",
    heiti: "SimHei, '黑体', sans-serif",
    kaiti: "KaiTi, '楷体', serif",
    fangsong: "FangSong, '仿宋', serif",
}

export const INITIAL_GAME = {
    mode: 'easy',
    rules: {
        length: 4,
        allowRepeat: false,
        purpleMode: false,
        maxAttempts: 10,
    },
    status: GAME_STATUS.IDLE,
    secret: '',
    input: '',
    guesses: [],
    usedHints: [],
}