'use client'
import { useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface TooltipProps {
  children: React.ReactElement
  content: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  disabled?: boolean
}

export default function Tooltip({ children, content, side = 'top', delay = 400, disabled }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const trigRef = useRef<HTMLElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback(() => {
    if (disabled) return
    timerRef.current = setTimeout(() => {
      if (!trigRef.current) return
      const r = trigRef.current.getBoundingClientRect()
      const GAP = 8
      let top = 0, left = 0
      if (side === 'top')    { top = r.top - GAP;        left = r.left + r.width / 2 }
      if (side === 'bottom') { top = r.bottom + GAP;     left = r.left + r.width / 2 }
      if (side === 'left')   { top = r.top + r.height/2; left = r.left - GAP }
      if (side === 'right')  { top = r.top + r.height/2; left = r.right + GAP }
      setPos({ top, left })
      setVisible(true)
    }, delay)
  }, [side, delay, disabled])

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  if (!content || disabled) return children

  const child = children as any
  return (
    <>
      <child.type
        {...child.props}
        ref={trigRef}
        onMouseEnter={(e: any) => { child.props.onMouseEnter?.(e); show() }}
        onMouseLeave={(e: any) => { child.props.onMouseLeave?.(e); hide() }}
        onFocus={(e: any)  => { child.props.onFocus?.(e);  show() }}
        onBlur={(e: any)   => { child.props.onBlur?.(e);   hide() }}
      />
      {visible && typeof window !== 'undefined' && createPortal(
        <div
          className={`gtooltip gtooltip--${side}`}
          style={{ top: pos.top, left: pos.left }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}
