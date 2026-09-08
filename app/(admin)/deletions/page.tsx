'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, CheckCircle, UserX, Trash2 } from 'lucide-react'

type DeletedUser = {
  id: string
  display_name: string
  role: string
  deleted_at: string
}

const PAGE_SIZE = 12

export default function DeletionsPage() {
  const [users, setUsers]       = useState<DeletedUser[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [modal, setModal]       = useState<{ user: DeletedUser; action: 'restore' | 'purge' } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [stats, setStats] = useState({
    total: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()

    // Quick Stats
    const { count: allCount } = await sb.from('profiles').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null)
    
    setStats({
      total: allCount || 0,
    })

    let q = sb.from('profiles')
      .select('id, display_name, role, deleted_at', { count: 'exact' })
      .not('deleted_at', 'is', null)
      
    if (search) q = q.ilike('display_name', `%${search}%`)
    
    q = q.order('deleted_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { setUsers(data as DeletedUser[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  async function doAction(user: DeletedUser, action: 'restore' | 'purge') {
    setActionLoading(true)
    const sb = createClient()
    
    if (action === 'restore') {
      await sb.from('profiles').update({ deleted_at: null, is_active: true }).eq('id', user.id)
      await sb.from('audit_logs').insert({ action: 'admin_restored_account', metadata: { target_user_id: user.id } })
    } else {
      await sb.rpc('delete_user_account', { p_user_id: user.id })
      await sb.from('audit_logs').insert({ action: 'admin_purged_account', metadata: { target_user_id: user.id } })
    }
    
    setModal(null); setActionLoading(false); load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Accounts Pending Purge', value: stats.total.toLocaleString(), icon: <UserX size={16} />, color: '#ef4444', bg: '#fee2e2' },
  ]

  return (
    <div className="page-wrap">
      <div className="dashboard-card-wrap" style={{ padding: 0 }}>
        
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Deletion Requests</h1>
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
                      <th style={{ width: '35%' }}>User</th>
                      <th style={{ width: '20%' }}>Role</th>
                      <th style={{ width: '20%' }}>Deleted At</th>
                      <th style={{ width: '25%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 4 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 0 ? 200 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : users.length === 0
                        ? <tr><td colSpan={4}><div className="empty-state"><UserX /><h3>No pending deletions</h3></div></td></tr>
                        : users.map(u => (
                          <tr key={u.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{u.display_name || 'Anonymous User'}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.id.slice(0,8)}...</div>
                            </td>
                            <td>
                              <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                                {u.role || 'user'}
                              </span>
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{new Date(u.deleted_at).toLocaleString()}</td>
                            <td>
                              <div className="td-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px', color: 'var(--green)' }}
                                  onClick={() => setModal({ user: u, action: 'restore' })}>
                                  <CheckCircle size={14} /> Restore
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px', color: 'var(--red)' }}
                                  onClick={() => setModal({ user: u, action: 'purge' })}>
                                  <Trash2 size={14} /> Purge
                                </button>
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
                {total > 0 ? `${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : '0 of 0'}
              </span>
              <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || total === 0}>›</button>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {modal.action === 'purge' ? '⚠️ Confirm Permanent Purge' : 'Restore Account'}
              </span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {modal.action === 'purge'
                ? <><p style={{ marginBottom: 8, color: 'var(--red)', fontWeight: 600 }}>This action is irreversible.</p>
                    <p>Are you absolutely sure you want to permanently delete <strong>{modal.user.display_name || 'this user'}</strong>&apos;s account and ALL associated data? This action uses a secure script and cannot be undone.</p></>
                : <p>Restore account for <strong>{modal.user.display_name || 'this user'}</strong>? They will regain access to the platform.</p>
              }
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`btn ${modal.action === 'purge' ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => doAction(modal.user, modal.action)}
                disabled={actionLoading}
              >
                {actionLoading ? <span className="spinner" /> : modal.action === 'purge' ? 'Confirm Purge' : 'Restore Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
