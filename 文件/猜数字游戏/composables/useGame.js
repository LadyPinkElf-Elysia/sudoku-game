import { reactive, computed, watch } from 'vue'
import {
    DIFFICULTY_PRESETS, BASE_SCORE_TABLE, MAX_ATTEMPT_BONUS_RATES,
    NO_PURPLE_BONUS_RATE, MAX_HINTS, GAME_STATUS, INITIAL_GAME,
} from '../config'
import { generateSecret, compareGuess } from '../utils/gameLogic'
import { settings } from './useSettings'
import { saveFromGame } from './useRecords'

/* ═══════════════════════════════════════════════════════
   单例游戏状态
   ═══════════════════════════════════════════════════════ */

export const game = reactive(structuredClone(INITIAL_GAME))

/* ═══════════════════════════════════════════════════════
   真正的派生（有计算逻辑）
   ═══════════════════════════════════════════════════════ */

export const hintsLeft = computed(
    () => MAX_HINTS - game.usedHints.length
)

export const canSubmit = computed(
    () => game.status === GAME_STATUS.PLAYING && game.input.length === game.rules.length
)

export const scoreInfo = computed(() => {
    const { length, allowRepeat, purpleMode, maxAttempts } = game.rules
    const { unique, repeatable } = BASE_SCORE_TABLE[length]
    const base = allowRepeat ? repeatable : unique
    const noPurple = purpleMode ? 0 : Math.round(base * NO_PURPLE_BONUS_RATE)
    const lowAttempt = Math.round(base * MAX_ATTEMPT_BONUS_RATES[maxAttempts])
    return { base, noPurple, lowAttempt, final: base + noPurple + lowAttempt }
})

export const revealedHints = computed(() =>
    game.usedHints.map(i => `第 ${i + 1} 位是：${game.secret[i]}`)
)

/* ═══════════════════════════════════════════════════════
   自动副作用：状态变为 won / lost 时保存战绩
   ═══════════════════════════════════════════════════════ */

watch(
    () => game.status,
    (newStatus) => {
        if (newStatus === GAME_STATUS.WON || newStatus === GAME_STATUS.LOST) {
            saveFromGame(game, newStatus === GAME_STATUS.WON ? scoreInfo.value.final : 0)
        }
    }
)

/* ═══════════════════════════════════════════════════════
   行为
   ═══════════════════════════════════════════════════════ */

/** 选择经典预设 */
export function selectPreset(key) {
    const preset = DIFFICULTY_PRESETS[key]
    if (!preset) return
    game.mode = key
    Object.assign(game.rules, {
        length: preset.length,
        allowRepeat: preset.allowRepeat,
        purpleMode: preset.purpleMode,
        maxAttempts: preset.maxAttempts,
    })
}

/** 设置自定义规则 */
export function setCustomRules(rules) {
    game.mode = 'custom'
    Object.assign(game.rules, {
        length: Number(rules.length),
        allowRepeat: Boolean(rules.allowRepeat),
        purpleMode: Boolean(rules.purpleMode),
        maxAttempts: Number(rules.maxAttempts),
    })
}

/** 开始新一局 */
export function startNewGame() {
    Object.assign(game, structuredClone(INITIAL_GAME))
    game.status = GAME_STATUS.PLAYING
    game.secret = generateSecret(game.rules.length, game.rules.allowRepeat)
}

/** 提交猜测 */
export function submitGuess() {
    if (!canSubmit.value) return

    const colors = compareGuess(
        game.input,
        game.secret,
        game.rules.purpleMode,
        settings.dynamicCount
    )
    game.guesses.push({ value: game.input, colors })

    if (game.input === game.secret) {
        game.status = GAME_STATUS.WON
    } else if (game.guesses.length >= game.rules.maxAttempts) {
        game.status = GAME_STATUS.LOST
    }

    game.input = ''
}

/** 揭示指定位置的提示 */
export function revealHintAt(position) {
    if (game.status !== GAME_STATUS.PLAYING) return
    if (game.usedHints.includes(position)) return
    if (game.usedHints.length >= MAX_HINTS) return
    game.usedHints.push(position)
}

/** 输入过滤（仅数字 + 限长） */
export function updateInput(value) {
    game.input = String(value)
        .replace(/\D/g, '')
        .slice(0, game.rules.length)
}