<script setup lang="ts">
import { useRouter } from 'vue-router';

const router=useRouter()

const toPage=(name:string)=>{
    router.push({name:name})
    //to能怎么写push就可以怎么写，push可以追加历史记录，replace会替换历史记录
}

</script>

<template>
    关于
    <button @click="toPage('news')">切换新闻</button>
    <button @click="toPage('home')">切换首页</button>
    <button @click="toPage('detail')">切换新闻详细</button>
</template>