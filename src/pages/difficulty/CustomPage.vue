<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Flex from '@/components/Flex.vue';
import FormField from '@/components/FormField.vue';
import Overlay from '@/components/Overlay.vue';
import TextAction from '@/components/TextAction.vue';
import { ACTION, ACTION_OF as actionOf } from '@/constants/actions';
import { AUTH_COPY, CUSTOM_COPY } from '@/constants/copy';
import { CUSTOM_TEXT_MAX, GAME_ORIGIN, TITLE_MAX } from '@/constants/game';
import { PAGE } from '@/constants/pages';
import { VISIBILITY } from '@/constants/puzzle';
import { countBlanks, isBlankBoard } from '@/core/board/ops';
import { blankRatioErrorOf, errorTextOf } from '@/core/message';
import { boardToStr, parsePuzzle } from '@/core/sudoku/parse';
import { getSudoku } from '@/core/sudoku/rules';
import { cellCountOf, sideOf } from '@/core/sudoku/shape';
import { create } from '@/services/api/puzzleApi';
import { useGameStore } from '@/stores/game';
import { usePuzzleStore } from '@/stores/puzzle';
import { useUserStore } from '@/stores/user';
import type { Actions } from '@/types/item';

/**
 * 自定义开局流程（**只有这一页用 → 就地写**）：两串 → 校验（顺序见 FR-4）
 * → 可选提交到我的题目 → 开局并跳游戏页；规则一律来自 core；提交默认 visibility=private（决策 7）
 */
const router = useRouter();
const gameStore = useGameStore();
const puzzleStore = usePuzzleStore();
const userStore = useUserStore();

const puzzleText = ref('');
const solutionText = ref('');
const saveToMine = ref(false);
const title = ref('');
const error = ref('');
const loading = ref(false);

/** 只解析一次，校验与开局复用 */
const puzzleParsed = computed(() => parsePuzzle(puzzleText.value));
const solutionParsed = computed(() => parsePuzzle(solutionText.value));

/** 输入提示行：字符数 [+ 识别出的尺寸] */
const sizeTextOf = (boxSize: number): string => `${sideOf(boxSize)}×${sideOf(boxSize)}`;
const puzzleInfo = computed<string>(() => {
    const p = puzzleParsed.value;
    return `${puzzleText.value.length} 字符${p ? ` · 识别为 ${sizeTextOf(p.boxSize)}` : ''}`;
});
const solutionInfo = computed<string>(() => {
    const s = solutionParsed.value;
    return `${solutionText.value.length} 字符${s ? ` · 识别为 ${sizeTextOf(s.boxSize)}` : ''}`;
});

const isGuest = computed<boolean>(() => userStore.isGuest);

const fail = (msg: string): boolean => { error.value = msg; return false };

/** 校验顺序（失败不跳页） */
const validate = (): boolean => {
    if (!puzzleText.value.trim() || !solutionText.value.trim()) return fail(CUSTOM_COPY.empty);

    const p = puzzleParsed.value;
    if (!p) return fail(CUSTOM_COPY.badPuzzle);

    const s = solutionParsed.value;
    if (!s) return fail(CUSTOM_COPY.badSolution);

    if (p.boxSize !== s.boxSize) return fail(CUSTOM_COPY.sizeMismatch);
    if (isBlankBoard(p.board)) return fail(CUSTOM_COPY.puzzleBlank);
    if (getSudoku(p.boxSize).hasEmptyGroup(p.board)) return fail(CUSTOM_COPY.emptyGroup);
    if (!getSudoku(p.boxSize).validatePuzzle(p.board, s.board)) return fail(CUSTOM_COPY.notMatched);
    return true;
};

/** 提交到我的题目：标题必填 + 40%~65% + POST(private) */
const save = async (): Promise<boolean> => {
    const p = puzzleParsed.value;
    const s = solutionParsed.value;
    if (!p || !s) return false;

    if (!title.value.trim() || title.value.trim().length > TITLE_MAX) return fail(CUSTOM_COPY.needTitle);

    const bad = blankRatioErrorOf(countBlanks(p.board), p.boxSize);
    if (bad) return fail(bad);

    await create({
        title: title.value.trim(),
        puzzleText: boardToStr(p.board),
        solutionText: boardToStr(s.board),
        visibility: VISIBILITY.Private,
    });
    return true;
};

/** 开始游戏：校验 →（可选）提交 → 开局 → /game */
const apply = async (): Promise<void> => {
    if (loading.value) return;
    error.value = '';

    if (!validate()) return;
    if (saveToMine.value && isGuest.value) { fail(CUSTOM_COPY.saveLabel + '需要登录'); return; }

    const p = puzzleParsed.value;
    const s = solutionParsed.value;
    if (!p || !s) return;

    loading.value = true;
    try {
        if (saveToMine.value) {
            if (!(await save())) return;
            puzzleStore.flashSaved(CUSTOM_COPY.saved);
        }
        gameStore.startGame(p.board, s.board, {
            boxSize: p.boxSize,
            blankRatio: countBlanks(p.board) / cellCountOf(p.boxSize),
        }, GAME_ORIGIN.Custom);
        await router.push({ name: PAGE.Game });
    } catch (err) {
        error.value = errorTextOf(err, '提交失败，请重试');
    } finally {
        loading.value = false;
    }
};

/** 回主页只走顶栏那一个入口，这里只留开局（生成中不给点击函数 → 纯文本） */
const actions = computed<Actions>(() => [
    actionOf(ACTION.startGame, loading.value ? undefined : apply),
]);
</script>

<template>
    <div class="custom-page">
        <h2 class="section-title">自定义</h2>

        <FormField v-model="puzzleText" class="field" vertical type="textarea" :label="CUSTOM_COPY.puzzleLabel"
            :hint="puzzleInfo" :maxlength="CUSTOM_TEXT_MAX" placeholder="0 0 3 0 …" />

        <FormField v-model="solutionText" class="field" vertical type="textarea" :label="CUSTOM_COPY.solutionLabel"
            :hint="solutionInfo" :maxlength="CUSTOM_TEXT_MAX" placeholder="1 2 3 4 …" />

        <label class="check" :title="isGuest ? AUTH_COPY.needLogin : ''">
            <input type="checkbox" v-model="saveToMine" :disabled="isGuest">
            {{ CUSTOM_COPY.saveLabel }}
        </label>

        <FormField v-if="saveToMine" v-model="title" class="field" vertical label="标题" :maxlength="TITLE_MAX"
            :placeholder="CUSTOM_COPY.titlePlaceholder" />

        <p v-if="error" class="form-error">{{ error }}</p>

        <Flex class="op-bar" :gap="12" justify="center" wrap>
            <TextAction v-for="a in actions" :key="a.key" :text="a.text" :on-click="a.onClick" />
        </Flex>

        <Overlay :show="loading" spinning :text="CUSTOM_COPY.validating" />
    </div>
</template>

<style scoped>
/* .field / .label / .input / .hint / .form-error / .section-title 来自全局样式；多行输入等宽在 FormField 里 */

.check {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 18px;
    font-size: 0.85rem;
    color: #374151;
    cursor: pointer;
}

.check input[disabled] {
    cursor: not-allowed;
}
</style>
