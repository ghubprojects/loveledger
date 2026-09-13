import { useCallback, useEffect, useRef, useState } from 'react'
import { createState, decodeState, STORAGE_KEY } from './game'
import type { GameState } from './game'

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return { state: raw ? decodeState(raw) : createState(), raw, error: '' }
  } catch {
    return { state: createState(), raw: null, error: 'Không đọc được dữ liệu đã lưu. Dữ liệu cũ được giữ nguyên; hãy kiểm tra quyền lưu trữ của trình duyệt rồi tải lại trang.' }
  }
}

export function useGame() {
  const [initial] = useState(readStorage)
  const [state, setState] = useState(initial.state)
  const [error, setError] = useState(initial.error)
  const lastRaw = useRef(initial.raw)

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.storageArea !== localStorage || (event.key !== STORAGE_KEY && event.key !== null)) return
      const latest = readStorage()
      if (latest.error) { setError(latest.error); return }
      lastRaw.current = latest.raw
      setState(latest.state)
      setError('Dữ liệu vừa được cập nhật ở tab khác. Hãy kiểm tra buổi chơi trước khi ghi tiếp.')
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const commit = useCallback((update: (current: GameState) => GameState) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw !== lastRaw.current || initial.error) {
        const latest = readStorage()
        if (latest.error) { setError(latest.error); return false }
        lastRaw.current = latest.raw
        setState(latest.state)
        setError('Dữ liệu đã thay đổi. Hãy kiểm tra lại và thực hiện thao tác một lần nữa.')
        return false
      }
      const next = update(state)
      const serialized = JSON.stringify(next)
      decodeState(serialized)
      localStorage.setItem(STORAGE_KEY, serialized)
      lastRaw.current = serialized
      setState(next)
      setError('')
      return true
    } catch {
      setError('Chưa lưu được thay đổi. Bộ nhớ có thể đã đầy hoặc bị chặn. Hãy giữ trang này mở và kiểm tra cài đặt trình duyệt.')
      return false
    }
  }, [initial.error, state])

  return { state, commit, error, clearError: () => setError('') }
}
