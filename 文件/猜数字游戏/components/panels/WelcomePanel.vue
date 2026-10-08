<script setup>
import BasePanel from '../ui/BasePanel.vue'
const emit=defineEmits(['next'])
</script>

<template>
    <BasePanel>
        <template #heading>
            爱莉希雅的魔法♪
        </template>

        <template #default>
            <p class="center">欢迎来到猜数字游戏</p>
        </template>

        <template #footer>
            <button class="btn-primary" @click="emit('next')">
                与爱莉共舞♪
            </button>
        </template>
    </BasePanel>
</template>