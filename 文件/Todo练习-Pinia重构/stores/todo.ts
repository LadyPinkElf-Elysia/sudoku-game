import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

export interface Todo {
    id: number
    text: string
    done: boolean
}

export type Todos = Todo[]

const STORAGE_KEY = 'todos'

const genId = (): number => Date.now() + Math.floor(Math.random() * 1000)

const createTodo = (todoText: string): Todo => ({ id: genId(), text: todoText, done: false })

const createDefault = (): Todo[] => {
    const defaultTexts: string[] = ['HTML5', 'CSS3', 'JavaScript', 'Vue3']
    return defaultTexts.map((todoText: string) => createTodo(todoText))
}

const load = (): Todos => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefault()
    try {
        return JSON.parse(raw)
    } catch {
        return []
    }
}

export const useTodoStore = defineStore('todo', () => {
    const todos = ref<Todos>(load())
    const hideCompleted = ref<boolean>(true)
    const editingId = ref<number | null>(null)

    watch(
        todos,
        (val: Todos): void => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
        },
        {
            deep: true
        }
    )

    const visibleTodos = computed(() =>
        hideCompleted.value ? todos.value.filter((t: Todo) => !t.done) : todos.value
    )

    const findTodoById = (todoId: number): Todo | undefined => todos.value.find((t: Todo) => t.id === todoId)

    const addTodo = (todoText: string): void => {
        const trimText = todoText.trim()
        if (!trimText) return
        todos.value.push(createTodo(trimText))
    }

    const removeTodo = (todoId: number): void => {
        todos.value = todos.value.filter((t: Todo) => t.id !== todoId)
    }

    const toggleTodo = (todoId: number): void => {
        const t = findTodoById(todoId)
        if (t) t.done = !t.done
    }

    const startEditTodo = (todoId: number): void => {
        editingId.value = todoId
    }

    const cancelEditTodo = (): void => {
        editingId.value = null
    }

    const updateTodo = (todoId: number, todoText: string): void => {
        const t = findTodoById(todoId)
        if (t) {
            const trimText = todoText.trim()
            if (trimText) t.text = trimText
        }
        editingId.value = null
    }

    const toggleFilter = (): void => {
        hideCompleted.value = !hideCompleted.value
    }


    return {
        todos, hideCompleted, editingId,
        visibleTodos,
        addTodo, removeTodo, toggleTodo, updateTodo,
        startEditTodo, cancelEditTodo,
        toggleFilter
    }

})