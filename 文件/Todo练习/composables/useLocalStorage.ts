import { ref, watch, type Ref } from "vue";

export const useLocalStorage = <T>(key: string, defaultValue: T): Ref<T> => {
    const read = (): T => {
        const raw = localStorage.getItem(key)
        const val = structuredClone(defaultValue)
        if (!raw) return val
        try {
            return JSON.parse(raw)
        } catch {
            return val
        }
    }

    const data = ref(read()) as Ref<T>

    watch(
        data,
        (val: T): void => {
            localStorage.setItem(key, JSON.stringify(val))
        },
        { deep: true }
    )

    return data

}