<script setup>
import { ref } from 'vue'
import {
    game, hintsLeft, revealedHints, revealHintAt,
} from '../../composables/useGame'
import { GAME_STATUS, MAX_HINTS } from '../../config'

const selectedIndex = ref(0)

function onReveal() {
    revealHintAt(selectedIndex.value)
}
</script>

<template>
    <section class="hint-section" aria-label="提示区">
        <div class="hint-controls">
            <select v-model.number="selectedIndex" aria-label="选择位置">
                <option v-for="n in game.rules.length" :key="n" :value="n - 1">
                    第 {{ n }} 位
                </option>
            </select>
            <button
                :disabled="hintsLeft <= 0 || game.status !== GAME_STATUS.PLAYING"
                @click="onReveal"
            >
                施法（剩 {{ hintsLeft }}/{{ MAX_HINTS }}）
            </button>
        </div>

        <ul v-if="revealedHints.length" class="hint-list">
            <li v-for="(text, i) in revealedHints" :key="i">
                ✨ {{ text }}
            </li>
        </ul>
    </section>
</template>