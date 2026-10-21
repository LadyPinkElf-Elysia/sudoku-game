<script setup lang="ts">
import { ref } from "vue";
import ActionBar from "./ActionBar.vue";
import { useBoardRender } from '@/composables/board/useBoardRender'
import type { Board, ConflictMask, Position } from '@/types/board'

/**
 * 棋盘（**唯一同时拥有"画"和"缩放"的组件**）
 * · 渲染 + 缩放全部由 `useBoardRender` 提供（组件只接线，不碰 core / store / router —— R2/R5）
 * · 对外用 `defineExpose` 暴露缩放动作；缩放值本身不出组件
 */
const props = withDefaults(
    defineProps<{
        board: Board
        boxSize: number
        selected?: Position | null
        conflictMask?: ConflictMask
        /** 可玩（接点击）还是只读（纯 canvas 画出来）；默认可玩 */
        interactive?: boolean
    }>(),
    { selected: null, interactive: true },
)

const emit = defineEmits<{ 'cell-click': [pos: Position] }>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
/** 外层滚动框：量它（canvas 的直接父级会随棋盘收缩，量它会把当前宽度当上限） */
const boxEl = ref<HTMLElement | null>(null)

const { onCanvasClick, zoomActions, zoomIn, zoomOut, resetZoom } =
    useBoardRender(canvasEl, boxEl, () => props, pos => emit('cell-click', pos))

/** **对外只暴露缩放动作**（值不出组件；需要复位就调 resetZoom） */
defineExpose({ zoomIn, zoomOut, resetZoom })
</script>

<template>
    <div class="board-box">
        <!--
          缩放：**固定在棋盘上方、水平居中** —— 放在滚动框外面，
          所以棋盘放大到要横向 / 纵向滚动时，这一对也不会跟着滚走
        -->
        <ActionBar class="board-zoom" :actions="zoomActions" :gap="8" />

        <!-- 只读（interactive=false）= 纯 canvas，不接任何动作；可玩才接 cell-click -->
        <div ref="boxEl" class="board-scroll-container">
            <div class="board-fit">
                <canvas ref="canvasEl" class="board-canvas" v-on="interactive ? { click: onCanvasClick } : {}"
                    :class="{ 'is-interactive': interactive }"></canvas>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 棋盘整体：缩放行 + 滚动框（缩放行在滚动框外面 → 不随棋盘滚动） */
.board-box {
    width: 100%;
}

/* 棋盘 + 缩放行不属于滚动内容，所以这里只需要给棋盘框自己的规格 */
.board-scroll-container {
    box-sizing: border-box;
    width: 100%;
    max-height: 60vh;
    overflow: auto;
    scrollbar-gutter: stable;
    /* ← 新增 */
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 8px;
    display: flex;
    scrollbar-width: auto;
    scrollbar-color: #94a3b8 #f1f5f9;
}

.board-scroll-container::-webkit-scrollbar {
    width: 12px;
    height: 12px;
    background: #f1f5f9;
    border-radius: 6px;
}

.board-scroll-container::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 6px;
}

.board-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #64748b;
}

.board-scroll-container::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
}

/* 棋盘 + 缩放圆圈同一框：这个框随棋盘收缩，圆点正好贴棋盘左边界、在棋盘正上方 */
.board-fit {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin: auto;
}

.board-zoom {
    display: flex;
    justify-content: center;   /* 始终在棋盘上方水平居中 */
    gap: 8px;
    margin-bottom: 6px;
}

/* 缩放的一对小圆圈（文字就是 ➕ ➖；到界没有点击函数 → 就是纯文本） */
.zoom-btn {
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid #d1d5db;
    background: #fff;
    font-size: 1.05rem;
}

.board-canvas {
    display: block;
    background: #fff;
    border-radius: 4px;
    user-select: none;
    touch-action: manipulation;
}

/* 预览（interactive=false）不显示手型 */
.board-canvas.is-interactive {
    cursor: pointer;
}
</style>