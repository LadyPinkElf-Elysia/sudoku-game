<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';

/**
 * 布局件（全站唯一一个）：只管「一行 / 一列」的方向、间距与对齐，
 * 省掉各组件里那堆 `display:flex; gap; align-items` 的 scoped 样式。
 * 特殊尺寸（`flex: 1` / 固定宽）仍由调用方挂一个 class 自己补。
 */
const props = withDefaults(defineProps<{
    /** 方向 */
    direction?: 'row' | 'column'
    /** 间距（px） */
    gap?: number
    /** 交叉轴对齐（⚠️ 默认 center，与 CSS flex 的 stretch 不同：竖排列表要撑满得显式传 stretch） */
    align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
    /** 主轴对齐 */
    justify?: 'start' | 'center' | 'end' | 'between'
    /** 放不下就换行 */
    wrap?: boolean
}>(), { direction: 'row', gap: 8, align: 'center', justify: 'start', wrap: false })

const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', baseline: 'baseline', stretch: 'stretch' } as const
const JUSTIFY = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' } as const

const style = computed<CSSProperties>(() => ({
    flexDirection: props.direction === 'column' ? 'column' : 'row',
    gap: `${props.gap}px`,
    alignItems: ALIGN[props.align],
    justifyContent: JUSTIFY[props.justify],
    flexWrap: props.wrap ? 'wrap' : 'nowrap',
}))
</script>

<template>
    <div class="flex" :style="style">
        <slot />
    </div>
</template>

<style scoped>
.flex {
    display: flex;
}
</style>
