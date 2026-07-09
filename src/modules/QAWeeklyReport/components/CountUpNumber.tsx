import React, { useState, useEffect } from 'react'

interface CountUpProps {
  end: number
  suffix?: string
  decimals?: number
}

export const CountUpNumber: React.FC<CountUpProps> = ({ end, suffix = '', decimals = 0 }) => {
  const [isPrinting, setIsPrinting] = useState(false)
  const [count, setCount] = useState(() => {
    const hasPlayed = typeof window !== 'undefined' && sessionStorage.getItem('qaly-dashboard-entrance-played') === 'true'
    return hasPlayed ? end : 0
  })

  useEffect(() => {
    const mediaQueryList = window.matchMedia('print')
    const handlePrintChange = (mql: MediaQueryListEvent | MediaQueryList) => {
      setIsPrinting(mql.matches)
    }

    // Modern browsers
    mediaQueryList.addEventListener('change', handlePrintChange)
    if (mediaQueryList.matches) {
      setIsPrinting(true)
    }

    const handleBeforePrint = () => setIsPrinting(true)
    const handleAfterPrint = () => setIsPrinting(false)
    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)

    return () => {
      mediaQueryList.removeEventListener('change', handlePrintChange)
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  useEffect(() => {
    if (isPrinting) {
      setCount(end)
      return
    }
    const hasPlayed = typeof window !== 'undefined' && sessionStorage.getItem('qaly-dashboard-entrance-played') === 'true'
    if (hasPlayed) {
      setCount(end)
      return
    }
    let startTimestamp: number | null = null
    const duration = 1000 // ms
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount(progress * end)
      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }
    window.requestAnimationFrame(step)
  }, [end, isPrinting])

  return <span>{isPrinting ? end.toFixed(decimals) : count.toFixed(decimals)}{suffix}</span>
}
