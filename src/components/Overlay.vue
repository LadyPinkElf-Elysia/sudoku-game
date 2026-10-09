<script setup lang="ts">
defineProps<{
    /** 是否显示 */
    show: boolean
}>()
</script>

<template>
    <Teleport to="body">
        <Transition name="overlay-fade">
            <div v-if="show" class="overlay">
                <div class="overlay-box">
                    <slot />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    padding: 16px;
}

.overlay-box {
    background: #fff;
    border-radius: 16px;
    padding: 28px 24px;
    text-align: center;
    min-width: 220px;
    max-width: 320px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
    transition: opacity 0.2s;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
    opacity: 0;
}
</style>