'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null)

  useEffect(() => {
    if (!active) return
    const el = containerRef.current
    if (!el) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const getFocusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (node) =>
          !node.closest('[inert], [aria-hidden="true"]') &&
          node.offsetParent !== null,
      )

    // Otomatik odak: Varsa textarea/input, yoksa ilk odaklanabilir eleman
    const rafId = requestAnimationFrame(() => {
      const focusables = getFocusables()
      if (focusables.length > 0 && !el.contains(document.activeElement)) {
        focusables[0].focus()
      }
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = getFocusables()
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first || !el.contains(document.activeElement)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last || !el.contains(document.activeElement)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [active])

  return containerRef
}
