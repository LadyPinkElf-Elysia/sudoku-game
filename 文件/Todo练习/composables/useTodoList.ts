import type { Ref } from "vue"
import type { Todo, Todos } from "../types/TodoType"
import { useLocalStorage } from "./useLocalStorage"

const STORAGE_KEY: string = 'todos'

const genId = (): number => Date.now() + Math.floor(Math.random() * 1000)

const createTodo = (todoText: string): Todo => ({
    id: genId(),
    text: todoText,
    done: false,
    editing: false
})

const createDefaultTodos = (): Todos => [
    { id: genId(), text: 'HTML5', done: true, editing: false },
    { id: genId(), text: 'CSS3', done: true, editing: false },
    { id: genId(), text: 'JavaScript', done: false, editing: false },
    { id: genId(), text: 'Vue3', done: false, editing: false }
]

export interface UseTodoListReturn {
    todos: Ref<Todos>
    addTodo: (todoText: string) => void
    removeTodo: (todoId: number) => void
    toggleTodo: (todoId: number) => void
    editTodo: (todoId: number) => void
    updateTodo: (todoId: number, todoText: string) => void
}

export const useTodoList = (): UseTodoListReturn => {
    const todos = useLocalStorage(STORAGE_KEY, createDefaultTodos())

    const findById = (todoId: number): Todo | undefined => todos.value.find(t => t.id === todoId)

    const addTodo = (todoText: string): void => {
        const trimText = todoText.trim()
        if (!trimText) return
        todos.value.push(createTodo(trimText))
    }

    const removeTodo = (todoId: number): void => {
        todos.value = todos.value.filter(t => t.id !== todoId)
    }

    const toggleTodo = (todoId: number): void => {
        const t = findById(todoId)
        if (t) t.done = !t.done
    }

    const editTodo = (todoId: number): void => {
        const t = findById(todoId)
        if (t) t.editing = true
    }

    const updateTodo = (todoId: number, todoText: string): void => {
        const t = findById(todoId)
        if (!t) return
        const trimText = todoText.trim()
        if (trimText) t.text = trimText
        t.editing = false
    }

    return {
        todos,
        addTodo,
        removeTodo,
        toggleTodo,
        editTodo,
        updateTodo
    }
}