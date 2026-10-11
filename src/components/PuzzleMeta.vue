<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    /** 盘面边长（9 / 16 …） */
    sideS: number
    /** 挖空格数 */
    blankCount: number
    /** 出题时间戳；缺（旧数据 / 旧后端未返回）→ 按「现在」显示 */
    createdAt: number
    /** 热度（缺 → 0） */
    playCount: number
}>()

/** 出题时间（本地时区、24 小时制、带分钟）；没记录就按「现在」 */
const createdText = computed<string>(() => new Date(props.createdAt || Date.now()).toLocaleString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}))
</script>

<template>
    <!-- 列表项的元信息行：搜索卡片与「我的题目」行**同一份**实现，改格式只改这里 -->
    <p class="puzzle-meta">
        盘面大小 {{ sideS }}×{{ sideS }} · 挖空 {{ blankCount }} 格 ·
        创建时间 {{ createdText }} · 热度 {{ playCount ?? 0 }}
    </p>
</template>

<style scoped>
.puzzle-meta {
    margin: 0;
    font-size: 0.78rem;
    color: #6b7280;
}
</style>
