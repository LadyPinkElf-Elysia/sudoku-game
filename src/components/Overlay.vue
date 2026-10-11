<script setup lang="ts">
import Flex from './Flex.vue'
import TextAction from './TextAction.vue'
import type { Actions } from '@/types/item'

/**
 * 遮罩（全站唯一一个）：**传数据 → 自己决定画什么**
 * · text / desc —— 文案（不传就不占位）
 * · shade        —— 要不要背景遮蔽（半透明 + 模糊）；false = 只当浮层框
 * · spinning     —— 要不要转圈（加载中）
 * · actions      —— 按钮条（可点击文本，居中一排）
 * · 默认插槽      —— 还要显示什么就放进来（如只读棋盘 BoardView）
 */
withDefaults(defineProps<{
    show: boolean
    /** 主文案 */
    text?: string
    /** 次要说明 */
    desc?: string
    /** 是否遮蔽背景 */
    shade?: boolean
    /** 是否转圈 */
    spinning?: boolean
    /** 按钮条（有才渲染） */
    actions?: Actions
}>(), { text: '', desc: '', shade: true, spinning: false })
</script>

<template>
    <Teleport to="body">
        <Transition name="overlay-fade">
            <div v-if="show" class="overlay" :class="{ 'is-plain': !shade }">
                <div class="overlay-box">
                    <div v-if="spinning" class="spinner"></div>
                    <p v-if="text" class="overlay-title">{{ text }}</p>
                    <p v-if="desc" class="overlay-desc">{{ desc }}</p>

                    <slot />

                    <Flex v-if="actions?.length" class="overlay-actions" :gap="14" justify="center" wrap>
                        <TextAction v-for="a in actions" :key="a.key" :text="a.text"
                            :on-click="a.onClick" />
                    </Flex>
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

/* shade=false：不遮背景，只留一个浮层框 */
.overlay.is-plain {
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
}

/* 按钮条与上方内容、与棋盘之间留白 */
.overlay-actions {
    margin-top: 14px;
}

/* 转圈（原 SpinnerIcon 一并收进来：一个组件够用就别再拆一个） */
.spinner {
    width: 44px;
    height: 44px;
    margin: 0 auto;
    border-radius: 50%;
    border: 4px solid #e5e7eb;
    border-top-color: #6366f1;
    animation: overlay-spin 0.8s linear infinite;
}

@keyframes overlay-spin {
    to {
        transform: rotate(360deg);
    }
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
    opacity: 0;
}
</style>