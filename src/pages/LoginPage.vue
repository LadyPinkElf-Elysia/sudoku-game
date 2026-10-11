<script setup lang="ts">
import { computed } from 'vue'
import ActionItems from '@/components/ActionItems.vue'
import Overlay from '@/components/Overlay.vue'
import SecretField from '@/components/SecretField.vue'
import SpinnerIcon from '@/components/SpinnerIcon.vue'
import { AUTH_COPY } from '@/constants/user'
import { useAuth } from '@/composables/auth/useAuth'
import type { Actions } from '@/types/item'

const {
    isSignUp, uname, uid, password, password2, error, loading,
    createdUid, copied, switchMode, submit, copyUid, doneAfterSignUp,
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
                <input class="input uid" v-model="uid" spellcheck="false" autocomplete="off" placeholder="20 位字母数字">
                <span class="hint">{{ AUTH_COPY.uidHint }}</span>
            </label>

            <SecretField v-model="password" label="密码" />

            <SecretField v-if="isSignUp" v-model="password2" label="确认密码" />

            <p v-if="error" class="error">{{ error }}</p>

            <button class="submit" type="submit" :disabled="loading">{{ title }}</button>
        </form>

        <button class="link" @click="switchMode(isSignUp ? 'sign-in' : 'sign-up')">
            {{ isSignUp ? '已有账号？去登录' : '没有账号？去注册' }}
        </button>

        <Overlay :show="loading">
            <SpinnerIcon />
            <p class="overlay-title">{{ AUTH_COPY.wait }}</p>
        </Overlay>

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
/* 单列表单：统一纵向节奏 */
.login-page { display: flex; flex-direction: column; gap: 14px; }
.title { margin: 0; font-size: 1.05rem; color: #111827; }

.form { display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: .78rem; color: #6b7280; font-weight: 600; }

/* 关键：输入框统一 100% 宽，两个框才对齐 */
.input {
    width: 100%;
    box-sizing: border-box;
    height: 36px;
    padding: 0 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: .9rem;
    color: #111827;
    outline: none;
    transition: .15s;
}
.input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px #eef2ff; }
.uid { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .5px; }

.hint { font-size: .72rem; color: #9ca3af; line-height: 1.4; }

.error {
    margin: 0;
    padding: 6px 10px;
    border-radius: 8px;
    background: #fee2e2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    font-size: .8rem;
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
.submit:hover:not(:disabled) { background: #4f46e5; }
.submit:disabled { opacity: .55; cursor: not-allowed; }

.link { background: none; border: none; color: #4f46e5; font-size: .85rem; cursor: pointer; align-self: center; }
.link:hover { text-decoration: underline; }

.overlay-title { margin: 0; font-size: 1.05rem; color: #111827; }
.overlay-desc { margin: 8px 0 0; font-size: .8rem; color: #6b7280; }
.uid-card {
    margin: 10px 0;
    padding: 8px 10px;
    border-radius: 8px;
    background: #f9fafb;
    border: 1px dashed #d1d5db;
    font-family: ui-monospace, Menlo, monospace;
    font-size: .8rem;
    word-break: break-all;
    color: #111827;
}
</style>
