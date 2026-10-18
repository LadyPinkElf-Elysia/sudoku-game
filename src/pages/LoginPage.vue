<script setup lang="ts">
import { computed } from 'vue'
import FormField from '@/components/FormField.vue'
import Overlay from '@/components/Overlay.vue'
import { ACTION, actionOf } from '@/constants/actions'
import { AUTH_COPY, UNAME_MAX } from '@/constants/user'
import { useAuth } from '@/composables/auth/useAuth'
import type { Actions } from '@/types/item'

const {
    isSignUp, uname, uid, password, password2, error, loading,
    createdUid, copied, switchMode, onUidPaste, submit, copyUid, doneAfterSignUp,
} = useAuth()

const title = computed<string>(() => (isSignUp.value ? AUTH_COPY.register : AUTH_COPY.login))

/** 注册成功卡片里的两个动作（都走遮罩的按钮条：可点击文本；文案在 constants/actions） */
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

            <!-- @paste：粘贴时自动去掉空白（事件从 input 冒泡到根 label，见 useAuth.onUidPaste） -->
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
