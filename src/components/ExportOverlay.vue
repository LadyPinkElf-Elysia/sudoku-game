<script setup lang="ts">
import { computed, ref } from 'vue'
import Overlay from './Overlay.vue'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
import { EXPORT_COPY } from '@/constants/copy'
import { useClipboard } from '@/composables/useClipboard'
import type { Actions } from '@/types/item'

/**
 * 题目导出遮罩（**纯展示 + 复制**）：组件只认「开不开 / 串是什么」
 * · 复制动作与"已复制 / 复制失败"提示都封在组件内部（用 useClipboard）
 * · 关掉时 emit('close')，由页面决定是否收起 —— 组件不碰 store、不碰路由（R5）
 */
const props = defineProps<{
    show: boolean
    /** 要导出的题面串（页面用 givenBoard + boardToStr 生成；不含答案） */
    puzzleText: string
}>()
const emit = defineEmits<{ close: [] }>()

const { copy } = useClipboard()
/** 复制结果提示（只在遮罩里显示，不进页面的 tip 行） */
const tip = ref('')

const copyPuzzle = async (): Promise<void> => {
    tip.value = (await copy(props.puzzleText))
        ? `${EXPORT_COPY.puzzleShort}已复制`
        : EXPORT_COPY.copyFail
}

const actions = computed<Actions>(() => [
    actionOf(ACTION.copyPuzzle, () => { void copyPuzzle() }),
    actionOf(ACTION.close, () => { emit('close') }),
])
</script>

<template>
    <Overlay :show="show" wide :text="EXPORT_COPY.title" :desc="tip" :actions="actions">
        <p class="export-label">{{ EXPORT_COPY.puzzleLabel }}</p>
        <textarea class="input textarea export-text" readonly :value="puzzleText"></textarea>
    </Overlay>
</template>

<style scoped>
/* 导出遮罩里的题面串：小标题 + 等宽只读文本（.input / .textarea 来自全局样式） */
.export-label {
    margin: 12px 0 4px;
    font-size: 0.78rem;
    color: #6b7280;
    text-align: left;
}

.export-text {
    width: 100%;
    box-sizing: border-box;
    height: 110px;
}
</style>
