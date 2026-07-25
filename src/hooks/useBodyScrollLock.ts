import { useEffect } from 'react'

/**
 * Reference-counted body scroll lock so nested / stacked modals don't unlock
 * the page until the last one closes. Preserves and restores scroll position
 * (including on iOS where `overflow: hidden` alone is unreliable).
 */
let lockCount = 0
let savedScrollY = 0

function applyLock() {
  savedScrollY = window.scrollY
  const body = document.body
  const html = document.documentElement
  body.style.position = 'fixed'
  body.style.top = `-${savedScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.style.overflow = 'hidden'
  html.style.overflow = 'hidden'
  html.classList.add('modal-scroll-locked')
}

function releaseLock() {
  const body = document.body
  const html = document.documentElement
  body.style.position = ''
  body.style.top = ''
  body.style.left = ''
  body.style.right = ''
  body.style.width = ''
  body.style.overflow = ''
  html.style.overflow = ''
  html.classList.remove('modal-scroll-locked')
  window.scrollTo(0, savedScrollY)
}

/**
 * Lock page scrolling while `locked` is true. Safe to call from many modals
 * at once — the background unlocks only after every active lock is released.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    if (lockCount === 0) applyLock()
    lockCount += 1

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) releaseLock()
    }
  }, [locked])
}
