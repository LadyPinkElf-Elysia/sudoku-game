<script setup>
import { ref, reactive } from 'vue'
import BasePanel from '../ui/BasePanel.vue'
import RulesSection from '../ui/RulesSection.vue'
import ScoreBreakdown from '../ui/ScoreBreakdown.vue'
import PresetPicker from './PresetPicker.vue'
import CustomRulesForm from './CustomRulesForm.vue'
import { game, selectPreset, setCustomRules, startNewGame } from '../../composables/useGame'
import { settings } from '../../composables/useSettings'

const emit = defineEmits(['start', 'settings', 'history'])

const isCustom = ref(false)

const customRules = reactive({
    length:      4,
    allowRepeat: false,
    purpleMode:  false,
    maxAttempts: 10,
})

function pickPreset(key) {
    isCustom.value = false
    selectPreset(key)
}

function pickCustom() {
    isCustom.value = true
    setCustomRules(customRules)
}

function onCustomRulesUpdate(rules) {
    Object.assign(customRules, rules)
    setCustomRules(rules)
}

function begin() {
    if (isCustom.value) setCustomRules(customRules)
    startNewGame()
    emit('start')
}
</script>

<template>
    <BasePanel>
        <template #heading>妖精的小游戏♪</template>

        <div class="row" role="group" aria-label="模式选择">
            <button
                :class="{ active: !isCustom }"
                @click="pickPreset('easy')"
            >
                经典模式
            </button>
            <button
                :class="{ active: isCustom }"
                @click="pickCustom"
            >
                自定义
            </button>
        </div>

        <PresetPicker
            v-if="!isCustom"
            :active-mode="game.mode"
            @select="pickPreset"
        />

        <CustomRulesForm
            v-else
            :model-value="customRules"
            @update:model-value="onCustomRulesUpdate"
        />

        <RulesSection
            :rules="game.rules"
            :dynamic-count="settings.dynamicCount"
        />

        <ScoreBreakdown />

        <template #footer>
            <button class="btn-secondary" @click="emit('settings')">设置</button>
            <button class="btn-primary" @click="begin">开始游戏</button>
            <button class="btn-secondary" @click="emit('history')">查看战绩</button>
        </template>
    </BasePanel>
</template>