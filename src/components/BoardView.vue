<script setup lang="ts">
import { ref } from "vue";
import { BOARD_ZOOM } from '@/constants/board'
import { useBoardCanvas } from '@/composables/board/useBoardCanvas'
import type { Board, ConflictMask, Position } from '@/types/board'

const props = withDefaults(
    defineProps<{
        board: Board
        boxSize: number
        selected?: Position | null
        conflictMask?: ConflictMask
        zoom?: number
        interactive?: boolean
    }>(),
    { selected: null, zoom: BOARD_ZOOM.default, interactive: true },
)

const emit = defineEmits<{ 'cell-click': [pos: Position] }>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const { onCanvasClick } = useBoardCanvas(canvasEl, () => props, pos => emit('cell-click', pos))

</script>

<template>
    <div class="board-scroll-container">
        <canvas
            ref="canvasEl"
            class="board-canvas"
            @click="onCanvasClick"
            :class="{ 'is-interactive': interactive }"
        ></canvas>
    </div>
</template>

<style scoped>
.board-scroll-container {
    box-sizing: border-box;
    width: 100%;
    max-height: 60vh;
    overflow: auto;
    scrollbar-gutter: stable;   /* ← 新增 */
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

.board-canvas {
    display: block;
    background: #fff;
    border-radius: 4px;
    user-select: none;
    touch-action: manipulation;
    margin: auto;   
}

/* 预览（interactive=false）不显示手型 */
.board-canvas.is-interactive {
    cursor: pointer;
}

</style>