<script setup lang="ts">
import ActionItems from '@/components/ActionItems.vue';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import { CUSTOM_COPY, CUSTOM_TEXT_MAX, TITLE_MAX } from '@/constants/game';
import { AUTH_COPY } from '@/constants/user';
import { useCustomFlow } from '@/composables/game/useCustomFlow';

const {
    puzzleText, solutionText, saveToMine, title, error, loading,
    puzzleInfo, solutionInfo, isGuest, actions,
} = useCustomFlow()
</script>

<template>
    <div class="custom-page">
        <h2 class="title">自定义</h2>

        <div class="field">
            <label class="label">{{ CUSTOM_COPY.puzzleLabel }}</label>
            <textarea class="input textarea" v-model="puzzleText" :maxlength="CUSTOM_TEXT_MAX" spellcheck="false"
                placeholder="0 0 3 0 …"></textarea>
            <p class="hint">{{ puzzleInfo }}</p>
        </div>

        <div class="field">
            <label class="label">{{ CUSTOM_COPY.solutionLabel }}</label>
            <textarea class="input textarea" v-model="solutionText" :maxlength="CUSTOM_TEXT_MAX" spellcheck="false"
                placeholder="1 2 3 4 …"></textarea>
            <p class="hint">{{ solutionInfo }}</p>
        </div>

        <label class="check" :title="isGuest ? AUTH_COPY.needLogin : ''">
            <input type="checkbox" v-model="saveToMine" :disabled="isGuest">
            {{ CUSTOM_COPY.saveLabel }}
        </label>

        <div v-if="saveToMine" class="field">
            <label class="label">标题</label>
            <input class="input" v-model="title" :maxlength="TITLE_MAX" :placeholder="CUSTOM_COPY.titlePlaceholder">
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <ActionItems :items="actions" />

        <LoadingOverlay :show="loading" :title="CUSTOM_COPY.validating" />
    </div>
</template>

<style scoped>
/* .field / .label / .input / .hint / .form-error 来自全局样式 */

.title {
    margin: 0 0 18px;
    font-size: 1.05rem;
    color: #111827;
}

/* 本页特有：多行输入的尺寸与等宽字体 */
.textarea {
    height: 96px;
    padding: 8px 10px;
    line-height: 1.5;
    font-family: ui-monospace, Menlo, monospace;
    resize: vertical;
}

.check {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 18px;
    font-size: 0.85rem;
    color: #374151;
    cursor: pointer;
}

.check input[disabled] {
    cursor: not-allowed;
}
</style>
