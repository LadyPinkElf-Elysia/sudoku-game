<script setup>
import { ref } from 'vue'
import BasePanel from '../ui/BasePanel.vue'
import GuessRow from '../ui/GuessRow.vue'
import { records, toggleLock, clearUnlocked } from '../../composables/useRecords'

const emit = defineEmits(['back'])
const expandedId = ref(null)

function toggleExpand(id) {
    expandedId.value = expandedId.value === id ? null : id
}

function handleClear() {
    if (confirm('确定清空未锁定的战绩？')) {
        clearUnlocked()
    }
}
</script>

<template>
    <BasePanel>
        <template #heading>最近战绩</template>

        <p v-if="!records.length" class="center muted">暂无战绩</p>

        <ul v-else class="record-list">
            <li v-for="(r, i) in records" :key="r.id" class="record-item">
                <div class="record">
                    <input
                        type="checkbox"
                        :checked="r.locked"
                        title="锁定（锁定后不会被清空）"
                        :aria-label="`锁定第 ${i + 1} 局`"
                        @change="toggleLock(r.id)"
                    >
                    <span class="record-info">
                        第 {{ i + 1 }} 局 ·
                        {{ r.rules.length }} 位 ·
                        {{ r.guesses.length }}/{{ r.rules.maxAttempts }} 次 ·
                        {{ r.score }} 分 ·
                        <b :class="r.status === 'won' ? 'green' : 'red'">
                            {{ r.status === 'won' ? '胜' : '负' }}
                        </b>
                    </span>
                    <button @click="toggleExpand(r.id)">
                        {{ expandedId === r.id ? '收起' : '回放' }}
                    </button>
                </div>

                <div v-if="expandedId === r.id" class="record-replay">
                    <ul v-if="r.usedHints.length" class="hint-list">
                        <li v-for="(h, hi) in r.usedHints" :key="hi">
                            ✨ 第 {{ h + 1 }} 位是：{{ r.secret[h] }}
                        </li>
                    </ul>
                    <ul class="guess-list">
                        <li v-for="(g, gi) in r.guesses" :key="gi">
                            <GuessRow :index="gi" :value="g.value" :colors="g.colors" />
                        </li>
                    </ul>
                </div>
            </li>
        </ul>

        <template #footer>
            <button class="btn-secondary" @click="emit('back')">返回</button>
            <button class="btn-secondary" @click="handleClear">清空未锁定</button>
        </template>
    </BasePanel>
</template>