'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Ban, CheckCircle, Eye, AlertTriangle, Users, Briefcase, UserCircle2, XOctagon, UserX } from 'lucide-react'

import { banUser, unbanUser, verifyUser } from '@/app/actions/admin'

type User = {
  id: string
  display_name: string
  role: string
  account_status: string
  is_verified: boolean
  created_at: string
  avatar_url?: string
}

const PAGE_SIZE = 15

export default function UsersPage() {
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all') // all, brand, influencer, verified, banned
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [modal, setModal]       = useState<{ user: User; action: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [stats, setStats] = useState({
    total: 0,
    brands: 0,
    creators: 0,
    banned: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Fetch Quick Stats in parallel
    const [allRes, brandsRes, creatorsRes, bannedRes] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'brand'),
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'influencer'),
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'suspended')
    ])
    
    setStats({
      total: allRes.count || 0,
      brands: brandsRes.count || 0,
      creators: creatorsRes.count || 0,
      banned: bannedRes.count || 0
    })

    let q = sb.from('profiles').select('*', { count: 'exact' })
    if (search)        q = q.ilike('display_name', `%${search}%`)
    if (filter === 'banned')   q = q.eq('account_status', 'suspended')
    if (filter === 'verified') q = q.eq('is_verified', true)
    if (filter === 'brand')    q = q.eq('role', 'brand')
    if (filter === 'influencer') q = q.eq('role', 'influencer')
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count, error } = await q
    if (!error && data) { setUsers(data as User[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [search, filter, page])

  useEffect(() => { load() }, [load])

  async function doAction(user: User, action: string) {
    setActionLoading(true)
    try {
      if (action === 'ban')   await banUser(user.id)
      if (action === 'unban') await unbanUser(user.id)
      if (action === 'verify') await verifyUser(user.id)
    } catch (e) {
      console.error('Failed to perform action', e)
    }
    setModal(null)
    setActionLoading(false)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const STATS = [
    { label: 'Total Users', value: stats.total.toLocaleString(), icon: <Users size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Brands', value: stats.brands.toLocaleString(), icon: <Briefcase size={16} />, color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Creators', value: stats.creators.toLocaleString(), icon: <UserCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Banned', value: stats.banned.toLocaleString(), icon: <XOctagon size={16} />, color: '#ef4444', bg: '#fee2e2' },
  ]

  return (
    <div className="page-wrap">
      <div className="dashboard-card-wrap" style={{ padding: 0 }}>
        
        {/* Top Header inside card */}
        <div className="dashboard-header" style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          position: 'sticky', top: 0, zIndex: 10, 
          background: 'var(--bg-2)', 
          padding: '20px 24px 16px 24px', 
          borderBottom: '1px solid var(--border)',
          borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
          flexWrap: 'wrap', gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Users</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="header-live-text" style={{ fontSize: '12px', color: 'var(--text-3)', marginRight: '8px' }}>Live Overview</span>
            <button onClick={load} className="btn btn-secondary header-btn" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}>
              <RefreshCw size={14} className="header-icon"/> Refresh
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${STATS.length}, 1fr)` }}>
              {STATS.map((s, i) => (
                <div key={i} style={{ 
                  border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.icon}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    {loading ? (
                      <div className="skeleton" style={{ height: 26, width: 80 }} />
                    ) : (
                      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                        {s.value}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', gap: '16px' }}>
                  {['all', 'brand', 'influencer', 'verified', 'banned'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search users…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

        <div style={{ overflowX: 'auto' }}>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>User</th>
                  <th style={{ width: '20%' }}>Role</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th style={{ width: '15%' }}>Joined</th>
                  <th style={{ width: '20%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 18, width: j === 0 ? 160 : 80 }} /></td>
                        ))}
                      </tr>
                    ))
                  : users.length === 0
                    ? <tr><td colSpan={5}><div className="empty-state"><UserX /><h3>No users found</h3></div></td></tr>
                    : users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">{initials(u.display_name)}</div>
                            <div>
                              <div className="user-name">{u.display_name || 'Anonymous User'}</div>
                              <div className="user-email" style={{ fontFamily: 'monospace', fontSize: 10 }}>{u.id.slice(0,8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${u.role === 'brand' ? 'badge-blue' : u.role === 'influencer' ? 'badge-purple' : 'badge-gray'}`}>
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td>
                          {u.account_status === 'suspended'
                            ? <span className="badge badge-red">Suspended</span>
                            : u.is_verified
                              ? <span className="badge badge-green">Verified</span>
                              : <span className="badge badge-gray">Active</span>
                          }
                        </td>
                        <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="td-actions" style={{ display: 'flex', gap: '8px' }}>
                            <Link href={`/users/${u.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}>
                              <Eye size={14} /> View
                            </Link>
                            {u.account_status === 'suspended'
                              ? <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}
                                  onClick={() => setModal({ user: u, action: 'unban' })}>
                                  <CheckCircle size={14} /> Un-suspend
                                </button>
                              : <button className="btn" style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}
                                  onClick={() => setModal({ user: u, action: 'ban' })}>
                                  <Ban size={14} /> Suspend
                                </button>
                            }
                            {!u.is_verified && (
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}
                                onClick={() => setModal({ user: u, action: 'verify' })}>
                                <CheckCircle size={14} /> Verify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>

        <div className="pagination">
          <span className="pagination-info">
            {total > 0 ? `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : '0 of 0'}
          </span>
          <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>‹</button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
            <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || total === 0}>›</button>
        </div>
      </div>

      {modal && modal.action !== 'view' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {modal.action === 'ban' ? 'Ban User' : modal.action === 'unban' ? 'Unban User' : 'Verify User'}
              </span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              Confirm <strong>{modal.action}</strong> for: <strong>{modal.user.display_name || modal.user.id}</strong>?
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`btn ${modal.action === 'ban' ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => doAction(modal.user, modal.action)}
                disabled={actionLoading}
              >
                {actionLoading ? <span className="spinner" /> : `Confirm`}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}
