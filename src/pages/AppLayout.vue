<script setup lang="ts">
import { computed } from 'vue'
import ActionItems from '@/components/ActionItems.vue'
import Overlay from '@/components/Overlay.vue'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY } from '@/constants/user'
import { useAccountMenu } from '@/composables/auth/useAccountMenu'
import type { Actions } from '@/types/item'

const {
    isGuest, uname, uid, tip, showNav,
    onMineBlocked, cardOpen, copied, openCard, closeCard, copyUid, logout,
} = useAccountMenu()

/** 用户名弹层：复制 uid + 关闭 */
const cardActions = computed<Actions>(() => [
    { key: 'copy', icon: '📋', message: copied.value ? AUTH_COPY.copied : AUTH_COPY.copy, onClick: copyUid },
    { key: 'close', icon: '↩', message: '关闭', onClick: closeCard },
])
</script>

<template>
    <div class="app-shell">
        <header class="app-header">
            <RouterLink :to="{ name: PAGE.Home }" class="app-title">数独</RouterLink>

            <nav v-if="showNav" class="app-nav">
                <!-- 游客：灰显 button（不导航，只出提示条）；登录后才是 RouterLink -->
                <RouterLink v-if="!isGuest" :to="{ name: PAGE.MyPuzzles }" class="nav-item">
                    {{ AUTH_COPY.myPuzzles }}
                </RouterLink>
                <button v-else type="button" class="nav-item is-disabled" aria-disabled="true"
                    :title="AUTH_COPY.needLogin" @click="onMineBlocked">
                    {{ AUTH_COPY.myPuzzles }}
                </button>

                <RouterLink v-if="isGuest" :to="{ name: PAGE.Login }" class="nav-item is-primary">
                    {{ AUTH_COPY.login }}
                </RouterLink>
                <template v-else>
                    <button type="button" class="nav-item nav-user" :title="AUTH_COPY.uidLabel" @click="openCard">
                        👤 {{ uname }}
                    </button>
                    <button type="button" class="nav-item" @click="logout">{{ AUTH_COPY.logout }}</button>
                </template>
            </nav>
        </header>

        <p v-if="tip" class="app-tip">{{ tip }}</p>

        <main class="app-main">
            <RouterView />
        </main>

        <!-- 点「👤 用户名」：查看 / 复制自己的账号 ID -->
        <Overlay :show="cardOpen">
            <p class="overlay-title">我的账号</p>
            <p class="overlay-desc">{{ AUTH_COPY.uidHint }}</p>
            <p class="uid-card">{{ uid }}</p>
            <ActionItems :items="cardActions" />
        </Overlay>
    </div>
</template>

<style scoped>
/* ★ 最外层：整页外框（App.vue 只有 RouterView，这里是唯一外壳） */
.app-shell {
    width: calc(100% - 20px);
    max-width: 520px;
    margin: 10px auto;
    padding: 12px 12px 24px;
    background: #fff;
    border: 2px solid #e5e7eb;
    border-radius: 20px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, .06);
    box-sizing: border-box;
}

/* 顶栏：三栏 grid —— 左右各 1fr 撑平，中间那列放标题 → 数学居中 */
.app-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f3f4f6;
}

/* ★ 数独：居中 + 加宽字距 */
.app-title {
    grid-column: 2;
    justify-self: center;
    font-size: 1.15rem;
    font-weight: 700;
    color: #111827;
    text-decoration: none;
    letter-spacing: 2px;
}

/* 导航固定在第三列、靠右；窄屏换行也不会把标题挤偏 */
.app-nav {
    grid-column: 3;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
}

.nav-item {
    height: 30px; padding: 0 10px; display: inline-flex; align-items: center;
    border: 1px solid #d1d5db; border-radius: 8px; background: #fff;
    color: #374151; font-size: .82rem; font-family: inherit;
    text-decoration: none; cursor: pointer; transition: .15s;
}
.nav-item:hover { background: #eef2ff; border-color: #6366f1; }
.nav-item.is-primary { background: #6366f1; border-color: #4f46e5; color: #fff; font-weight: 600; }
.nav-item.is-disabled { opacity: .45; cursor: not-allowed; }
.nav-item.is-disabled:hover { background: #fff; border-color: #d1d5db; }
.nav-user { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.app-tip {
    margin: 0 0 8px; padding: 6px 12px; border-radius: 8px;
    background: #eef2ff; border: 1px solid #c7d2fe; color: #4f46e5;
    font-size: .85rem; text-align: center;
}

.app-main { min-height: 200px; }

.overlay-title { margin: 0; font-size: 1.05rem; color: #111827; }
.overlay-desc { margin: 8px 0 0; font-size: .8rem; color: #6b7280; }
.uid-card {
    margin: 10px 0; padding: 8px 10px; border-radius: 8px;
    background: #f9fafb; border: 1px dashed #d1d5db;
    font-family: ui-monospace, Menlo, monospace; font-size: .8rem;
    word-break: break-all; user-select: all; color: #111827;
}
</style>
