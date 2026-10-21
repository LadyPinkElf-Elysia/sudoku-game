<script setup lang="ts">
import { computed } from 'vue'
import { ElDialog } from 'element-plus'
import ActionBar from './ActionBar.vue'
import type { Actions } from '@/types/item'

/**
 * 遮罩（全站唯一一个）：**传数据 → 自己决定画什么**
 * 2026-10：本体换成 `el-dialog`（层级 / 焦点 / 遮罩动画都交给 EP），对外 props 不变
 * · text / desc —— 文案（不传就不占位）
 * · actions      —— 按钮条（#footer 里的 ActionBar；onClick 为空的自动禁用 → 纯文本观感）
 * · 默认插槽      —— 还要显示什么就放进来（如只读棋盘 BoardView）
 * 加载态不归它管：页面用 `v-loading`（见 DOC §11.3）
 */
const props = withDefaults(defineProps<{
    show: boolean
    /** 主文案 */
    text?: string
    /** 次要说明 */
    desc?: string
    /** 按钮条（有才渲染） */
    actions?: Actions
    /** 宽盒子（长文本 / 一串题面用） */
    wide?: boolean
}>(), { text: '', desc: '', wide: false })

/** 宽度：wide 给长文本（题面串 / 棋盘预览），否则收窄 */
const width = computed<string>(() => (props.wide ? '720px' : '320px'))
</script>

<template>
    <el-dialog class="overlay" :model-value="show" :width="width" align-center append-to-body
        destroy-on-close :show-close="false" :close-on-click-modal="false" :close-on-press-escape="false">
        <div class="overlay-body">
            <p v-if="text" class="overlay-title">{{ text }}</p>
            <p v-if="desc" class="overlay-desc">{{ desc }}</p>

            <slot />
        </div>

        <template v-if="actions?.length" #footer>
            <ActionBar :actions="actions ?? []" :gap="14" wrap />
        </template>
    </el-dialog>
</template>

<style scoped>
/* 壳（遮罩层 / 定位 / 过渡 / 焦点）全部由 el-dialog 负责。
   ⚠️ dialog 的 body/footer 在 Teleport 出来的节点里，scoped 追不进去 →
   它们的内边距写在全局 styles/overlay.css（.el-dialog.overlay ...） */

/* 内容区：文案 + 插槽纵向排 */
.overlay-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
</style>
