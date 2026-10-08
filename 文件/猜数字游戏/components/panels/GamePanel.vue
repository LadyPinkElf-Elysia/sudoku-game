<script setup>
import { ref } from 'vue'
import BasePanel from '../ui/BasePanel.vue'
import RulesSection from '../ui/RulesSection.vue'
import GameStatusBar from './GameStatusBar.vue'
import GuessForm from './GuessForm.vue'
import HintSection from './HintSection.vue'
import GuessHistory from './GuessHistory.vue'
import { game, startNewGame } from '../../composables/useGame'
import { settings } from '../../composables/useSettings'
import { GAME_STATUS } from '../../config'

const emit = defineEmits(['back', 'restart', 'history'])

const showRules = ref(false)

function restart() {
    startNewGame()
    emit('restart')
}
</script>

<template>
    <BasePanel>
        <template #heading>妖精的小游戏♪</template>

        <GameStatusBar />

        <details class="rules-toggle" :open="showRules" @toggle="showRules = $event.target.open">
            <summary>游戏规则</summary>
            <RulesSection
                :rules="game.rules"
                :dynamic-count="settings.dynamicCount"
            />
        </details>

        <GuessForm />

        <HintSection />

        <p v-if="game.status === GAME_STATUS.WON" class="message win">
            🎉 猜对了！答案是 {{ game.secret }}
        </p>
        <p v-else-if="game.status === GAME_STATUS.LOST" class="message lose">
            💔 失败，答案是 {{ game.secret }}
        </p>

        <GuessHistory />

        <template #footer>
            <button class="btn-secondary" @click="emit('back')">返回</button>
            <button class="btn-secondary" @click="restart">重开</button>
            <button class="btn-secondary" @click="emit('history')">战绩</button>
        </template>
    </BasePanel>
</template>