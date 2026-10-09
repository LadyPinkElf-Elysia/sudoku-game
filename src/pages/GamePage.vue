<script setup lang="ts">
import ActionItems from '@/components/ActionItems.vue';
import BoardView from '@/components/BoardView.vue';
import NumberPad from '@/components/NumberPad.vue';
import StepItems from '@/components/StepItems.vue';
import { BOARD_ZOOM } from '@/constants/board';
import { GAME_CONFIG } from '@/constants/game';
import { useCanvasStore } from '@/stores/canvas';
import { useGameStore } from '@/stores/game';
import type { ActionDef } from '@/types/actionDef';
import { generate } from '@/utils/sudoku/generator';
import { computed, onMounted, ref } from 'vue';

const gameStore = useGameStore()

const canvasStore=useCanvasStore()

const playerConfig = ref({ ...GAME_CONFIG })

const play = async (): Promise<void> => {
    tip.value = ''
    try {
        const cfg = playerConfig.value
        const { puzzle } = await generate(cfg.boxSize, cfg.blanks)
        gameStore.startFromPuzzle(puzzle, cfg)
    } catch (err) {
        tip.value = err instanceof Error ? err.message : '生成失败，请重试'
    }
}

const tip = ref<string>('')
const hint = (): void => {
    const cell = gameStore.selectedCell
    if (!cell) { tip.value = '请选中一个格子'; return }
    if (cell.lock) { tip.value = '无法更改初始题目'; return }
    const cands = gameStore.getCandidates(gameStore.selected!)
    tip.value = `此格可以填：${cands.join('、') || '无'}`
}

const actions = computed<ActionDef[]>(() => [
    { key: 'undo', icon: '↩', message: '撤回', disabled: !gameStore.canUndo, onClick: gameStore.undo },
    { key: 'redo', icon: '↪', message: '重做', disabled: !gameStore.canRedo, onClick: gameStore.redo },
    { key: 'restart', icon: '↺', message: '重开', onClick: gameStore.restart },
    { key: 'hint', icon: '💡', message: '提示', onClick: hint },
    { key: 'zoomOut', icon: '➖', message: '缩小', disabled: canvasStore.zoom <= BOARD_ZOOM.min, onClick: canvasStore.zoomOut },
    { key: 'zoomIn', icon: '➕', message: '放大', disabled: canvasStore.zoom >= BOARD_ZOOM.max, onClick: canvasStore.zoomIn },
])

onMounted(()=>{void play()})
</script>

<template>
    <div class="game-page">
        <ActionItems :items="actions">
            <template v-if="tip" #tip>{{ tip }}</template>
        </ActionItems>
        <BoardView></BoardView>
        <StepItems></StepItems>
        <NumberPad></NumberPad>
    </div>
</template>

<style scoped>
.game-page {
    max-width: 580px;
    margin: 20px auto;
    padding: 16px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}
</style>