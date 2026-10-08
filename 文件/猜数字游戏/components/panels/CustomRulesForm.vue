<script setup>
import { reactive, watch } from 'vue';
import { BASE_SCORE_TABLE, MAX_ATTEMPT_BONUS_RATES } from '../../config';


const props=defineProps({
    modelValue:{type:Object,required:true}
})
const emit=defineEmits(['update:modelValue'])

const draft=reactive({...props.modelValue})

watch(draft,()=> emit('update:modelValue',{...draft}),{deep:true})
</script>

<template>
    <form class="custom-rules-form" @submit.prevent>
        <fieldset>
            <legend>数字位数</legend>
            <select v-model.number="draft.length">
                <option v-for="(_,k) in BASE_SCORE_TABLE" :key="k" value="Number(k)">
                    {{ k }}位
                </option>
            </select>
        </fieldset>

        <fieldset>
            <legend>规则选项</legend>
            <label>
                <input type="checkbox" v-model="draft.allowRepeat">
                允许数字重复
            </label>
            <label>
                <input type="checkbox" v-model="draft.purpleMode">
                启用紫色模式（提示数字左/右）
            </label>
        </fieldset>

        <fieldset>
            <legend>猜测次数</legend>
            <select v-model.number="draft.maxAttempts">
                <option v-for="(_,k) in MAX_ATTEMPT_BONUS_RATES" :key="k" value="Number(k)">
                    仅{{ k }}次
                </option>
            </select>
        </fieldset>
    </form>
</template>