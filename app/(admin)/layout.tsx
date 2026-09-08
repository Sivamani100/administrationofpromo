'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'
import CommandPalette from '@/components/ui/CommandPalette'
import { Menu, LayoutDashboard, Users, Megaphone, ShieldCheck, BarChart3, Settings, Zap, LifeBuoy, Mail, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const router = useRouter()

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(o => !o)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const cmdItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15}/>, group: 'Navigation', shortcut: '⌘1', onSelect: () => router.push('/dashboard') },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={15}/>, group: 'Navigation', onSelect: () => router.push('/analytics') },
    { id: 'users', label: 'Users', icon: <Users size={15}/>, group: 'People & Trust', onSelect: () => router.push('/users') },
    { id: 'verification', label: 'Verification', icon: <ShieldCheck size={15}/>, group: 'People & Trust', onSelect: () => router.push('/verification') },
    { id: 'campaigns', label: 'Campaigns', icon: <Megaphone size={15}/>, group: 'Workspace', onSelect: () => router.push('/campaigns') },
    { id: 'applications', label: 'Applications', icon: <Megaphone size={15}/>, group: 'Workspace', onSelect: () => router.push('/applications') },
    { id: 'rooms', label: 'Chat Rooms', icon: <MessageSquare size={15}/>, group: 'Moderation', onSelect: () => router.push('/rooms') },
    { id: 'disputes', label: 'Disputes', icon: <ShieldCheck size={15}/>, group: 'Moderation', onSelect: () => router.push('/disputes') },
    { id: 'support', label: 'Support Tickets', icon: <LifeBuoy size={15}/>, group: 'Support', onSelect: () => router.push('/support-tickets') },
    { id: 'emails', label: 'Broadcast Email', icon: <Mail size={15}/>, group: 'Comms', onSelect: () => router.push('/emails') },
    { id: 'settings', label: 'Settings', icon: <Settings size={15}/>, group: 'Settings', shortcut: '⌘,', onSelect: () => router.push('/settings') },
    { id: 'feature-flags', label: 'Feature Flags', icon: <Zap size={15}/>, group: 'Settings', onSelect: () => router.push('/feature-flags') },
  ]

  return (
    <div className="admin-shell">
      {/* Mobile Menu Toggle Button */}
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="sidebar-overlay" />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onSearchClick={() => setCmdOpen(true)}
      />

      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <main>{children}</main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={cmdItems}
        placeholder="Search pages and actions…"
      />
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  )
}
