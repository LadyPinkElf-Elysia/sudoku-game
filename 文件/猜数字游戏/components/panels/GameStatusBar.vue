<script setup>
import { computed } from 'vue'
import { game, scoreInfo } from '../../composables/useGame'
import { DIFFICULTY_PRESETS } from '../../config'

const gameName = computed(() => {
    if (game.mode === 'custom') return `自定义 ${game.rules.length} 位`
    const preset = DIFFICULTY_PRESETS[game.mode]
    return `经典 · ${preset ? preset.label : game.mode}`
})
</script>

<template>
    <p class="status-bar" role="status">
        {{ gameName }} ｜
        第 {{ game.guesses.length }} / {{ game.rules.maxAttempts }} 次 ｜
        难度分 {{ scoreInfo.final }}
    </p>
</template>