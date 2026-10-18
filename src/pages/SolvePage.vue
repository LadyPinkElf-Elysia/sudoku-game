<script setup lang="ts">
import { computed } from 'vue'
import BoardView from '@/components/BoardView.vue'
import Flex from '@/components/Flex.vue'
import FormField from '@/components/FormField.vue'
import NumberPad from '@/components/NumberPad.vue'
import Overlay from '@/components/Overlay.vue'
import PagerBar from '@/components/PagerBar.vue'
import TextAction from '@/components/TextAction.vue'
import { CUSTOM_TEXT_MAX } from '@/constants/game'
import { ACTION, actionOf } from '@/constants/actions'
import { SOLVE_COPY, SOLVE_INPUT_MODE, SOLVE_LIMIT_OPTIONS } from '@/constants/solve'
import { useSolveFlow } from '@/composables/solve/useSolveFlow'
import type { Actions } from '@/types/item'

const {
    inputMode, puzzleText, maxSolutions, boxSize, boxSizeOptions,
    solutions, solutionIndex, loading, error,
    boardInput, solutionInput, padMax, padColumns,
    resultInfo, pagerInfo, stepLabel,
    inputZoomActions, resultZoomActions,
    setInputMode, setBoxSize, clearBoard, applyText, solve, changeSolution, selectCell, inputNum,
} = useSolveFlow()

/** 输入方式 Tab（与难度页「系统生成 / 自定义」同一套视觉：.sub-nav / .sub-tab 走全局样式） */
const modeTabs = [
    { key: SOLVE_INPUT_MODE.Text, label: SOLVE_COPY.modeText },
    { key: SOLVE_INPUT_MODE.Board, label: SOLVE_COPY.modeBoard },
] as const

/**
 * 动作行（**一行两件**：题面工具在左、「求解」在右）
 * · 字符串模式：「⬇ 填入棋盘」（串为空时不给点击函数 → 纯文本，全站惯例）
 * · 棋盘模式：「🧹 清空棋盘」
 * · 求解中：「求解」不给点击函数 → 纯文本
 */
const actions = computed<Actions>(() => [
    ...(inputMode.value === SOLVE_INPUT_MODE.Text
        ? [actionOf(ACTION.fillBoard, puzzleText.value.trim() ? applyText : undefined)]
        : [actionOf(ACTION.clearBoard, clearBoard)]),
    actionOf(ACTION.solve, loading.value ? undefined : solve),
])
</script>

<template>
    <div class="page-card wide">
        <h2 class="section-title">{{ SOLVE_COPY.title }}</h2>

        <!-- 输入方式：与难度页的「系统生成 / 自定义」同一套 Tab 视觉 -->
        <Flex class="sub-nav" :gap="6">
            <button v-for="m in modeTabs" :key="m.key" type="button" class="sub-tab"
                :class="{ 'is-active': inputMode === m.key }" @click="setInputMode(m.key)">
                {{ m.label }}
            </button>
        </Flex>

        <template v-if="inputMode === SOLVE_INPUT_MODE.Text">
            <FormField v-model="puzzleText" class="field" vertical type="textarea"
                :label="SOLVE_COPY.puzzleLabel" :maxlength="CUSTOM_TEXT_MAX"
                :hint="`${puzzleText.length} 字符`" placeholder="0 0 3 0 …" />
            <p class="meta-line">「🧮 求解」会先解析这串题面；「⬇ 填入棋盘」= 解析后填进棋盘并切到棋盘模式（就在求解左边）</p>
        </template>

        <template v-else>
            <FormField class="field" vertical type="select" :label="SOLVE_COPY.boxSizeLabel"
                :options="boxSizeOptions" :model-value="boxSize"
                @update:model-value="(v) => setBoxSize(v as number)" />
            <p class="meta-line">点棋盘选格 → 用下方数字键填题面（X 清格）</p>
        </template>

        <!-- 棋盘只属于「棋盘填入」模式：两种输入方式互不干扰 -->
        <template v-if="inputMode === SOLVE_INPUT_MODE.Board">
            <BoardView v-bind="boardInput" :zoom-actions="inputZoomActions" @cell-click="selectCell" />
            <NumberPad :max="padMax" :columns="padColumns" @pick="inputNum" />
        </template>

        <FormField class="field" vertical type="select" :label="SOLVE_COPY.limitLabel"
            :options="SOLVE_LIMIT_OPTIONS" :model-value="maxSolutions"
            @update:model-value="(v) => (maxSolutions = v as number)" />

        <Flex class="op-bar" :gap="12" justify="center" wrap>
            <TextAction v-for="a in actions" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>
        <p v-if="error" class="form-error">{{ error }}</p>

        <template v-if="solutions.length">
            <p class="result-label">📖 {{ SOLVE_COPY.resultLabel }} · {{ resultInfo }}</p>
            <BoardView v-bind="solutionInput" :zoom-actions="resultZoomActions" />
            <PagerBar :page="solutionIndex" :page-count="solutions.length" mode="steps"
                :step-label="stepLabel" :info-text="pagerInfo" @change="changeSolution" />
        </template>

        <Overlay :show="loading" spinning :text="SOLVE_COPY.solving" />
    </div>
</template>

<style scoped>
/* 结果区标题：与游戏页历史记录同一规格（.meta-line 来自全局样式） */
.result-label {
    margin: 14px 0 6px;
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: 600;
    text-align: left;
}
</style>
