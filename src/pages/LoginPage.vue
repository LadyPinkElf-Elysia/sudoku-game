<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormField from '@/components/FormField.vue'
import Overlay from '@/components/Overlay.vue'
import { ACTION } from '@/constants/actions'
import { AUTH_COPY } from '@/constants/copy'
import { PAGE } from '@/constants/pages'
import { PASSWORD_MIN, UID_PATTERN, UNAME_MAX, UNAME_PATTERN } from '@/constants/user'
import { actionOf } from '@/core/action'
import { errorTextOf } from '@/core/message'
import { useClipboard } from '@/composables/useClipboard'
import { getLastUid } from '@/services/api/session'
import { useUserStore } from '@/stores/user'
import type { Actions } from '@/types/item'

/**
 * 登录 / 注册页流程（**只有这一页用 → 就地写**）：表单、本地预校验、提交、错误、回跳
 * · 模式跟随 query（可深链接、可后退）；本地预校验与服务端共用同一套规则常量
 */
type AuthMode = 'sign-in' | 'sign-up'

/** redirect 只接受站内路径（防开放重定向） */
const safeRedirect = (raw: unknown): string =>
    typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : ''

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const { copied, copy } = useClipboard()

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

const title = computed<string>(() => (isSignUp.value ? AUTH_COPY.register : AUTH_COPY.login))

const switchMode = async (next: AuthMode): Promise<void> => {
    error.value = ''
    await router.replace({ name: PAGE.Login, query: { ...route.query, mode: next } })
}

/** 粘贴账号 ID：去掉所有空白字符（从备忘录 / 聊天里复制常带空格与换行） */
const onUidPaste = (e: ClipboardEvent): void => {
    const text = e.clipboardData?.getData('text') ?? ''
    if (!text) return
    e.preventDefault()
    uid.value = text.replace(/\s/g, '')
}

/** 本地预校验：返回第一条不合格的文案（'' = 通过） */
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

/** 注册成功卡片里的两个动作（都走遮罩的按钮条；文案在 constants/actions） */
const doneActions = computed<Actions>(() => [
    actionOf(copied.value ? ACTION.copiedUid : ACTION.copyUid, copyUid),
    actionOf(ACTION.savedUid, doneAfterSignUp),
])
</script>

<template>
    <div class="page-card login-page">
        <h2 class="section-title">{{ title }}</h2>

        <!-- 表单：回车即提交（type=submit） -->
        <form class="form" @submit.prevent="submit">
            <FormField v-if="isSignUp" v-model="uname" class="field" vertical label="显示名" :maxlength="UNAME_MAX"
                placeholder="2~16 位，中英文 / 数字 / 下划线" />

            <!-- @paste：粘贴时自动去掉空白（事件从 input 冒泡到根 label，见 onUidPaste） -->
            <FormField v-else v-model="uid" class="field" vertical :label="AUTH_COPY.uidLabel" mono
                :hint="AUTH_COPY.uidHint" autocomplete="off" placeholder="20 位字母数字" @paste="onUidPaste" />

            <FormField v-model="password" class="field" vertical type="password" label="密码" />

            <FormField v-if="isSignUp" v-model="password2" class="field" vertical type="password" label="确认密码" />

            <p v-if="error" class="form-error">{{ error }}</p>

            <button class="btn-primary" type="submit" :disabled="loading">{{ title }}</button>
        </form>

        <button class="text-btn" type="button" @click="switchMode(isSignUp ? 'sign-in' : 'sign-up')">
            {{ isSignUp ? '已有账号？去登录' : '没有账号？去注册' }}
        </button>

        <Overlay :show="loading" spinning :text="AUTH_COPY.wait" />

        <!-- 注册成功：账号 ID 卡片（值 + 按钮条都交给 Overlay） -->
        <Overlay :show="!!createdUid" text="✅ 注册成功" :desc="AUTH_COPY.uidHint" :actions="doneActions">
            <p class="uid-card">{{ createdUid }}</p>
        </Overlay>
    </div>
</template>

<style scoped>
/* .field / .label / .input / .hint / .form-error / .overlay-* / .uid-card / .section-title / .btn-primary
   / .text-btn 均来自全局样式 */
.login-page {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

/* 「切换登录/注册」的纯文字按钮居中 */
.text-btn {
    align-self: center;
}
</style>
