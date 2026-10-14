<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Flex from '@/components/Flex.vue'
import TextAction from '@/components/TextAction.vue'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY } from '@/constants/user'
import { useUserStore } from '@/stores/user'
import type { Menus } from '@/types/item'

const router = useRouter()
const userStore = useUserStore()

/** 灰显项被点击后的本页提示条文案 */
const tip = ref('')

/** 入口：关于我的 / 开始游戏 / 出题（游客灰显）/ 搜索题目 / 题目求解 */
const menuItems = computed<Menus>(() => [
    { key: 'about', icon: '👤', message: '关于我的', routeName: PAGE.MyPuzzles },
    { key: 'start', icon: '▶', message: '开始游戏', routeName: PAGE.Difficulty },
    { key: 'create', icon: '✏️', message: '出题模式', routeName: PAGE.Create, disabled: userStore.isGuest },
    { key: 'search', icon: '🔍', message: '搜索题目', routeName: PAGE.Search },
    { key: 'solve', icon: '🧩', message: '题目求解', routeName: PAGE.Solve },
])

/** 灰显项不跳页、只给提示；要登录的入口点了也走这里 */
const go = (item: Menus[number]): void => {
    if (item.disabled) { tip.value = AUTH_COPY.needLogin; return }
    void router.push({ name: item.routeName })
}
</script>

<template>
    <!-- 卡片里不放「数独」标题：顶栏 AppLayout 已有居中的品牌名 -->
    <div class="page-card home-page">
        <!-- 入口就是几条可点击文本（灰显的那条点了给提示）；图标与文字分两列 → 标签起点对齐 -->
        <Flex direction="column" align="start" :gap="14">
            <TextAction v-for="m in menuItems" :key="m.key" class="entry" :class="{ 'is-dim': m.disabled }"
                :on-click="() => go(m)">
                <span class="entry-icon">{{ m.icon }}</span>
                <span class="entry-label">{{ m.message }}</span>
            </TextAction>
        </Flex>

        <p v-if="tip" class="tip">{{ tip }}</p>
    </div>
</template>

<style scoped>
.home-page {
    display: flex;
    flex-direction: column;
}

/* 入口比普通可点击文本大一号；灰显项淡一点 */
.entry {
    font-size: 0.95rem;
}

/*
 * 图标列固定宽 + 居中：emoji 字宽不一（👤 ▶ ✏️ 🔍 🧩），不定宽的话每条标签起点都会错开
 * （.text-action 已是 inline-flex + align-items:center + gap，这里只补列宽与左对齐）
 */
.entry-icon {
    display: inline-block;
    width: 1.6em;
    text-align: center;
}

.entry-label {
    text-align: left;
}

.entry.is-dim {
    opacity: 0.5;
}
</style>
