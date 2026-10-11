<script setup lang="ts">
import { computed, ref } from 'vue'
import ActionItems from '@/components/ActionItems.vue'
import BoardOverlay from '@/components/BoardOverlay.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import MyPuzzleRow from '@/components/MyPuzzleRow.vue'
import Overlay from '@/components/Overlay.vue'
import PagerBar from '@/components/PagerBar.vue'
import ValueIcons from '@/components/ValueIcons.vue'
import { TITLE_MAX } from '@/constants/game'
import { MINE_COPY, SORT_OPTIONS } from '@/constants/puzzle'
import { useClipboard } from '@/composables/useClipboard'
import { useMyPuzzles } from '@/composables/puzzle/useMyPuzzles'
import { useUserStore } from '@/stores/user'
import type { ListSort } from '@/types/puzzle'

const {
    items, loading, error, empty, pageCount, busy,
    sort, page, pagerMode, pagerModeLabel, togglePagerMode, changeSort, changePage, retry,
    pidTextOf, pidIconsOf, actionsFor, goCreate,
    previewOpen, previewTitle, previewInput, closePreview,
    renameOpen, renameText, renameActions,
    removeOpen, removeActions,
} = useMyPuzzles()

/** 账号区（FR-1 / FR-12）：uid 与 pid 同规则 —— 默认遮蔽，点 👁 显示 / 📋 复制（复制不显示在界面） */
const userStore = useUserStore()
const { copied: uidCopied, copy: copyUidText } = useClipboard()
const uidShown = ref(false)
const uname = computed<string>(() => userStore.uname)
const uidText = computed<string>(() => (uidShown.value ? userStore.uid : MINE_COPY.uidHidden))
/** 账号区：uid 右侧的裸图标组（👁 睁/闭 + 📋 复制） */
const uidIcons = computed(() => ({
    revealed: uidShown.value,
    eyeLabel: uidShown.value ? MINE_COPY.hideUid : MINE_COPY.showUid,
    copyIcon: uidCopied.value ? '✅' : '📋',
    copyLabel: uidCopied.value ? MINE_COPY.copied : MINE_COPY.copyUid,
    onToggle: () => { uidShown.value = !uidShown.value },
    onCopy: () => { void copyUidText(userStore.uid) },
}))
</script>

<template>
    <div class="page-card wide">
        <!-- 账号区（FR-1 / FR-12）：uid 与 pid 同规则 —— 默认遮蔽，右侧裸图标 👁 睁/闭 + 📋 复制 -->
        <section class="account">
            <p class="account-name">👤 {{ uname }}</p>
            <p class="account-uid">
                <span>{{ uidText }}</span>
                <ValueIcons v-bind="uidIcons" />
            </p>
        </section>

        <!-- 页头：左上「浏览方式」、右上「排序」 -->
        <div class="list-bar">
            <button class="mode-btn" type="button" @click="togglePagerMode">
                浏览方式：{{ pagerModeLabel }}
            </button>
            <label class="sort-box">
                排序
                <select class="select is-sm" :value="sort"
                    @change="changeSort(($event.target as HTMLSelectElement).value as ListSort)">
                    <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
            </label>
        </div>

        <!-- 三态：加载中 / 错误（可重试）/ 空态（去出题） -->
        <p v-if="loading" class="state">加载中…</p>
        <p v-else-if="error" class="state is-error">
            {{ error }}
            <button class="retry" type="button" @click="retry">重试</button>
        </p>
        <p v-else-if="empty" class="state">
            {{ MINE_COPY.empty }}
            <button class="go-create" type="button" @click="goCreate">{{ MINE_COPY.goCreate }}</button>
        </p>

        <ul v-else class="list">
            <li v-for="item in items" :key="item.rowId">
                <MyPuzzleRow :item="item" :pid-text="pidTextOf(item)" :pid-icons="pidIconsOf(item)" :actions="actionsFor(item)" />
            </li>
        </ul>

        <PagerBar :page="page" :page-count="pageCount" :mode="pagerMode" @change="changePage" />

        <!-- 题目预览 / 答案预览：同一块只读遮罩 -->
        <BoardOverlay :show="previewOpen" :input="previewInput" :title="previewTitle" close-text="返回"
            @close="closePreview" />

        <!-- 重命名（小弹层） -->
        <Overlay :show="renameOpen">
            <p class="overlay-title">{{ MINE_COPY.rename }}</p>
            <input class="input rename-input" v-model="renameText" :maxlength="TITLE_MAX"
                :placeholder="MINE_COPY.renamePlaceholder">
            <ActionItems :items="renameActions" />
        </Overlay>

        <!-- 删除：二次确认 -->
        <Overlay :show="removeOpen">
            <p class="overlay-title">{{ MINE_COPY.removeTitle }}</p>
            <p class="overlay-desc">{{ MINE_COPY.removeConfirm }}</p>
            <ActionItems :items="removeActions" />
        </Overlay>

        <!-- PATCH / DELETE 进行中 -->
        <LoadingOverlay :show="busy" />
    </div>
</template>

<style scoped>
/* .list-bar / .mode-btn / .sort-box / .state / .retry / .list / .input / .overlay-* 都在全局 */

/* 账号区：显示名 + uid（默认遮蔽，点 👁 才明文） */
.account {
    margin-bottom: 14px;
    padding: 12px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #f9fafb;
    text-align: center;
}

.account-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
}

.account-uid {
    margin: 6px 0 0;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 0.8rem;
    color: #4b5563;
    word-break: break-all;
}

.rename-input {
    margin: 10px 0 4px;
}

.go-create {
    margin-left: 6px;
    border: none;
    background: none;
    color: #4f46e5;
    font-size: 0.85rem;
    font-family: inherit;
    cursor: pointer;
}

.go-create:hover {
    text-decoration: underline;
}
</style>
