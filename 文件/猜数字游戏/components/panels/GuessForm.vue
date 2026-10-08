<script setup>
import { game, canSubmit, submitGuess, updateInput } from '../../composables/useGame'
import { GAME_STATUS } from '../../config'

const isFinished = () =>
    game.status === GAME_STATUS.WON || game.status === GAME_STATUS.LOST

function onSubmit() {
    submitGuess()
}
</script>

<template>
    <form class="guess-form" @submit.prevent="onSubmit">
        <input
            type="text"
            :value="game.input"
            :maxlength="game.rules.length"
            :disabled="isFinished()"
            :placeholder="`输入 ${game.rules.length} 位密码`"
            aria-label="输入猜测"
            @input="updateInput($event.target.value)"
        >
        <button type="submit" :disabled="!canSubmit">确认</button>
    </form>
</template>