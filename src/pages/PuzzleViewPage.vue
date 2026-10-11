<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ActionItems from '@/components/ActionItems.vue'
import BoardView from '@/components/BoardView.vue'
import { PAGE } from '@/constants/pages'
import { SEARCH_COPY } from '@/constants/puzzle'
import { useZoom } from '@/composables/board/useZoom'
import { usePuzzleDetail } from '@/composables/puzzle/usePuzzleDetail'
import type { Actions } from '@/types/item'
import type { BoardRenderInput } from '@/types/render'

const route = useRoute()
const router = useRouter()
const { zoom, zoomActions } = useZoom()
const { loading, error, title, uname, sideS, blankCount, createdText, boardInput, load, challenge } = usePuzzleDetail()

/** 只读盘：与可玩盘同一份入参，只差 interactive=false 与 zoom */
const boardParams = computed<BoardRenderInput>(() => ({ ...boardInput.value, zoom: zoom.value, interactive: false }))

/** 返回来源靠历史；无历史兜底主页 */
const goBack = (): void => {
    if (window.history.length > 1) router.back()
    else void router.replace({ name: PAGE.Home })
}

const actions = computed<Actions>(() => [
    { key: 'back', icon: '←', message: '返回', onClick: goBack },
    { key: 'challenge', icon: '▶', message: SEARCH_COPY.challenge, onClick: () => { void challenge() } },
    ...zoomActions.value,
])

onMounted(() => { void load(String(route.params.pid ?? '')) })
</script>

<template>
    <div class="page-card wide">
        <p v-if="loading" class="state">加载中…</p>
        <p v-else-if="error" class="state is-error">{{ error }}</p>

        <template v-else>
            <h2 class="title">{{ title }}</h2>
            <p class="meta">{{ sideS }}×{{ sideS }} · 挖空 {{ blankCount }} 格 · {{ createdText }} · {{ uname }}</p>
            <BoardView v-bind="boardParams" />
            <ActionItems :items="actions" />
        </template>
    </div>
</template>

<style scoped>
.title {
    margin: 0;
    font-size: 1.05rem;
    color: #111827;
    word-break: break-all;
}

.meta {
    margin: 6px 0 12px;
    font-size: 0.78rem;
    color: #6b7280;
}

.state {
    margin: 16px 0;
    font-size: 0.85rem;
    color: #6b7280;
    text-align: center;
}

.state.is-error {
    color: #b91c1c;
}
</style>
