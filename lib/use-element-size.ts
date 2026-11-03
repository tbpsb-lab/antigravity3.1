'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const observerRef = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!node) return

    const rect = node.getBoundingClientRect()
    const initW = Math.round(rect.width)
    const initH = Math.round(rect.height)
    setSize((prev) => (prev.width === initW && prev.height === initH ? prev : { width: initW, height: initH }))

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const width = Math.round(
        entry.borderBoxSize?.[0]?.inlineSize ?? entry.target.getBoundingClientRect().width,
      )
      const height = Math.round(
        entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height,
      )
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
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

  return [ref, size] as const
}

