<script setup>
import BasePanel from '../ui/BasePanel.vue'
import { settings } from '../../composables/useSettings'
import { FONT_FAMILIES } from '../../config'

const emit = defineEmits(['back'])
</script>

<template>
    <BasePanel>
        <template #heading>设置</template>

        <form class="settings-form" @submit.prevent>
            <fieldset>
                <legend>字体大小</legend>
                <input
                    type="range"
                    min="12" max="24" step="1"
                    v-model.number="settings.fontSize"
                    aria-label="字体大小"
                >
                <span>{{ settings.fontSize }}px</span>
            </fieldset>

            <fieldset>
                <legend>字体</legend>
                <select v-model="settings.fontFamily" aria-label="字体">
                    <option v-for="(_, key) in FONT_FAMILIES" :key="key" :value="key">
                        {{ key }}
                    </option>
                </select>
            </fieldset>

            <fieldset>
                <legend>颜色判定机制</legend>
                <label>
                    <input type="checkbox" v-model="settings.dynamicCount">
                    动态统计（更精准地处理重复数字）
                </label>
            </fieldset>
        </form>

        <template #footer>
            <button class="btn-secondary" @click="emit('back')">返回</button>
        </template>
    </BasePanel>
</template>