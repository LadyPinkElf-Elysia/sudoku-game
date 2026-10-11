<script setup lang="ts">
import { computed } from 'vue'
import ActionItems from '@/components/ActionItems.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import Overlay from '@/components/Overlay.vue'
import SecretField from '@/components/SecretField.vue'
import { AUTH_COPY } from '@/constants/user'
import { useAuth } from '@/composables/auth/useAuth'
import type { Actions } from '@/types/item'

const {
    isSignUp, uname, uid, password, password2, error, loading,
    createdUid, copied, switchMode, onUidPaste, submit, copyUid, doneAfterSignUp,
} = useAuth()

const title = computed<string>(() => (isSignUp.value ? AUTH_COPY.register : AUTH_COPY.login))

/** 注册成功卡片里的两个动作（多条动作 → 继续用 ActionItems） */
const doneActions = computed<Actions>(() => [
    { key: 'copy', icon: '📋', message: copied.value ? AUTH_COPY.copied : AUTH_COPY.copy, onClick: copyUid },
    { key: 'done', icon: '➡️', message: AUTH_COPY.saved, onClick: doneAfterSignUp },
])
</script>

<template>
    <div class="page-card login-page">
        <h2 class="title">{{ title }}</h2>

        <!-- 表单：回车即提交（type=submit） -->
        <form class="form" @submit.prevent="submit">
            <label v-if="isSignUp" class="field">
                <span class="label">显示名</span>
                <input class="input" v-model="uname" maxlength="16" placeholder="2~16 位，中英文 / 数字 / 下划线">
            </label>

            <label v-else class="field">
                <span class="label">{{ AUTH_COPY.uidLabel }}</span>
                <!-- @paste：粘贴时自动去掉空白（见 useAuth.onUidPaste） -->
                <input class="input uid" v-model="uid" spellcheck="false" autocomplete="off" placeholder="20 位字母数字"
                    @paste="onUidPaste">
                <span class="hint">{{ AUTH_COPY.uidHint }}</span>
            </label>

            <SecretField v-model="password" label="密码" />

            <SecretField v-if="isSignUp" v-model="password2" label="确认密码" />

            <p v-if="error" class="form-error">{{ error }}</p>

            <button class="submit" type="submit" :disabled="loading">{{ title }}</button>
        </form>

        <button class="link" @click="switchMode(isSignUp ? 'sign-in' : 'sign-up')">
            {{ isSignUp ? '已有账号？去登录' : '没有账号？去注册' }}
        </button>

        <LoadingOverlay :show="loading" :title="AUTH_COPY.wait" />

        <!-- 注册成功：账号 ID 卡片 -->
        <Overlay :show="!!createdUid">
            <p class="overlay-title">✅ 注册成功</p>
            <p class="overlay-desc">{{ AUTH_COPY.uidHint }}</p>
            <p class="uid-card">{{ createdUid }}</p>
            <ActionItems :items="doneActions" />
        </Overlay>
    </div>
</template>

<style scoped>
/* .field / .label / .input / .hint / .form-error / .overlay-* / .uid-card 均来自全局样式 */

.login-page {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.title {
    margin: 0;
    font-size: 1.05rem;
    color: #111827;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

/* 账号 ID 用等宽字体，便于核对 */
.uid {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: .5px;
}

/* 主按钮：全宽、主色、禁用态 */
.submit {
    height: 40px;
    border: none;
    border-radius: 10px;
    background: #6366f1;
    color: #fff;
    font-size: .95rem;
    font-weight: 600;
    cursor: pointer;
    transition: .15s;
}

.submit:hover:not(:disabled) {
    background: #4f46e5;
}

.submit:disabled {
    opacity: .55;
    cursor: not-allowed;
}

.link {
    background: none;
    border: none;
    color: #4f46e5;
    font-size: .85rem;
    cursor: pointer;
    align-self: center;
}

.link:hover {
    text-decoration: underline;
}
</style>
