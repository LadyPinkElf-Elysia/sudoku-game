<script setup lang="ts">
import PuzzleMeta from './PuzzleMeta.vue';

defineProps<{
    /** 标题文本（不给 title 插槽时用它渲染） */
    title: string
    sideS: number
    blankCount: number
    createdAt: number
    playCount: number
}>()
</script>

<template>
    <!--
      列表项通用外壳（搜索卡片 / 「我的题目」行共用）：
      · #title  —— 标题位（缺省渲染纯标题；「我的题目」用 RenameText 换成可重命名标题）
      · #corner —— 右上角操作位（TextButtons：删除 · 编辑）
      · 默认插槽 —— 卡片主体（SecretValue / PuzzleSettings / TextButtons / ActionItem …）
    -->
    <article class="card">
        <header class="head">
            <div class="title-line">
                <slot name="title">
                    <h3 class="title" :title="title">{{ title }}</h3>
                </slot>
            </div>

            <div v-if="$slots.corner" class="corner">
                <slot name="corner" />
            </div>
        </header>

        <PuzzleMeta :side-s="sideS" :blank-count="blankCount" :created-at="createdAt" :play-count="playCount" />

        <slot />
    </article>
</template>

<style scoped>
.card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 12px 14px;
    background: #fff;
}

.head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
}

.title-line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex: 1;
    min-width: 0;
}

.title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
    word-break: break-all;
}

.corner {
    display: flex;
    flex: none;
    gap: 10px;
}
</style>
