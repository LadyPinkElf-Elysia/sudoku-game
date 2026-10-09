# 数独（Vue 3 + TypeScript + Vite）

多宫尺寸数独游戏：支持 3/4/5/6 宫边长（盘面 9×9 ~ 36×36），含难度选择、游戏、出题三大流程。

## 技术栈
Vue 3 `<script setup>` · TypeScript · Vite · Pinia · Vue Router · Canvas 渲染 · Web Worker 生成

## 命令
    pnpm dev        # 开发
    pnpm build      # 类型检查 + 打包
    pnpm typecheck  # 只跑类型检查
    pnpm test       # 单元测试（vitest）
    pnpm format     # prettier 格式化

## 目录
    src/
      components/   纯展示组件
      composables/  跨页面复用的组合式逻辑
      constants/    常量与默认配置
      pages/        路由页面
      router/       路由表
      stores/       Pinia：game（棋局）、canvas（渲染）
      styles/       全局样式（卡片 / 表单 / 令牌 / 滚动条）
      types/        类型定义
      utils/
        grid.ts     二维网格工具
        render/     canvas 渲染
        sudoku/     数独引擎 / 生成算法 / Worker / 文本解析

## 约定
- `boxSize` = 宫边长 B，盘面边长 S = B²
- `Board`（`{v, lock}` 单元格）与 `NumBoard`（纯数字）由 `toNum` / `fromPuzzle` 互转
