<script setup lang="ts">
import { useGameStore } from '@/stores/game';
import { ref, watch, nextTick } from 'vue';
import HistoryStep from './HistoryStep.vue';

const gameStore = useGameStore()
const stepsEl = ref<HTMLElement | null>(null)

/** 当前步变化后把它滚进视野，否则步数多时看不到"当前步" */
watch(() => gameStore.currentStep, async () => {
    await nextTick()
    stepsEl.value?.querySelector('.step-block.active')?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
})
</script>

<template>
    <div class="history-section" v-if="gameStore.snapshots.length">
        <div class="history-label">
            📜 历史记录
            <span class="step-counter">{{ gameStore.currentStep }} / {{ gameStore.snapshots.length - 1 }}</span>
        </div>
        <div class="history-steps-container" ref="stepsEl">
            <HistoryStep v-for="i in gameStore.snapshots.length" :key="i - 1" :step="i - 1" />
        </div>
    </div>
</template>

<style scoped>
.history-section {
    margin: 10px 0;
}

.history-label {
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: 600;
    margin-bottom: 4px;
    text-align: left;
}

.history-steps-container {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    width: 100%;
    min-height: 46px;
    padding: 4px 0 8px;
    overflow-x: auto;
    overflow-y: hidden;
    box-sizing: border-box;
    scrollbar-width: auto;
    scrollbar-color: #94a3b8 #f1f5f9;
}

.history-steps-container::-webkit-scrollbar {
    height: 12px;
    background: #f1f5f9;
    border-radius: 6px;
}

.history-steps-container::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 6px;
}

.history-steps-container::-webkit-scrollbar-thumb:hover {
    background: #64748b;
}

.history-steps-container::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
}
</style>