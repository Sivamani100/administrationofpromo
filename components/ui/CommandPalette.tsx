'use client'
import { useState, useRef, useEffect, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: ReactNode
  shortcut?: string
  group?: string
  onSelect: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  items: CommandItem[]
  placeholder?: string
}

export default function CommandPalette({ open, onClose, items, placeholder = 'Search commands…' }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter
  const filtered = query.trim()
    ? items.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        i.description?.toLowerCase().includes(query.toLowerCase())
      )
    : items

  // Group
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    const g = item.group || 'Actions'
    acc[g] = [...(acc[g] || []), item]
    return acc
  }, {})

  // Reset cursor on filter
  useEffect(() => { setCursor(0) }, [query])

  // Focus input when open
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery('') }
  }, [open])

  // Keyboard navigation
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter') {
      filtered[cursor]?.onSelect()
      onClose()
    }
    if (e.key === 'Escape') onClose()
  }, [filtered, cursor, onClose])

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  return createPortal(
    <div className="gcmd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gcmd-panel" onKeyDown={handleKey}>
        {/* Search Input */}
        <div className="gcmd-search">
          <Search size={16} className="gcmd-search-icon" />
          <input
            ref={inputRef}
            className="gcmd-input"
            placeholder={placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="gcmd-clear" onClick={() => setQuery('')}>
              <X size={12} />
            </button>
          )}
          <kbd className="gcmd-esc-badge">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="gcmd-list">
          {filtered.length === 0 ? (
            <div className="gcmd-empty">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            <div className="gcmd-group-items">
              {filtered.map((item) => {
                const idx = filtered.indexOf(item)
                const active = cursor === idx
                return (
                  <button
                    key={item.id}
                    data-idx={idx}
                    className={`gcmd-item${active ? ' gcmd-item--active' : ''}`}
                    onClick={() => { item.onSelect(); onClose() }}
                    onMouseEnter={() => setCursor(idx)}
                  >
                    <span className="gcmd-item-left">
                      {item.icon && <span className="gcmd-item-icon">{item.icon}</span>}
                      <span className="gcmd-item-label">{item.label}</span>
                      {item.description && <span className="gcmd-item-desc">{item.description}</span>}
                    </span>
                    {item.shortcut && <kbd className="gcmd-shortcut">{item.shortcut}</kbd>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gcmd-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>esc</kbd> Close</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
