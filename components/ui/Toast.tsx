'use client'
import { useEffect, useRef, useState, ReactNode, createContext, useContext, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  description?: string
  variant: ToastVariant
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, 'id'>) => void
  success: (message: string, description?: string) => void
  error: (message: string, description?: string) => void
  warning: (message: string, description?: string) => void
  info: (message: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const ICONS: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error:   <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info size={16} />,
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [removing, setRemoving] = useState(false)

  const dismiss = useCallback(() => {
    setRemoving(true)
    setTimeout(onDismiss, 320)
  }, [onDismiss])

  useEffect(() => {
    const t = setTimeout(dismiss, toast.duration ?? 4500)
    return () => clearTimeout(t)
  }, [dismiss, toast.duration])

  return (
    <div className={`gtoast gtoast--${toast.variant}${removing ? ' gtoast--out' : ''}`}>
      <span className="gtoast-icon">{ICONS[toast.variant]}</span>
      <div className="gtoast-body">
        <div className="gtoast-message">{toast.message}</div>
        {toast.description && <div className="gtoast-desc">{toast.description}</div>}
        {toast.action && (
          <button className="gtoast-action" onClick={() => { toast.action!.onClick(); dismiss() }}>
            {toast.action.label}
          </button>
        )}
      </div>
      <button className="gtoast-close" onClick={dismiss} aria-label="Dismiss">
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(ts => [...ts.slice(-4), { ...opts, id }]) // Max 5
  }, [])

  const ctx: ToastContextValue = {
    toast,
    success: (m, d) => toast({ variant: 'success', message: m, description: d }),
    error:   (m, d) => toast({ variant: 'error',   message: m, description: d }),
    warning: (m, d) => toast({ variant: 'warning', message: m, description: d }),
    info:    (m, d) => toast({ variant: 'info',    message: m, description: d }),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {typeof window !== 'undefined' && createPortal(
        <div className="gtoast-stack" aria-live="polite">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
