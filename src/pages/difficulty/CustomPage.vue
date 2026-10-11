<script setup lang="ts">
import Flex from '@/components/Flex.vue';
import FormField from '@/components/FormField.vue';
import Overlay from '@/components/Overlay.vue';
import TextAction from '@/components/TextAction.vue';
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
        <h2 class="section-title">自定义</h2>

        <FormField v-model="puzzleText" class="field" vertical type="textarea" :label="CUSTOM_COPY.puzzleLabel"
            :hint="puzzleInfo" :maxlength="CUSTOM_TEXT_MAX" placeholder="0 0 3 0 …" />

        <FormField v-model="solutionText" class="field" vertical type="textarea" :label="CUSTOM_COPY.solutionLabel"
            :hint="solutionInfo" :maxlength="CUSTOM_TEXT_MAX" placeholder="1 2 3 4 …" />

        <label class="check" :title="isGuest ? AUTH_COPY.needLogin : ''">
            <input type="checkbox" v-model="saveToMine" :disabled="isGuest">
            {{ CUSTOM_COPY.saveLabel }}
        </label>

        <FormField v-if="saveToMine" v-model="title" class="field" vertical label="标题" :maxlength="TITLE_MAX"
            :placeholder="CUSTOM_COPY.titlePlaceholder" />

        <p v-if="error" class="form-error">{{ error }}</p>

        <Flex class="op-bar" :gap="12" justify="center" wrap>
            <TextAction v-for="a in actions" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>

        <Overlay :show="loading" spinning :text="CUSTOM_COPY.validating" />
    </div>
</template>

<style scoped>
/* .field / .label / .input / .hint / .form-error / .section-title 来自全局样式；多行输入等宽在 FormField 里 */

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
