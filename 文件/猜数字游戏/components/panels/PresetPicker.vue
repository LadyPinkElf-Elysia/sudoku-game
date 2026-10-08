<script setup>
import {DIFFICULTY_PRESETS} from '../../config'

const props = defineProps({
    activeMode:{type:String,required:true}
})
const emit=defineEmits(['select'])
</script>

<template>
    <div class="preset-picker" role="group" aria-label="难度选择">
        <button v-for="(p,key) in DIFFICULTY_PRESETS" :key="key" :class="{active:activeMode===key}" @click="emit('select',key)">
            {{ p.label }} ({{ p.length }}位 {{ p.allowRepeat ? '可重复':'不可重复' }} {{ p.maxAttempts }}次)
        </button>
    </div>
</template>