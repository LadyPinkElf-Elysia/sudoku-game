/** 随机源：由调用方注入（生产传 Math.random，测试传种子随机） */
export type Rng = () => number
