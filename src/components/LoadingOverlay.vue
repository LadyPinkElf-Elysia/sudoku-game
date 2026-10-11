<script setup lang="ts">
import Overlay from './Overlay.vue'
import SpinnerIcon from './SpinnerIcon.vue'

defineProps<{
    show: boolean
    /** 主文案（如「正在生成题目」）；不传只有转圈 */
    title?: string
    /** 次要说明 */
    desc?: string
}>()
</script>

<template>
    <Overlay :show="show">
        <SpinnerIcon />
        <p v-if="title" class="overlay-title">{{ title }}</p>
        <p v-if="desc" class="overlay-desc">{{ desc }}</p>
    </Overlay>
</template>
