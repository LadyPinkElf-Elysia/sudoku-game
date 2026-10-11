import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { onUnauthorized } from '@/services/api/client'
import { login as apiLogin, logout as apiLogout, me as apiMe, register as apiRegister } from '@/services/api/userApi'
import type { LoginPayload, RegisterPayload, User } from '@/types/user'

export const useUserStore = defineStore('userStore', () => {
    const profile = ref<User | null>(null)

    /** 游客 = 没登录（受限入口灰显的判据） */
    const isGuest = computed<boolean>(() => !profile.value)
    const uname = computed<string>(() => profile.value?.uname ?? '')
    const uid = computed<string>(() => profile.value?.uid ?? '')

    /** 401（token 过期）时 client 已清 token → 这里同步把登录态置空 */
    onUnauthorized(() => { profile.value = null })

    const register = async (payload: RegisterPayload): Promise<void> => {
        profile.value = (await apiRegister(payload)).user
    }
    const login = async (payload: LoginPayload): Promise<void> => {
        profile.value = (await apiLogin(payload)).user
    }
    const logout = async (): Promise<void> => {
        try { await apiLogout() } finally { profile.value = null }
    }
    /** 刷新后静默恢复（无 token 不发请求） */
    const restore = async (): Promise<void> => {
        try { profile.value = await apiMe() } catch { profile.value = null }
    }

    return { profile, isGuest, uname, uid, register, login, logout, restore }
})
