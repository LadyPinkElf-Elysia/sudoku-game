<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import ActionItems from '@/components/ActionItems.vue'
import BoardOverlay from '@/components/BoardOverlay.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import MyPuzzleRow from '@/components/MyPuzzleRow.vue'
import Overlay from '@/components/Overlay.vue'
import PagerBar from '@/components/PagerBar.vue'
import ValueIcons from '@/components/ValueIcons.vue'
import { MINE_COPY, PAGER_MODE_OPTIONS, SORT_OPTIONS } from '@/constants/puzzle'
import { AUTH_COPY, UNAME_MAX } from '@/constants/user'
import { useAccountPanel } from '@/composables/auth/useAccountPanel'
import { useMyPuzzles } from '@/composables/puzzle/useMyPuzzles'
import type { ListSort } from '@/types/puzzle'

const {
    items, loading, error, empty, pageCount, busy,
    sort, page, pagerMode, changePagerMode, changeSort, changePage, retry,
    pidTextOf, pidIconsOf, controlsFor, goCreate,
    previewOpen, previewTitle, previewInput, closePreview,
    removeOpen, removeActions,
} = useMyPuzzles()

/** 账号区（FR-1 / FR-12）：退出在名字左边、名字右边就地重命名、uid 遮蔽 + 👁/📋 */
const {
    uname, uidText, uidIcons,
    renaming, renameText, renameError, startRename, onRenameInput, commitRename, cancelRename,
    logout,
} = useAccountPanel()

/** 进入改名时自动聚焦输入框 */
const nameBox = ref<HTMLInputElement | null>(null)
watch(renaming, async (on) => {
    if (!on) return
    await nextTick()
    nameBox.value?.focus()
})
</script>

<template>
    <div class="page-card wide">
        <!-- 账号区（FR-1 / FR-12）：退出在名字左边；名字右边「重命名」点了就地变输入框 -->
        <section class="account">
            <p class="account-row">
                <button class="text-btn" type="button" @click="logout">{{ AUTH_COPY.logout }}</button>

                <input v-if="renaming" ref="nameBox" class="input account-rename" :value="renameText"
                    :maxlength="UNAME_MAX" :placeholder="AUTH_COPY.renamePlaceholder"
                    @input="onRenameInput(($event.target as HTMLInputElement).value)"
                    @keyup.enter="commitRename()" @keyup.esc="cancelRename()" @blur="commitRename()">
                <template v-else>
                    <span class="account-name">👤 {{ uname }}</span>
                    <button class="text-btn" type="button" @click="startRename">{{ AUTH_COPY.rename }}</button>
                </template>
            </p>

            <p v-if="renameError" class="hint">{{ renameError }}</p>

            <p class="account-uid">
                <span>{{ uidText }}</span>
                <ValueIcons v-bind="uidIcons" />
            </p>
        </section>

        <!-- 页头：左上「浏览方式」、右上「排序」 -->
        <div class="list-bar">
            <label class="sort-box">
                浏览方式
                <select class="select is-sm" :value="pagerMode"
                    @change="changePagerMode(($event.target as HTMLSelectElement).value)">
                    <option v-for="opt in PAGER_MODE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
            </label>
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
                <MyPuzzleRow :item="item" :pid-text="pidTextOf(item)" :pid-icons="pidIconsOf(item)" :controls="controlsFor(item)" />
            </li>
        </ul>

        <PagerBar :page="page" :page-count="pageCount" :mode="pagerMode" @change="changePage" />

        <!-- 题目预览 / 答案预览：同一块只读遮罩 -->
        <BoardOverlay :show="previewOpen" :input="previewInput" :title="previewTitle" close-text="返回"
            @close="closePreview" />

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
/* .list-bar / .sort-box / .select(.is-sm) / .state / .retry / .list / .input / .overlay-* 都在全局 */

/* 账号区：显示名 + uid（默认遮蔽，点 👁 才明文） */
.account {
    margin-bottom: 14px;
    padding: 12px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #f9fafb;
    text-align: center;
}

/* 账号区：一行「退出 · 名字 · 重命名」，下面是 uid */
.account-row {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
}

.account-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
}

/* 账号区的文字操作比列表行略大一点 */
.account-row .text-btn {
    font-size: 0.85rem;
}

.account-rename {
    flex: 0 1 11rem;
    height: 30px;
    font-size: 0.9rem;
}

.account-uid {
    margin: 6px 0 0;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 0.8rem;
    color: #4b5563;
    word-break: break-all;
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
