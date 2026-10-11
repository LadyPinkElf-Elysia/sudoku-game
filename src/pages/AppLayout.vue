<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY } from '@/constants/user'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const route = useRoute()

/** 未登录点灰显入口的提示；路由一变就清掉（无需 timer） */
const tip = ref('')
watch(() => route.fullPath, () => { tip.value = '' })

/** 登录页自己就是入口 → 隐藏右侧那组 */
const showNav = computed<boolean>(() => route.name !== PAGE.Login)

/** 游客点「我的题目」：不导航，只提示 */
const onMineClick = (e: MouseEvent): void => {
    if (userStore.isGuest) {
        e.preventDefault()
        tip.value = AUTH_COPY.needLogin
    }
}

const logout = async (): Promise<void> => { await userStore.logout() }
</script>

<template>
    <div class="app-shell">
        <header class="app-header">
            <RouterLink :to="{ name: PAGE.Home }" class="app-title">数独</RouterLink>

            <nav v-if="showNav" class="app-nav">
                <RouterLink
                    :to="{ name: PAGE.MyPuzzles }"
                    class="nav-item"
                    :class="{ 'is-disabled': userStore.isGuest }"
                    :aria-disabled="userStore.isGuest || undefined"
                    :title="userStore.isGuest ? AUTH_COPY.needLogin : undefined"
                    @click="onMineClick"
                >{{ AUTH_COPY.myPuzzles }}</RouterLink>

                <RouterLink v-if="userStore.isGuest" :to="{ name: PAGE.Login }" class="nav-item is-primary">
                    {{ AUTH_COPY.login }}
                </RouterLink>
                <template v-else>
                    <span class="nav-user">👤 {{ userStore.uname }}</span>
                    <button class="nav-item" @click="logout">{{ AUTH_COPY.logout }}</button>
                </template>
            </nav>
        </header>

        <p v-if="tip" class="app-tip">{{ tip }}</p>

        <main class="app-main">
            <RouterView />
        </main>
    </div>
</template>

<style scoped>
.app-shell { max-width: 520px; margin: 0 auto; padding: 12px 12px 24px; }
.app-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.app-title { font-size: 1.1rem; font-weight: 700; color: #111827; text-decoration: none; letter-spacing: 1px; }
.app-nav { display: flex; align-items: center; gap: 6px; }
.nav-item {
    height: 30px; padding: 0 10px; display: inline-flex; align-items: center;
    border: 1px solid #d1d5db; border-radius: 8px; background: #fff;
    color: #374151; font-size: .82rem; text-decoration: none; cursor: pointer; transition: .15s;
}
.nav-item:hover { background: #eef2ff; border-color: #6366f1; }
.nav-item.is-primary { background: #6366f1; border-color: #4f46e5; color: #fff; font-weight: 600; }
.nav-item.is-disabled { opacity: .45; cursor: not-allowed; }
.nav-user { font-size: .82rem; color: #374151; }
.app-tip {
    margin: 0 0 8px; padding: 6px 12px; border-radius: 8px;
    background: #eef2ff; border: 1px solid #c7d2fe; color: #4f46e5;
    font-size: .85rem; text-align: center;
}
.app-main { min-height: 200px; }
</style>
