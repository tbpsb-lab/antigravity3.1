'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useElementHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const nextHeight = Math.round(
        entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height,
      )
      setHeight((prev) => (prev === nextHeight ? prev : nextHeight))
    })
    observer.observe(node)
    observerRef.current = observer
  }, [])

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [])

  return [ref, height] as const
}
