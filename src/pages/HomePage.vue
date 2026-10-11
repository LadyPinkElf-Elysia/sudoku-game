<script setup lang="ts">
import { computed, ref } from 'vue'
import MenuItems from '@/components/MenuItems.vue'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY } from '@/constants/user'
import { useUserStore } from '@/stores/user'
import type { Menus } from '@/types/item'

const userStore = useUserStore()

/** 灰显项被点击后的本页提示条文案 */
const tip = ref('')

/** 三入口：开始游戏 / 出题（游客灰显）/ 搜索题目 */
const menuItems = computed<Menus>(() => [
    { key: 'start', icon: '▶', message: '开始游戏', routeName: PAGE.Difficulty },
    { key: 'create', icon: '✏️', message: '出题', routeName: PAGE.Create, disabled: userStore.isGuest },
    { key: 'search', icon: '🔍', message: '搜索题目', routeName: PAGE.Search },
])

const onBlocked = (): void => { tip.value = AUTH_COPY.needLogin }
</script>

<template>
    <!-- 卡片里不放「数独」标题：顶栏 AppLayout 已有居中的品牌名 -->
    <div class="page-card home-page">
        <MenuItems :items="menuItems" @blocked="onBlocked">
            <template v-if="tip" #tip>{{ tip }}</template>
        </MenuItems>
    </div>
</template>

<style scoped>
.home-page {
    display: flex;
    flex-direction: column;
}
</style>
