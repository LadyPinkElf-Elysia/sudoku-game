<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Flex from '@/components/Flex.vue'
import TextAction from '@/components/TextAction.vue'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY, SAVE_COPY } from '@/constants/copy'
import { errorTextOf } from '@/core/message'
import { useUserStore } from '@/stores/user'
import type { Menus } from '@/types/item'

const router = useRouter()
const userStore = useUserStore()

/** 灰显项被点击后的本页提示条文案 */
const tip = ref('')

/** 入口：继续游戏（没存档也照进，页面上看空态）/ 关于我的 / 开始游戏 / 出题（游客灰显）/ 搜索题目 / 题目求解 */
const menuItems = computed<Menus>(() => [
    { key: 'resume', icon: '💾', message: SAVE_COPY.title, routeName: PAGE.Resume },
    { key: 'about', icon: '👤', message: '关于我的', routeName: PAGE.MyPuzzles },
    { key: 'start', icon: '▶', message: '开始游戏', routeName: PAGE.Difficulty },
    { key: 'create', icon: '✏️', message: '出题模式', routeName: PAGE.Create, disabled: userStore.isGuest },
    { key: 'search', icon: '🔍', message: '搜索题目', routeName: PAGE.Search },
    { key: 'solve', icon: '🧩', message: '题目求解', routeName: PAGE.Solve },
])

/**
 * 灰显项不跳页、只给提示（只有"需要登录"这一种）
 * · **跳转失败要说出来**：目标页是懒加载的，一旦那个 .vue 编译不过 / 动态 import 404，
 *   `router.push` 会 reject —— 不 catch 就表现成"点了没反应"（排查时最容易误判）
 */
const go = async (item: Menus[number]): Promise<void> => {
    if (item.disabled) { tip.value = AUTH_COPY.needLogin; return }
    tip.value = ''
    try {
        await router.push({ name: item.routeName })
    } catch (err) {
        tip.value = errorTextOf(err, `打开「${item.message}」失败`)
    }
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
