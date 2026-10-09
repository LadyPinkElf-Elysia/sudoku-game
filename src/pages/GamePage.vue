<script setup lang="ts">
import ActionItems from '@/components/ActionItems.vue';
import BoardView from '@/components/BoardView.vue';
import NumberPad from '@/components/NumberPad.vue';
import StepItems from '@/components/HistoryBar.vue';
import Overlay from '@/components/Overlay.vue';
import { BOARD_ZOOM } from '@/constants/board';
import { GAME_STATUS } from '@/constants/game';
import { PAGE } from '@/constants/pages';
import { useCanvasStore } from '@/stores/canvas';
import { useGameStore } from '@/stores/game';
import type { ActionDef } from '@/types/action';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const gameStore = useGameStore()
const canvasStore = useCanvasStore()
const router = useRouter()

const tip = ref<string>('')

const hint = (): void => {
    const cell = gameStore.selectedCell
    if (!cell) { tip.value = '请选中一个格子'; return }
    if (cell.lock) { tip.value = '无法更改初始题目'; return }
    const cands = gameStore.getCandidates(gameStore.selected!)
    tip.value = `此格可以填：${cands.join('、') || '无'}`
}

const actions = computed<ActionDef[]>(() => [
    { key: 'difficulty', icon: '◀', message: '返回', onClick: () => router.replace({ name: PAGE.Difficulty }) },
    { key: 'zoomOut', icon: '➖', message: '缩小', disabled: canvasStore.zoom <= BOARD_ZOOM.min, onClick: canvasStore.zoomOut },
    { key: 'zoomIn', icon: '➕', message: '放大', disabled: canvasStore.zoom >= BOARD_ZOOM.max, onClick: canvasStore.zoomIn },
    { key: 'hint', icon: '💡', message: '提示', onClick: hint },
    ...(import.meta.env.DEV ? [{ key: 'answer', icon: '⚡', message: '作弊', onClick: gameStore.cheat }] : []),
])

onMounted(() => {
    if (!gameStore.board.length) {
        router.replace({ name: PAGE.Difficulty })
    }
})

const winOverlay = computed(() => {
    if (gameStore.status !== GAME_STATUS.Won) return null
    return {
        title: '🎉 恭喜完成',
        desc: '全部填对，太厉害了',
    }
})

const resultActions: ActionDef[] = [
    { key: 'home', icon: '🏠', message: '回主页', onClick: () => router.replace({ name: PAGE.Home }) },
    { key: 'again', icon: '↺', message: '再来一局', onClick: () => router.replace({ name: PAGE.Difficulty }) },
];
</script>

<template>
    <div class="page-card wide">
        <ActionItems :items="actions">
            <template v-if="tip" #tip>{{ tip }}</template>
        </ActionItems>
        <BoardView></BoardView>
        <StepItems></StepItems>
        <NumberPad></NumberPad>

        <Overlay :show="!!winOverlay">
            <p class="overlay-title">{{ winOverlay?.title }}</p>
            <p class="overlay-desc">{{ winOverlay?.desc }}</p>
            <ActionItems :items="resultActions" />
        </Overlay>
    </div>
</template>

<style scoped>
.overlay-title {
    margin: 0;
    font-size: 1.1rem;
    color: #111827;
}

.overlay-desc {
    margin: 8px 0 0;
    font-size: 0.85rem;
    color: #6b7280;
}
</style>