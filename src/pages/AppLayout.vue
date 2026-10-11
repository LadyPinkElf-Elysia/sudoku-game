<script setup lang="ts">
import Flex from '@/components/Flex.vue'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY } from '@/constants/user'
import { useAccountMenu } from '@/composables/auth/useAccountMenu'

const { isGuest, uname, showNav } = useAccountMenu()
</script>

<template>
    <div class="app-shell">
        <header class="app-header">
            <!-- 常驻「回到主页」：三栏 grid 第 1 列（标题左边）—— 任何页面（含登录页）都能回主页 -->
            <RouterLink :to="{ name: PAGE.Home }" class="nav-item nav-home">主页</RouterLink>

            <span class="app-title">数独</span>

            <!-- 右侧账号位：游客「👤 登录」→ 登录页；登录后「👤 用户名」→「我的」页（退出在「我的」页账号区）；登录页自己就是入口 → 隐藏 -->
            <Flex v-if="showNav" class="app-nav" justify="end" :gap="6" wrap>
                <RouterLink v-if="isGuest" :to="{ name: PAGE.Login }" class="nav-item nav-user">
                    👤 {{ AUTH_COPY.login }}
                </RouterLink>

                <RouterLink v-else :to="{ name: PAGE.MyPuzzles }" class="nav-item nav-user"
                    :title="AUTH_COPY.meTitle">
                    👤 {{ uname }}
                </RouterLink>
            </Flex>
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

/* 导航固定在第三列、靠右（排布交给 Flex）；窄屏换行也不会把标题挤偏 */
.app-nav {
    grid-column: 3;
    min-width: 0;
}

/* 顶栏的入口 = 普通文字（不变蓝、不加下划线） */
.nav-item {
    color: inherit;
    font-size: .82rem;
    font-family: inherit;
    text-decoration: none;
    cursor: pointer;
}

/* 账号位（游客「👤 登录」/ 登录后「👤 用户名」）：名字长了省略号，别把标题挤偏 */
.nav-user {
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* 「主页」固定在标题左边（第 1 列），左对齐 */
.nav-home {
    grid-column: 1;
    justify-self: start;
}

.app-main {
    min-height: 200px;
}
</style>
