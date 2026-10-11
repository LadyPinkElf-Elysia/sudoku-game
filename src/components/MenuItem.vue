<script setup lang="ts">
import { AUTH_COPY } from '@/constants/user';
import type { Menu } from '@/types/item';

defineProps<{
    item: Menu
}>()

const emit = defineEmits<{ blocked: [] }>()
</script>

<template>
    <!-- 正常态：可导航 -->
    <RouterLink v-if="!item.disabled" :to="{ name: item.routeName }" class="menu-btn">
        <span v-if="item.icon" class="icon">{{ item.icon }}</span>
        <span class="message">{{ item.message }}</span>
    </RouterLink>

    <!--
      灰显态：不渲染 RouterLink。
      RouterLink 把 onClick:navigate 绑在内部 <a> 上，父级 @click 只是「透传属性」；
      Vue 合并监听器时 navigate 排在前面（mergeProps：existing 先于 incoming），
      所以它的 guardEvent 检查 e.defaultPrevented 时我们的 preventDefault 还没执行 → 拦不住导航。
      这里改用 button，物理上无法导航。
    -->
    <button v-else type="button" class="menu-btn is-disabled" aria-disabled="true"
        :title="AUTH_COPY.needLogin" @click="emit('blocked')">
        <span v-if="item.icon" class="icon">{{ item.icon }}</span>
        <span class="message">{{ item.message }}</span>
    </button>
</template>

<style scoped>
.menu-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 48px;
    padding: 0 18px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    background: #fff;
    color: #374151;
    font-size: 0.95rem;
    font-weight: 500;
    font-family: inherit;      /* button 默认字体与标题不同，抹平 */
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: 0.15s;
    box-sizing: border-box;
}

.menu-btn:hover {
    background: #eef2ff;
    border-color: #6366f1;
}

/* 灰显：不导航，只冒泡 blocked（视觉对齐 AppLayout 的 .nav-item.is-disabled） */
.menu-btn.is-disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.menu-btn.is-disabled:hover {
    background: #fff;
    border-color: #d1d5db;
}

.icon {
    width: 22px;
    text-align: center;
    font-size: 1.05rem;
    flex-shrink: 0;
}

.message {
    flex: 1;
}
</style>
