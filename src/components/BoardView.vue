<script setup lang="ts">
import { useCanvasStore } from '@/stores/canvas'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvasStore = useCanvasStore()
const canvasEl = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
    canvasStore.resetZoom()
    canvasStore.attach(canvasEl.value)
})
onBeforeUnmount(() => canvasStore.detach())
</script>

<template>
    <div class="board-scroll-container">
        <canvas
            ref="canvasEl"
            class="board-canvas"
            @click="canvasStore.handleClick"
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
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
    margin: auto;   
}
</style>