'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { Bell, Search, Menu, Smartphone, FileText, RefreshCcw, Moon } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="admin-shell">
      {/* Mobile Menu Toggle Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="sidebar-overlay"
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        {/* Page content */}
        <main>{children}</main>
      </div>
    </div>
  )
}
