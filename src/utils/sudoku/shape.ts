/** 宫边长 B → 盘面边长 S */
export const sideOf = (boxSize: number): number => boxSize * boxSize

/** 盘面总格数 S * S */
export const cellCountOf = (boxSize: number): number => sideOf(boxSize) ** 2

/** 挖空格数 = floor(总格数 × 比例) */
export const blankCountOf = (boxSize: number, ratio: number): number =>
    Math.floor(cellCountOf(boxSize) * ratio)
