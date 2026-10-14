<script setup lang="ts">
import Flex from '@/components/Flex.vue';
import { PAGE } from '@/constants/pages';

/** 子导航：两个 Tab（默认 Tab = 系统生成，由 router 守卫补，见 router/index.ts） */
const TABS = [
    { name: PAGE.DifficultySystem, label: '系统生成' },
    { name: PAGE.DifficultyCustom, label: '自定义' },
];
</script>

<template>
    <!-- 壳：只负责子导航 + 主内容出口；具体表单在 pages/difficulty/* -->
    <div class="page-card">
        <Flex class="sub-nav" :gap="6">
            <RouterLink v-for="tab in TABS" :key="tab.name" :to="{ name: tab.name }" class="sub-tab"
                active-class="is-active">
                {{ tab.label }}
            </RouterLink>
        </Flex>

        <main class="sub-main">
            <RouterView />
        </main>
    </div>
</template>

<style scoped>
/* .sub-nav / .sub-tab 已提为全局样式（styles/form.css）—— 难度页壳与题目求解的输入方式共用同一套 Tab 视觉 */

.sub-main {
    min-height: 160px;
}
</style>
