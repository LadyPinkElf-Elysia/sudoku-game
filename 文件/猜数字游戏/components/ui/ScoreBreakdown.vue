<script setup>
import { scoreInfo } from '../../composables/useGame'
</script>

<template>
    <dl class="score-breakdown">
        <div class="score-row">
            <dt>基础分</dt>
            <dd>{{ scoreInfo.base }}</dd>
        </div>
        <div v-if="scoreInfo.noPurple > 0" class="score-row">
            <dt>无紫色加成</dt>
            <dd>+{{ scoreInfo.noPurple }}</dd>
        </div>
        <div v-if="scoreInfo.lowAttempt > 0" class="score-row">
            <dt>低次数加成</dt>
            <dd>+{{ scoreInfo.lowAttempt }}</dd>
        </div>
        <div class="score-row score-final">
            <dt>最终分</dt>
            <dd>{{ scoreInfo.final }}</dd>
        </div>
    </dl>
</template>