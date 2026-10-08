export function generateSecret(length, allowRepeat) {
    const pool = '0123456789'.split('')

    if (!allowRepeat) {
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const temp = pool[i]
            pool[i] = pool[j]
            pool[j] = temp
        }
        return pool.slice(0, length).join('')
    }

    let result = ''
    for (let i = 0; i < length; i++) {
        result += pool[Math.floor(Math.random() * 10)]
    }
    return result
}

export function compareGuess(input, secret, purpleMode, dynamicCount) {
    const guess = [...input]
    const answer = [...secret]
    const n = guess.length
    const colors = new Array(n).fill('red')
    const consumed = new Array(n).fill(false)

    // 第一轮：位置正确 → 绿
    for (let i = 0; i < n; i++) {
        if (guess[i] === answer[i]) {
            colors[i] = 'green'
            consumed[i] = true
        }
    }

    // 第二轮：黄 / 紫 / 红
    for (let i = 0; i < n; i++) {
        if (colors[i] === 'green') continue

        let matchedIndex = -1
        for (let j = 0; j < n; j++) {
            if (!consumed[j] && answer[j] === guess[i]) {
                matchedIndex = j
                break
            }
        }
        if (matchedIndex === -1) continue

        if (dynamicCount) consumed[matchedIndex] = true

        if (purpleMode) {
            colors[i] = matchedIndex > i ? 'purple' : 'yellow'
        } else {
            colors[i] = 'yellow'
        }
    }

    return colors
}