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

/** 三入口：开始游戏 / 出题（游客灰显）/ 搜索题目 */
const menuItems = computed<Menus>(() => [
    { key: 'start', icon: '▶', message: '开始游戏', routeName: PAGE.Difficulty },
    { key: 'create', icon: '✏️', message: '出题', routeName: PAGE.Create, disabled: userStore.isGuest },
    { key: 'search', icon: '🔍', message: '搜索题目', routeName: PAGE.Search },
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
        <!-- 入口就是三条可点击文本（灰显的那条点了给提示） -->
        <Flex direction="column" align="start" :gap="14">
            <TextAction v-for="m in menuItems" :key="m.key" class="entry" :class="{ 'is-dim': m.disabled }"
                :text="`${m.icon ?? ''} ${m.message}`" :on-click="() => go(m)" />
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

.entry.is-dim {
    opacity: 0.5;
}
</style>
