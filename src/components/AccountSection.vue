<script setup lang="ts">
import { computed } from 'vue'
import { User } from '@element-plus/icons-vue'
import ActionBar from './ActionBar.vue'
import Flex from './Flex.vue'
import RenameText from './RenameText.vue'
import SecretValue from './SecretValue.vue'
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions'
import { AUTH_COPY, MINE_COPY } from '@/constants/copy'
import { UNAME_MAX } from '@/constants/user'
import type { Actions } from '@/types/item'

/**
 * 「我的」页账号区（**纯展示**）：显示名（就地重命名）+ 退出 + uid 遮蔽/复制
 * · 数据与回调**全部由页面注入** —— 组件不认识 store、也不认识路由（R5）
 * · 「重命名」那套交互在 RenameText 里；uid 的遮蔽/复制在 SecretValue 里，这里只接线
 */
defineProps<{
    uname: string
    renaming: boolean
    renameText: string
    renameError: string
    /** uid 取值（点了 👁 / 📋 才调；登录凭据不默认外发） */
    loadUid: () => Promise<string | null>
}>()

const emit = defineEmits<{
    renameStart: []
    renameInput: [text: string]
    renameCommit: []
    renameCancel: []
    logout: []
}>()

const logoutItems = computed<Actions>(() => [
    actionOf(ACTION.logout, () => { emit('logout') }),
])
</script>

<template>
    <section class="account">
        <Flex class="account-row" align="center" justify="center" :gap="8" wrap>
            <RenameText class="account-rename" :text="uname" :icon="User" :renaming="renaming" :rename-text="renameText"
                :maxlength="UNAME_MAX" :placeholder="AUTH_COPY.renamePlaceholder" :label="AUTH_COPY.rename"
                @start="emit('renameStart')" @input="emit('renameInput', $event)"
                @commit="emit('renameCommit')" @cancel="emit('renameCancel')" />

            <ActionBar :actions="logoutItems" :gap="8" />
        </Flex>

        <p v-if="renameError" class="hint">{{ renameError }}</p>

        <SecretValue :label="MINE_COPY.uidTag" :load="loadUid" />
    </section>
</template>

<style scoped>
/* 账号区：显示名 + uid（默认遮蔽，点 👁 才明文） */
.account {
    margin-bottom: 14px;
    padding: 12px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #f9fafb;
    text-align: center;
}

/* 一行「👤 名字 · 重命名 · 退出」 */
.account-row {
    margin: 0;
}

/* 改名输入框的宽度（RenameText 的输入框宽度交给调用方） */
.account-rename {
    flex: 0 1 11rem;
}
</style>
