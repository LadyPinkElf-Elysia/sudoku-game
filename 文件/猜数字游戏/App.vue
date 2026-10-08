<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { game, startNewGame } from './composables/useGame'

import WelcomePanel from './components/panels/WelcomePanel.vue'
import ModePanel from './components/panels/ModePanel.vue'
import GamePanel from './components/panels/GamePanel.vue'
import HistoryPanel from './components/panels/HistoryPanel.vue'
import SettingsPanel from './components/panels/SettingsPanel.vue'

/* 单枚举面板控制 */
const current = ref('welcome')

function go(name) {
    current.value = name
}

function handleStart() {
    go('game')
}

/* 作弊键：游戏中按 S 显示答案 */
function onKeydown(e) {
    if (current.value === 'game' && e.key === 's') {
        e.preventDefault()
        alert(`答案是：${game.secret}`)
    }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
    <h1 class="sr-only">猜数字游戏</h1>

    <WelcomePanel v-if="current === 'welcome'" @next="go('mode')" />
    <ModePanel v-else-if="current === 'mode'" @start="handleStart" @settings="go('settings')"
        @history="go('history')" />
    <GamePanel v-else-if="current === 'game'" @back="go('mode')" @restart="startNewGame" @history="go('history')" />
    <HistoryPanel v-else-if="current === 'history'" @back="go('mode')" />
    <SettingsPanel v-else-if="current === 'settings'" @back="go('mode')" />
</template>