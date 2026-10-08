<script setup>
defineProps({
    index:{type:Number,required:true},
    value:{type:String,required:true},
    colors:{type:Array,required:true}
})
</script>

<template>
    <div class="guess-row">
        <slot name="prefix" :index="index">
            <span class="guess-prefix">第{{ index+1 }}次：</span>
        </slot>
        
        <template v-for="(digit,i) in value" :key="i">
            <slot name="digit" :digit="digit" :color="colors[i]">
                <span :class="colors[i]">{{ digit }}</span>
            </slot>
        </template>
    </div>
</template>