<script setup lang="ts">
import { PAGE } from '@/constants/pages'
import { AUTH_COPY } from '@/constants/user'
import { useAccountMenu } from '@/composables/auth/useAccountMenu'

const { isGuest, uname, showNav, logout } = useAccountMenu()
</script>

<template>
    <div class="app-shell">
        <header class="app-header">
            <!-- 常驻「回到主页」：三栏 grid 第 1 列（标题左边）—— 任何页面（含登录页）都能回主页 -->
            <RouterLink :to="{ name: PAGE.Home }" class="nav-item nav-home">🏠 回到主页</RouterLink>

            <span class="app-title">数独</span>

            <!-- 右侧账号位：游客「👤 登录」→ 登录页；登录后「👤 用户名」→「我的」页 + 退出；登录页自己就是入口 → 隐藏 -->
            <nav v-if="showNav" class="app-nav">
                <RouterLink v-if="isGuest" :to="{ name: PAGE.Login }" class="nav-item nav-user">
                    👤 {{ AUTH_COPY.login }}
                </RouterLink>

                <template v-else>
                    <RouterLink :to="{ name: PAGE.MyPuzzles }" class="nav-item nav-user"
                        :title="AUTH_COPY.meTitle">
                        👤 {{ uname }}
                    </RouterLink>
                    <button type="button" class="nav-item" @click="logout">{{ AUTH_COPY.logout }}</button>
                </template>
            </nav>
        </header>

        <main class="app-main">
            <RouterView />
        </main>

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
    height: 30px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #fff;
    color: #374151;
    font-size: .82rem;
    font-family: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: .15s;
}

.nav-item:hover {
    background: #eef2ff;
    border-color: #6366f1;
}

/* 账号位（游客「👤 登录」/ 登录后「👤 用户名」）：名字长了省略号，别把标题挤偏 */
.nav-user {
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 「回到主页」固定在标题左边（第 1 列），左对齐 */
.nav-home {
    grid-column: 1;
    justify-self: start;
}

.app-main {
    min-height: 200px;
}
</style>
