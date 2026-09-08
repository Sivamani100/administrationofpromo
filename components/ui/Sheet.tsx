'use client'
import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  headerAction?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Width of sheet, default 440 */
  width?: number | string
  side?: 'right' | 'left'
}

export default function Sheet({
  open, onClose, title, subtitle, headerAction,
  children, footer, width = 440, side = 'right'
}: SheetProps) {
  // Keyboard close
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open && typeof window === 'undefined') return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`gsheet-overlay${open ? ' gsheet-overlay--open' : ''}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`gsheet${open ? ' gsheet--open' : ''}${side === 'left' ? ' gsheet--left' : ''}`}
        style={{ width, maxWidth: '100vw' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="gsheet-header">
          <div>
            {title && <div className="gsheet-title">{title}</div>}
            {subtitle && <div className="gsheet-subtitle">{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {headerAction}
            <button className="gsheet-close" onClick={onClose} aria-label="Close panel">
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="gsheet-body">{children}</div>

        {/* Footer */}
        {footer && <div className="gsheet-footer">{footer}</div>}
      </div>
    </>,
    document.body
  )
}
