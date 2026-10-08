import { reactive, watchEffect } from 'vue'
import { FONT_FAMILIES } from '../config'

const STORAGE_KEY = 'GuessNumber.settings'

function load() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    } catch {
        return {}
    }
}

/* 单例 */
export const settings = reactive({
    fontSize: 16,
    fontFamily: 'default',
    dynamicCount: false,
    ...load(),
})

/* watchEffect：持久化 + 注入 CSS 变量 */
watchEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

    const root = document.documentElement
    root.style.setProperty('--font-size', `${settings.fontSize}px`)
    root.style.setProperty('--font-family', FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.default)
})