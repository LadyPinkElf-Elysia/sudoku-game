<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElIcon } from 'element-plus'
import { EditPen, FolderOpened, Grid, Search, User, VideoPlay } from '@element-plus/icons-vue'
import Flex from '@/components/Flex.vue'
import TipLine from '@/components/TipLine.vue'
import { PAGE } from '@/constants/pages'
import { AUTH_COPY, SAVE_COPY } from '@/constants/copy'
import { errorTextOf } from '@/core/message'
import { useTip } from '@/composables/useTip'
import { useUserStore } from '@/stores/user'
import type { Menus } from '@/types/item'

const router = useRouter()
const userStore = useUserStore()

/** 灰显项被点击后的本页提示条文案（3 秒后自动淡出） */
const { tip, showTip, clearTip } = useTip()

/** 菜单项的图标（按 key 取 EP 图标；`constants` 层只放值，不放组件） */
const MENU_ICON: Record<string, Component> = {
    resume: FolderOpened,
    about: User,
    start: VideoPlay,
    create: EditPen,
    search: Search,
    solve: Grid,
}

/** 入口：继续游戏（没存档也照进，页面上看空态）/ 关于我的 / 开始游戏 / 出题（游客灰显）/ 搜索题目 / 题目求解 */
const menuItems = computed<Menus>(() => [
    { key: 'resume', message: SAVE_COPY.title, to: { name: PAGE.Resume } },
    { key: 'about', message: '关于我的', to: { name: PAGE.MyPuzzles } },
    { key: 'start', message: '开始游戏', to: { name: PAGE.Difficulty } },
    { key: 'create', message: '出题模式', to: { name: PAGE.Create }, disabled: userStore.isGuest },
    { key: 'search', message: '搜索题目', to: { name: PAGE.Search } },
    { key: 'solve', message: '题目求解', to: { name: PAGE.Solve } },
])

/**
 * 灰显项不跳页、只给提示（只有"需要登录"这一种）
 * · **跳转失败要说出来**：目标页是懒加载的，一旦那个 .vue 编译不过 / 动态 import 404，
 *   `router.push` 会 reject —— 不 catch 就表现成"点了没反应"（排查时最容易误判）
 */
const go = async (item: Menus[number]): Promise<void> => {
    if (item.disabled) { showTip(AUTH_COPY.needLogin); return }
    clearTip()
    try {
        await router.push(item.to)
    } catch (err) {
        showTip(errorTextOf(err, `打开「${item.message}」失败`))
    }
}
</script>

<template>
    <!-- 卡片里不放「数独」标题：顶栏 AppLayout 已有居中的品牌名 -->
    <div class="page-card home-page">
        <!-- 入口就是几条可点击文本（灰显的那条点了给提示）；图标与文字分两列 → 标签起点对齐 -->
        <Flex direction="column" align="start" :gap="14">
            <el-button v-for="m in menuItems" :key="m.key" class="text-action entry" :class="{ 'is-dim': m.disabled }"
                link @click="go(m)">
                <el-icon class="entry-icon"><component :is="MENU_ICON[m.key]" /></el-icon>
                <span class="entry-label">{{ m.message }}</span>
            </el-button>
        </Flex>

        <TipLine :text="tip" />
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
 * 图标列固定宽 + 居中：EP 图标宽度一致，但定宽能让所有标签起点对齐
 * 颜色给主色（图标是 currentColor，不给就跟着正文变黑）
 */
.entry-icon {
    display: inline-flex;
    justify-content: center;
    width: 1.4em;
    font-size: 1.05rem;
    color: var(--el-color-primary);
}

.entry-label {
    text-align: left;
}

.entry.is-dim {
    opacity: 0.5;
}
</style>
