'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Megaphone, ShieldCheck, 
  Mail, Settings, BarChart3, ChevronRight,
  ChevronLeft, ChevronDown, Zap, LifeBuoy,
  Headphones, Search, LogOut, ChevronsUpDown,
  User, List, Keyboard, PanelLeftClose, PanelLeft, MoreVertical,
  Sun, Moon
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const TOP_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

const ACCORDION_NAV = [
  {
    id: 'workspace',
    label: 'Workspace',
    icon: Megaphone,
    items: [
      { href: '/campaigns', label: 'Campaigns' },
      { href: '/applications', label: 'Applications' },
      { href: '/milestones', label: 'Milestones' },
      { href: '/reviews', label: 'Reviews' },
      { href: '/payments', label: 'Payments' },
      { href: '/data-exports', label: 'Data Exports' },
    ]
  },
  {
    id: 'people',
    label: 'People & Trust',
    icon: Users,
    items: [
      { href: '/users', label: 'Users' },
      { href: '/verification', label: 'Verification' },
      { href: '/warnings', label: 'Warnings' },
      { href: '/login-history', label: 'Login History' },
      { href: '/deletions', label: 'Deletions' },
    ]
  },
  {
    id: 'moderation',
    label: 'Moderation',
    icon: ShieldCheck,
    items: [
      { href: '/rooms', label: 'Chat Rooms' },
      { href: '/moderation-queue', label: 'Mod Queue' },
      { href: '/reports', label: 'Reports' },
      { href: '/disputes', label: 'Disputes' },
    ]
  },
  {
    id: 'growth',
    label: 'Growth',
    icon: Zap,
    items: [
      { href: '/promo-pages', label: 'Promo Pages' },
      { href: '/onboarding', label: 'Onboarding' },
      { href: '/search-insights', label: 'Search Insights' },
      { href: '/ai-chats', label: 'AI Chats' },
    ]
  },
  {
    id: 'support',
    label: 'Support',
    icon: LifeBuoy,
    items: [
      { href: '/support-tickets', label: 'Support Tickets' },
      { href: '/feedback', label: 'Feedback' },
      { href: '/help-articles', label: 'Help Articles' },
    ]
  },
  {
    id: 'comms',
    label: 'Comms',
    icon: Mail,
    items: [
      { href: '/emails', label: 'Broadcast Email' },
      { href: '/notifications', label: 'Notifications' },
      { href: '/user-emails', label: 'User Emails' },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    items: [
      { href: '/platform-config', label: 'Platform Config' },
      { href: '/feature-flags', label: 'Feature Flags' },
      { href: '/email-templates', label: 'Email Templates' },
      { href: '/audit-logs', label: 'Audit Logs' },
      { href: '/user-logs', label: 'User Logs' },
      { href: '/settings', label: 'General Settings' },
    ]
  }
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  
  // By default, open 'workspace'. 
  const [openGroup, setOpenGroup] = useState<string | null>('workspace')
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', authUser.id).single()
        setUser({
          email: authUser.email || '',
          name: profile?.display_name || 'Administrator'
        })
      }
    }
    fetchUser()
  }, [])

  // Basic theme toggle effect
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme')
    } else {
      document.body.classList.remove('light-theme')
    }
  }, [theme])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const toggleGroup = (id: string) => {
    if (collapsed) {
      onToggle()
      setOpenGroup(id)
      return
    }
    setOpenGroup(prev => prev === id ? null : id)
  }

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-left">
          <div className="sidebar-logo-icon">P</div>
          <span className="sidebar-logo-text">Administrator</span>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <div 
          className="sidebar-search-inner"
          onClick={() => {
            if (collapsed) onToggle()
          }}
        >
          <Search />
          <span className="sidebar-search-text">Search</span>
          <span className="sidebar-search-shortcut">⌘K</span>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar-nav">
        {TOP_NAV.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${active ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
              onClick={() => {
                if (collapsed) onToggle()
                if (mobileOpen) setMobileOpen(false)
              }}
            >
              <item.icon />
              <span className="sidebar-item-label">{item.label}</span>
            </Link>
          )
        })}

        <div style={{ height: 12 }} /> {/* spacer */}

        {ACCORDION_NAV.map(group => {
          const isActive = group.items.some(i => pathname.startsWith(i.href))
          return (
            <div 
              key={group.id} 
              style={{ position: 'relative' }}
              onMouseEnter={() => collapsed && setHoveredGroup(group.id)}
              onMouseLeave={() => collapsed && setHoveredGroup(null)}
            >
              <button 
                onClick={() => toggleGroup(group.id)} 
                className={`sidebar-item ${isActive && collapsed ? 'active' : ''}`}
                style={{ color: isActive && !collapsed ? 'var(--sidebar-text-active)' : undefined }}
              >
                <group.icon />
                <span className="sidebar-item-label">{group.label}</span>
                {!collapsed && (
                  <ChevronDown 
                    style={{ 
                      marginLeft: 'auto', 
                      width: 14, 
                      height: 14, 
                      transition: 'transform 0.2s',
                      transform: openGroup === group.id ? 'rotate(180deg)' : 'none' 
                    }} 
                  />
                )}
              </button>
              
              {/* Expanded Submenu */}
              {!collapsed && openGroup === group.id && (
                <div className="sidebar-submenu">
                  {group.items.map(item => (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      className={`sidebar-subitem ${pathname.startsWith(item.href) ? 'active' : ''}`}
                      onClick={() => { if (mobileOpen) setMobileOpen(false) }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}

              {/* Popover Submenu (Hover when collapsed) */}
              {collapsed && hoveredGroup === group.id && (
                <div className="sidebar-popover">
                  <div className="sidebar-popover-title">{group.label}</div>
                  {group.items.map(item => (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      className="sidebar-popover-item"
                      onClick={() => { if (mobileOpen) setMobileOpen(false) }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

       {/* Account area */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ 
          padding: '0 12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'space-between',
          marginBottom: '12px'
        }}>
          {!collapsed && (
            <div className="theme-toggle-pill">
              <button 
                className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={16} />
              </button>
              <button 
                className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={16} />
              </button>
            </div>
          )}
          <button
            className="sidebar-collapse-btn"
            onClick={onToggle}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <PanelLeft /> : <PanelLeftClose />}
          </button>
        </div>

        {/* Bottom Profile Section */}
        <div className="sidebar-profile-wrapper">
          <button 
            className="sidebar-profile-btn" 
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          >
            <div className="sidebar-avatar">
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=random`} 
                alt="Avatar" 
              />
            </div>
            {!collapsed && (
              <>
                <div className="sidebar-profile-info">
                  <span className="sidebar-profile-name">{user?.name || 'Loading...'}</span>
                  <span className="sidebar-profile-email">{user?.email || ''}</span>
                </div>
                <MoreVertical className="sidebar-profile-chevron" style={{ width: 16, height: 16 }} />
              </>
            )}
          </button>

          {profileMenuOpen && (
            <div className="sidebar-profile-menu">
              <div className="sidebar-profile-menu-header">
                <div className="sidebar-avatar">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=random`} 
                    alt="Avatar" 
                  />
                </div>
                <div className="sidebar-profile-info">
                  <span className="sidebar-profile-name">{user?.name || 'Loading...'}</span>
                  <span className="sidebar-profile-email">{user?.email || ''}</span>
                </div>
              </div>
              <div className="sidebar-profile-menu-links">
                <button className="sidebar-profile-menu-item logout" onClick={handleLogout}>
                  <LogOut /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
