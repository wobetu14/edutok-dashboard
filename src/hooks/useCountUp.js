import { useEffect, useRef, useState } from 'react'

export function useCountUp(target, duration = 900) {
  const [count, setCount] = useState(0)
  const rafRef   = useRef(null)
  const prevRef  = useRef(null)

  useEffect(() => {
    if (target == null || isNaN(Number(target))) return
    const end = Number(target)

    cancelAnimationFrame(rafRef.current)
    const startVal = prevRef.current ?? 0
    prevRef.current = end

    if (end === startVal) return

    const startTime = performance.now()
    const range = end - startVal

    const tick = (now) => {
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(startVal + eased * range))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return count
}
