import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY, PASSWORD_MIN, UID_PATTERN, UNAME_PATTERN } from '@/constants/user'
import { useClipboard } from '@/composables/useClipboard'
import { errorTextOf } from '@/core/message'
import { getLastUid } from '@/services/api/session'
import { useUserStore } from '@/stores/user'

export type AuthMode = 'sign-in' | 'sign-up'

/** redirect 只接受站内路径（防开放重定向） */
const safeRedirect = (raw: unknown): string =>
    typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : ''

/** 登录 / 注册页流程：表单、本地预校验、提交、错误、回跳；每页一份 */
export const useAuth = () => {
    const userStore = useUserStore()
    const router = useRouter()
    const route = useRoute()
    const { copied, copy } = useClipboard()

    /** 模式跟随 query（可深链接、可后退） */
    const mode = computed<AuthMode>(() => (route.query.mode === 'sign-up' ? 'sign-up' : 'sign-in'))
    const isSignUp = computed<boolean>(() => mode.value === 'sign-up')

    const uname = ref('')
    const uid = ref(isSignUp.value ? '' : getLastUid())   // 登录模式预填上次账号 ID
    const password = ref('')
    const password2 = ref('')
    const error = ref('')
    const loading = ref(false)
    /** 注册成功后的「账号 ID」卡片（仅本次会话） */
    const createdUid = ref('')

    const switchMode = async (next: AuthMode): Promise<void> => {
        error.value = ''
        await router.replace({ name: PAGE.Login, query: { ...route.query, mode: next } })
    }

    /**
     * 粘贴账号 ID：去掉所有空白字符（从备忘录 / 聊天里复制常带空格与换行）
     * · 大小写敏感 → 不做任何大小写转换
     * · preventDefault 后自行写回，避免把空白一起塞进输入框
     */
    const onUidPaste = (e: ClipboardEvent): void => {
        const text = e.clipboardData?.getData('text') ?? ''
        if (!text) return
        e.preventDefault()
        uid.value = text.replace(/\s/g, '')
    }

    /** 本地预校验：与服务端共用同一套规则常量 */
    const validate = (): string => {
        if (isSignUp.value) {
            if (!UNAME_PATTERN.test(uname.value.trim())) return AUTH_COPY.unameInvalid
            if (password.value.length < PASSWORD_MIN) return AUTH_COPY.passwordTooShort
            if (password.value !== password2.value) return AUTH_COPY.passwordMismatch
        } else {
            if (!UID_PATTERN.test(uid.value.trim())) return AUTH_COPY.uidInvalid
            if (!password.value) return AUTH_COPY.passwordTooShort
        }
        return ''
    }

    const submit = async (): Promise<void> => {
        if (loading.value) return
        error.value = validate()
        if (error.value) return

        loading.value = true
        try {
            if (isSignUp.value) {
                await userStore.register({ uname: uname.value.trim(), password: password.value })
                createdUid.value = userStore.uid     // 先弹卡片，等用户确认已保存
                return
            }
            await userStore.login({ uid: uid.value.trim(), password: password.value })
            await router.replace(safeRedirect(route.query.redirect) || { name: PAGE.Home })
        } catch (err) {
            error.value = errorTextOf(err, '请求失败，请重试')
        } finally {
            loading.value = false
        }
    }

    /** 复制账号 ID */
    const copyUid = async (): Promise<void> => {
        if (!(await copy(createdUid.value))) error.value = AUTH_COPY.copyFailed
    }

    /** 「我已保存」→ 关卡片并回跳 */
    const doneAfterSignUp = async (): Promise<void> => {
        createdUid.value = ''
        await router.replace(safeRedirect(route.query.redirect) || { name: PAGE.Home })
    }

    return {
        mode, isSignUp, uname, uid, password, password2, error, loading,
        createdUid, copied, switchMode, onUidPaste, submit, copyUid, doneAfterSignUp
    }
}
