<script setup lang="ts">
import { PAGE } from '@/constants/pages';

/** 子导航：两个 Tab（'' → redirect 到系统生成，实现"不记忆"） */
const TABS = [
    { name: PAGE.DifficultySystem, label: '系统生成' },
    { name: PAGE.DifficultyCustom, label: '自定义' },
];
</script>

<template>
    <!-- 壳：只负责子导航 + 主内容出口；具体表单在 pages/difficulty/* -->
    <div class="page-card">
        <nav class="sub-nav">
            <RouterLink v-for="tab in TABS" :key="tab.name" :to="{ name: tab.name }" class="sub-tab"
                active-class="is-active">
                {{ tab.label }}
            </RouterLink>
        </nav>

        <main class="sub-main">
            <RouterView />
        </main>
    </div>
</template>

<style scoped>
.sub-nav {
    display: flex;
    gap: 6px;
    padding: 4px;
    margin-bottom: 18px;
    background: #f3f4f6;
    border-radius: 10px;
}

.sub-tab {
    flex: 1;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: #6b7280;
    font-size: 0.85rem;
    text-decoration: none;
    transition: 0.15s;
}

.sub-tab:hover {
    color: #4f46e5;
}

.sub-tab.is-active {
    background: #fff;
    color: #4f46e5;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.sub-main {
    min-height: 160px;
}
</style>
