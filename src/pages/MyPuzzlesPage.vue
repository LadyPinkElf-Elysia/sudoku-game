<script setup lang="ts">
import { computed } from 'vue'
import BoardView from '@/components/BoardView.vue'
import Flex from '@/components/Flex.vue'
import ListSection from '@/components/ListSection.vue'
import MyPuzzleRow from '@/components/MyPuzzleRow.vue'
import Overlay from '@/components/Overlay.vue'
import RenameText from '@/components/RenameText.vue'
import SecretValue from '@/components/SecretValue.vue'
import TextAction from '@/components/TextAction.vue'
import { ACTION, actionOf } from '@/constants/actions'
import { MINE_COPY, PAGER_MODE_OPTIONS, SORT_OPTIONS } from '@/constants/puzzle'
import { AUTH_COPY, UNAME_MAX } from '@/constants/user'
import { useAccountPanel } from '@/composables/auth/useAccountPanel'
import { useMyPuzzles } from '@/composables/puzzle/useMyPuzzles'
import type { Actions, ListBar, ListPager } from '@/types/item'
import type { ListSort } from '@/types/puzzle'

const {
    items, loading, error, pageCount, busy,
    sort, page, pagerMode, changePagerMode, changeSort, changePage, retry,
    controlsFor, goCreate,
    previewOpen, previewTitle, previewInput, previewActions, previewZoomActions,
    removeOpen, removeActions,
} = useMyPuzzles()

/** 账号区（FR-1 / FR-12）：退出在名字左边、名字右边就地重命名、uid 遮蔽 + 👁/📋 */
const {
    uname, loadUid,
    renaming, renameText, renameError, startRename, onRenameInput, commitRename, cancelRename,
    logout,
} = useAccountPanel()

/** 账号区一行里的「退出」（放最右） */
const logoutItems = computed<Actions>(() => [
    actionOf(ACTION.logout, () => { void logout() }),
])

/** 列表工具条 + 分页：组件只认数据，标签/选项由本页给 */
const listBar = computed<ListBar>(() => ({
    modeLabel: '浏览方式', modeOptions: PAGER_MODE_OPTIONS, mode: pagerMode.value,
    sortLabel: '排序', sortOptions: SORT_OPTIONS, sort: sort.value,
}))
const listPager = computed<ListPager>(() => ({ page: page.value, pageCount: pageCount.value, mode: pagerMode.value }))
</script>

<template>
    <div class="page-card wide">
        <!-- 账号区（FR-1 / FR-12）：一行「👤 显示名 · 重命名 · 退出」；点「重命名」名字就地变输入框 -->
        <section class="account">
            <Flex class="account-row" align="center" justify="center" :gap="8" wrap>
                <RenameText class="account-rename" :text="uname" icon="👤" :renaming="renaming" :rename-text="renameText"
                    :maxlength="UNAME_MAX" :placeholder="AUTH_COPY.renamePlaceholder" :label="AUTH_COPY.rename"
                    @start="startRename" @input="onRenameInput" @commit="commitRename" @cancel="cancelRename" />

                <TextAction v-for="a in logoutItems" :key="a.key" :text="a.text" :on-click="a.onClick" />
            </Flex>

            <p v-if="renameError" class="hint">{{ renameError }}</p>

            <SecretValue :label="MINE_COPY.uidTag" :load="loadUid" />
        </section>

        <!-- 列表骨架（工具条 + 三态 + 列表 + 分页条）：条目渲染方式由本页选（私人列表 → MyPuzzleRow） -->
        <ListSection :items="items" :loading="loading" :error="error" :empty-text="MINE_COPY.empty"
            :key-of="(item) => item.rowId" :bar="listBar" :pager="listPager" @retry="retry"
            @change-mode="changePagerMode" @change-sort="(v) => changeSort(v as ListSort)" @change-page="changePage">
            <template #empty>
                <button class="go-create" type="button" @click="goCreate">{{ MINE_COPY.goCreate }}</button>
            </template>

            <template #item="{ item }">
                <MyPuzzleRow :item="item" :controls="controlsFor(item)" />
            </template>
        </ListSection>

        <!-- 题目预览 / 答案预览：同一个遮罩（只读棋盘 + 贴棋盘的缩放圆圈；按钮条由 Overlay 渲染） -->
        <Overlay :show="previewOpen" :text="previewTitle" :actions="previewActions">
            <BoardView v-bind="previewInput" :zoom-actions="previewZoomActions" />
        </Overlay>

        <!-- 删除：二次确认 -->
        <Overlay :show="removeOpen" :text="MINE_COPY.removeTitle" :desc="MINE_COPY.removeConfirm"
            :actions="removeActions" />

        <!-- PATCH / DELETE 进行中 -->
        <Overlay :show="busy" spinning />
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

/* 账号区：一行「👤 名字 · 重命名 · 退出」，下面是 uid */
.account-row {
    margin: 0;
}

/* 改名输入框的宽度（RenameText 的输入框宽度交给调用方） */
.account-rename {
    flex: 0 1 11rem;
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
    color: inherit;
    font-size: 0.85rem;
    font-family: inherit;
    cursor: pointer;
}
</style>
