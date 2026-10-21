<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElResult, ElSkeleton } from 'element-plus'
import ActionBar from '@/components/ActionBar.vue'
import BoardView from '@/components/BoardView.vue'
import { PAGE } from '@/constants/pages'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
import { LOADING_COPY } from '@/constants/copy'
import { usePuzzleDetail } from '@/composables/puzzle/usePuzzleDetail'
import type { Actions } from '@/types/item'
const route = useRoute()
const router = useRouter()
const { loading, error, title, metaText, boardInput, load, challenge } = usePuzzleDetail()

/** 只读盘：数据从详情来，**只给两个字段**（渲染入参不外露成中间对象） */

/** 返回来源靠历史；无历史兜底主页 */
const goBack = (): void => {
    if (window.history.length > 1) router.back()
    else void router.replace({ name: PAGE.Home })
}

/** 「挑战」要上报热度 + 跳页（网络动作）→ 打全屏遮罩，避免像卡住 */
const challenging = ref(false)
const startChallenge = async (): Promise<void> => {
    if (challenging.value) return
    challenging.value = true
    try {
        await challenge()
    } finally {
        challenging.value = false
    }
}

const actions = computed<Actions>(() => [
    actionOf(ACTION.back, goBack),
    actionOf(ACTION.challenge, () => { void startChallenge() }),
])

onMounted(() => { void load(String(route.params.pid ?? '')) })
</script>

<template>
    <div class="page-card wide" v-loading.fullscreen.lock="challenging" :element-loading-text="LOADING_COPY.game">
        <!-- 三态交给 EP：骨架屏 / 错误结果页 -->
        <el-skeleton v-if="loading" :rows="3" animated />
        <el-result v-else-if="error" icon="error" :sub-title="error" />

        <template v-else>
            <h2 class="section-title">{{ title }}</h2>
            <p class="meta-line">{{ metaText }}</p>
            <BoardView :board="boardInput.board" :box-size="boardInput.boxSize" :interactive="false" />
            <ActionBar class="op-bar" :actions="actions" :gap="14" wrap />
        </template>
    </div>
</template>

<style scoped>
/* .section-title / .state / .meta-line / .action-* 等来自全局；元信息行文本由 metaTextOf 拼好 */
</style>
