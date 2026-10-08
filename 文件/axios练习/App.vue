<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'

interface Todo {
    userId: number
    id: number
    title: string
    completed: boolean
}

const loading = ref(false)
const msg = ref<Todo[]>([])
const error = ref('')

const handleHttp = async () => {
    loading.value = true
    error.value = ''
    try {
        const res = await axios<Todo[]>({
            url: 'https://jsonplaceholder.typicode.com/todos'
        })
        msg.value = res.data
    } catch (err) {
        error.value = (err as Error).message
        msg.value = []
    } finally {
        loading.value = false
    }
}

</script>

<template>
    <button @click="handleHttp">读取</button>

    <p v-if="loading">加载中...</p>
    <p v-else-if="error" class="err">{{ error }}</p>
    <table v-else-if="msg.length > 0">
        <thead>
            <tr>
                <th v-for="(_, k) in msg[0]" :key="k">{{ k }}</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="m in msg" :key="m.id">
                <td v-for="(item, k) in m" :key="k">{{ item }}</td>
            </tr>
        </tbody>
    </table>
    <p v-else>暂无数据...</p>

</template>

<style scoped>
table {
    border-collapse: collapse;
    margin-top: 12px;
    width: 100%;
}

th,
td {
    border: 1px solid #d1d5db;
    padding: 6px 12px;
    text-align: left;
    font-size: 13px;
}

th {
    background: #f9fafb;
    font-weight: 600;
}

.err {
    color: #dc2626;
}
</style>