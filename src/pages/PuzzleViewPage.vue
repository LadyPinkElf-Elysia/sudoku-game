<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BoardView from '@/components/BoardView.vue'
import Flex from '@/components/Flex.vue'
import TextAction from '@/components/TextAction.vue'
import { PAGE } from '@/constants/pages'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
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

const actions = computed<Actions>(() => [
    actionOf(ACTION.back, goBack),
    actionOf(ACTION.challenge, () => { void challenge() }),
])

onMounted(() => { void load(String(route.params.pid ?? '')) })
</script>

<template>
    <div class="page-card wide">
        <!-- .state 来自全局 styles/form.css -->
        <p v-if="loading" class="state">加载中…</p>
        <p v-else-if="error" class="state is-error">{{ error }}</p>

        <template v-else>
            <h2 class="section-title">{{ title }}</h2>
            <p class="meta-line">{{ metaText }}</p>
            <BoardView :board="boardInput.board" :box-size="boardInput.boxSize" :interactive="false" />
            <Flex class="op-bar" :gap="14" justify="center" wrap>
                <TextAction v-for="a in actions" :key="a.key" :text="a.text" :on-click="a.onClick" />
            </Flex>
        </template>
    </div>
</template>

<style scoped>
/* .section-title / .state / .meta-line / .action-* 等来自全局；元信息行文本由 metaTextOf 拼好 */
</style>
