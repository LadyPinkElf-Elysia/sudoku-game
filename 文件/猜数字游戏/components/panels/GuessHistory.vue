<script setup>
import { game } from '../../composables/useGame'
import GuessRow from '../ui/GuessRow.vue'
</script>

<template>
    <ul v-if="game.guesses.length" class="guess-list" aria-label="猜测历史">
        <li v-for="(g, i) in game.guesses" :key="i">
            <GuessRow :index="i" :value="g.value" :colors="g.colors" />
        </li>
    </ul>
</template>