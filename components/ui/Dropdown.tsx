'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight } from 'lucide-react'

export interface DropdownItem {
  id?: string
  label: string
  icon?: React.ReactNode
  shortcut?: string
  variant?: 'default' | 'danger' | 'success'
  disabled?: boolean
  checked?: boolean
  items?: DropdownItem[]   // submenu
  onClick?: () => void
  separator?: never
}

export type DropdownSeparator = { separator: true }
export type DropdownEntry = DropdownItem | DropdownSeparator

export interface DropdownProps {
  trigger: React.ReactElement
  items: DropdownEntry[]
  align?: 'left' | 'right' | 'center'
  side?: 'bottom' | 'top'
  minWidth?: number
  className?: string
}

function isSep(e: DropdownEntry): e is DropdownSeparator {
  return !!(e as any).separator
}

export default function Dropdown({
  trigger, items, align = 'left', side = 'bottom', minWidth = 180, className
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [submenuId, setSubmenuId] = useState<string | null>(null)
  const trigRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const recalc = useCallback(() => {
    if (!trigRef.current) return
    const rect = trigRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const menuW = menuRef.current?.offsetWidth || minWidth

    let top = side === 'bottom' ? rect.bottom + 6 : rect.top - 6
    let left = align === 'right'
      ? rect.right - menuW
      : align === 'center'
        ? rect.left + rect.width / 2 - menuW / 2
        : rect.left

    // Clamp to viewport
    if (left + menuW > vw - 8) left = vw - menuW - 8
    if (left < 8) left = 8

    setPos({ top, left })
  }, [align, side, minWidth])

  const toggle = useCallback(() => {
    if (!open) recalc()
    setOpen(o => !o)
    setSubmenuId(null)
  }, [open, recalc])

  // Close on outside click / scroll / resize
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | TouchEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        trigRef.current && !trigRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    const onScroll = () => { recalc() }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
      window.removeEventListener('resize', recalc)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, recalc])

  // Also recalc after open so menuRef has size
  useEffect(() => { if (open) recalc() }, [open, recalc])

  const menuTop = side === 'top'
    ? (trigRef.current ? trigRef.current.getBoundingClientRect().top - 6 : pos.top)
    : pos.top

  return (
    <>
      <div ref={trigRef} style={{ display: 'inline-flex' }} onClick={toggle} className={className}>
        {trigger}
      </div>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className={`gdd-menu${side === 'top' ? ' gdd-menu--top' : ''}`}
          style={{
            top: side === 'top' ? undefined : pos.top,
            bottom: side === 'top' ? window.innerHeight - (trigRef.current?.getBoundingClientRect().top ?? 0) + 6 : undefined,
            left: pos.left,
            minWidth
          }}
          onMouseLeave={() => setSubmenuId(null)}
        >
          {items.map((entry, i) => {
            if (isSep(entry)) return <div key={i} className="gdd-sep" />
            const item = entry as DropdownItem
            const hasSubmenu = item.items && item.items.length > 0
            return (
              <div key={i} style={{ position: 'relative' }}>
                <button
                  className={`gdd-item gdd-item--${item.variant || 'default'}${item.disabled ? ' gdd-item--disabled' : ''}`}
                  disabled={item.disabled}
                  onMouseEnter={() => hasSubmenu ? setSubmenuId(item.label) : setSubmenuId(null)}
                  onClick={() => {
                    if (item.disabled || hasSubmenu) return
                    item.onClick?.()
                    setOpen(false)
                  }}
                >
                  <span className="gdd-item-left">
                    {item.checked !== undefined && (
                      <span className="gdd-check-wrap">
                        {item.checked && <Check size={12} strokeWidth={3} />}
                      </span>
                    )}
                    {item.icon && <span className="gdd-icon">{item.icon}</span>}
                    <span className="gdd-label">{item.label}</span>
                  </span>
                  <span className="gdd-item-right">
                    {item.shortcut && <kbd className="gdd-kbd">{item.shortcut}</kbd>}
                    {hasSubmenu && <ChevronRight size={12} />}
                  </span>
                </button>

                {/* Submenu */}
                {hasSubmenu && submenuId === item.label && (
                  <div className="gdd-submenu">
                    {(item.items || []).map((sub, si) => (
                      isSep(sub as any) ? <div key={si} className="gdd-sep" /> :
                      <button
                        key={si}
                        className={`gdd-item gdd-item--${(sub as DropdownItem).variant || 'default'}`}
                        onClick={() => { (sub as DropdownItem).onClick?.(); setOpen(false) }}
                      >
                        <span className="gdd-item-left">
                          {(sub as DropdownItem).icon && <span className="gdd-icon">{(sub as DropdownItem).icon}</span>}
                          <span className="gdd-label">{(sub as DropdownItem).label}</span>
                        </span>
                        {(sub as DropdownItem).shortcut && <kbd className="gdd-kbd">{(sub as DropdownItem).shortcut}</kbd>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
