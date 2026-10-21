<script setup lang="ts">
import { computed } from "vue";
import { ElButton, ElIcon } from "element-plus";
import { Close } from "@element-plus/icons-vue";

const props = defineProps<{
    max: number
    columns: number
}>()

const emit = defineEmits<{
    pick: [n: number]
}>()

/** 布局是纯样式，数据全部来自 props */
const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`,
}))

</script>

<template>
    <div class="num-pad-wrapper">
        <div class="num-grid" :style="gridStyle">
            <el-button v-for="n in max" :key="n" class="num-btn" circle title="单击填入数字"
                @click="emit('pick', n)">
                {{ n }}
            </el-button>
        </div>
        <el-button class="num-btn clear-btn" circle title="清除当前格数字" @click="emit('pick', 0)">
            <el-icon><Close /></el-icon>
        </el-button>
    </div>

</template>

<style scoped>
.num-pad-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin: 10px 0;
}

.num-grid {
    display: grid;
    gap: 4px;
    width: fit-content;
    margin: 0 auto;
}

/* el-button + el-button 默认有 12px 左边距，网格里必须清掉 */
.num-grid :deep(.el-button + .el-button) {
    margin-left: 0;
}

/* 圆形数字键：尺寸与圆角交给 el-button（--el-button-size），这里只调颜色 */
.num-btn {
    --el-button-size: 32px;
    margin: 0;
    font-size: 0.8rem;
    color: #374151;
    border-color: #d1d5db;
}

.num-btn:hover {
    color: #6366f1;
    border-color: #6366f1;
    background: #eef2ff;
}

.num-btn.clear-btn {
    font-size: 1rem;
}
</style>