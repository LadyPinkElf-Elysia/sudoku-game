import { ref } from 'vue'

const STORAGE_KEY = 'GuessNumber.records'

function load() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
        return []
    }
}

/* 单例 */
export const records = ref(load())

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value))
}

/* ═══════════════════════════════════════════════════════
   模块级函数（非 composable，纯数据操作）
   ═══════════════════════════════════════════════════════ */

/** 添加一条记录（通用） */
export function addRecord(record) {
    records.value.unshift({
        ...record,
        id:      Date.now() + Math.random(),
        savedAt: Date.now(),
        locked:  false,
    })
    save()
}

/** 从当前 game 状态抽取并保存（业务友好） */
export function saveFromGame(game, score) {
    addRecord({
        mode:    game.mode,
        rules:   { ...game.rules },
        status:  game.status,
        score,
        secret:  game.secret,
        guesses: JSON.parse(JSON.stringify(game.guesses)),
        usedHints: [...game.usedHints],
    })
}

/** 切换锁定 */
export function toggleLock(id) {
    const r = records.value.find(r => r.id === id)
    if (r) {
        r.locked = !r.locked
        save()
    }
}

/** 清空未锁定（纯数据，无 confirm） */
export function clearUnlocked() {
    records.value = records.value.filter(r => r.locked)
    save()
}