<script setup>
defineProps({
    rules:        { type: Object,  required: true },
    dynamicCount: { type: Boolean, default: false },
})
</script>

<template>
    <section class="rules-section" aria-label="游戏规则">
        <h3>游戏规则</h3>

        <ol>
            <li>
                随机生成 <b>{{ rules.length }}</b> 位密码
                （{{ rules.allowRepeat ? '可重复' : '不可重复' }}）
            </li>
            <li><span class="green">绿色</span>：数字存在且位置正确</li>
            <li><span class="red">红色</span>：数字不存在</li>

            <li v-if="!rules.purpleMode">
                <span class="yellow">黄色</span>：数字存在但位置不对
            </li>

            <template v-else>
                <li>
                    <span class="yellow">黄色</span>：数字存在，答案在当前位置<b>左侧</b>
                </li>
                <li>
                    <span class="purple">紫色</span>：数字存在，答案在当前位置<b>右侧</b>
                </li>
            </template>
        </ol>

        <aside v-if="dynamicCount" class="dynamic-hint">
            <b>动态统计</b>：绿色数字会消耗答案中的对应数字。<br>
            例：猜 <code>1110</code>，答案 <code>1001</code>：
            <br>
            动态：
            <span class="green">1</span>
            <span class="yellow">1</span>
            <span class="red">1</span>
            <span class="yellow">0</span>
            <br>
            非动态：
            <span class="green">1</span>
            <span class="yellow">1</span>
            <span class="yellow">1</span>
            <span class="yellow">0</span>
        </aside>
    </section>
</template>