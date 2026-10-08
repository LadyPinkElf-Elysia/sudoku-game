<script setup lang="ts">
    const items=[
        {label:'首页',name:'home'},
        {label:'新闻',name:'news'},
        {label:'关于',name:'about'},
    ]
</script>

<template>
    <h2>vue路由练习</h2>
    <nav>
        <RouterLink v-for="item in items" :to="{name:item.name}">{{ item.label }}</RouterLink>
    </nav>
    <main>
        <RouterView />
    </main>
    
</template>

<style scoped>

</style>