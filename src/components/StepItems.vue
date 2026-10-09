<script setup lang="ts">
import StepItem from '@/components/StepItem.vue';
import { useGameStore } from '@/stores/game';

const gameStore = useGameStore()
</script>

<template>
    <div class="history-section" v-if="gameStore.history.length">
        <div class="history-label">
            📜 历史记录
            <span class="step-counter">{{ gameStore.steps }} / {{ gameStore.history.length - 1 }}</span>
        </div>
        <div class="history-steps-container">
            <StepItem v-for="i in gameStore.history.length" :key="i - 1" :step="i - 1" />
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