'use client'
import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  icon?: ReactNode
  iconColor?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Prevent closing on overlay click */
  persistent?: boolean
  /** Show a destructive red header strip */
  destructive?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: 360,
  md: 520,
  lg: 680,
  xl: 860,
  full: '92vw'
}

export default function Modal({
  open, onClose, title, subtitle, icon, iconColor, children, footer,
  size = 'md', persistent = false, destructive = false, className
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // ESC to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !persistent) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, persistent])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="gmodal-overlay"
      onClick={(e) => { if (!persistent && e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        className={`gmodal${destructive ? ' gmodal--destructive' : ''} ${className || ''}`}
        style={{ width: '100%', maxWidth: typeof SIZE_MAP[size] === 'number' ? SIZE_MAP[size] : SIZE_MAP[size] }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || icon) && (
          <div className={`gmodal-header${destructive ? ' gmodal-header--destructive' : ''}`}>
            <div className="gmodal-header-left">
              {icon && (
                <div
                  className="gmodal-icon"
                  style={{ background: iconColor ? `${iconColor}20` : 'var(--bg-3)', color: iconColor || 'var(--text-2)' }}
                >
                  {icon}
                </div>
              )}
              <div>
                {title && <div className="gmodal-title">{title}</div>}
                {subtitle && <div className="gmodal-subtitle">{subtitle}</div>}
              </div>
            </div>
            <button className="gmodal-close" onClick={onClose} aria-label="Close">
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="gmodal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="gmodal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

/** Shortcut for confirmation dialogs */
export function ConfirmModal({
  open, onClose, onConfirm,
  title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  loading = false, destructive = false, icon
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  destructive?: boolean
  icon?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      iconColor={destructive ? '#ef4444' : undefined}
      size="sm"
      destructive={destructive}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`btn btn-sm ${destructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  )
}
