<script setup lang="ts">
import { computed, type Component } from 'vue'
import { ElButton, ElIcon } from 'element-plus'
import {
    ArrowRight, Back, Bottom, Brush, Close, CopyDocument, Delete, EditPen, FolderAdd, Grid, Key, List,
    Opportunity, Reading, RefreshLeft, Select, Share, SwitchButton, Upload, VideoPlay, View, ZoomIn, ZoomOut,
} from '@element-plus/icons-vue'
import Flex from './Flex.vue'
import type { Action, Actions } from '@/types/item'

/**
 * 动作条（**全站唯一一处「一排文字按钮」**）：传 `Actions` → 自己画
 * · `disabled` / 没有 `onClick` → 禁用（保持"纯文本"观感，见 styles/form.css 的 .is-disabled）
 * · **图标按 `action.key` 映射**（文案表里不再写 emoji）；没映射的 key 就只显示文字
 * · 间距 / 对齐 / 换行全部透传给 Flex；按钮样式走全局 `.text-action`
 */
const props = withDefaults(defineProps<{
    /** 按钮数据（`constants/actions` 的 ACTION + ACTION_OF 生成） */
    actions: Actions
    /** 间距（px） */
    gap?: number
    /** 主轴对齐 */
    justify?: 'start' | 'center' | 'end' | 'between'
    /** 放不下就换行 */
    wrap?: boolean
}>(), { gap: 12, justify: 'center', wrap: false })

/** key → EP 图标（**唯一图标表**，键是 `Action.key` 的值；新增动作时在这里补一行，文案表保持纯文字） */
const ICON_OF: Record<string, Component> = {
    // 导航 / 关闭（back 覆盖「返回 / 我的题目 / 继续修改」，close 覆盖「返回 / 回到挑战」）
    back: Back, close: Close,
    // 游戏页（提示＝灯泡 Opportunity；作弊＝钥匙 Key）
    restart: RefreshLeft, hint: Opportunity, answer: Reading, cheat: Key,
    // 导出题目＝把题面分享出去（打开遮罩里是题面串，不是下载文件）
    export: Share, save: FolderAdd,
    // 存档列表
    resume: VideoPlay, rename: EditPen, remove: Delete,
    // 缩放（贴棋盘）
    zoomOut: ZoomOut, zoomIn: ZoomIn,
    // 出题 / 编辑 / 开局
    submit: Upload, goMine: List, start: VideoPlay, challenge: VideoPlay,
    // 列表项 / 预览 / 改名
    preview: View, edit: EditPen,
    // 导出 / 取消
    puzzle: CopyDocument, cancel: Close,
    // 求解页（填入棋盘＝把解析结果"放下去" Bottom）
    fill: Bottom, clear: Brush, solve: Grid,
    // 账号
    logout: SwitchButton, copy: CopyDocument, copied: Select, done: ArrowRight,
}

/** 预先算好「动作 + 图标」，模板里就不用重复查表 */
const rows = computed<Array<{ action: Action; icon: Component | undefined }>>(() =>
    props.actions.map((action) => ({ action, icon: ICON_OF[action.key] })),
)
</script>

<template>
    <Flex :gap="gap" :justify="justify" :wrap="wrap">
        <el-button v-for="r in rows" :key="r.action.key" class="text-action" link
            :disabled="r.action.disabled ?? !r.action.onClick" @click="r.action.onClick">
            <template v-if="r.icon">
                <el-icon class="action-icon"><component :is="r.icon" /></el-icon>
            </template>
            {{ r.action.text }}
        </el-button>
    </Flex>
</template>

<style scoped>
/*
 * 图标与文字之间留 2px（按钮本身已有 gap: 4px，图标再小一点更贴文字）
 * · EP 图标是 `fill="currentColor"`，所以颜色必须显式给：默认主色（文字仍保持正文色 → 一眼能区分）
 * · 想改成"跟文字同色"，把 --action-icon-color 设成 inherit 即可
 */
.action-icon {
    margin-right: 2px;
    font-size: 14px;
    color: var(--action-icon-color, var(--el-color-primary));
}

/* 禁用：图标跟文字一起变灰（不保留主色，否则看着还像能点） */
.el-button.is-disabled .action-icon {
    color: inherit;
}
</style>

