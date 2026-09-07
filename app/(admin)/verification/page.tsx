'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, CheckCircle, XCircle, FileText, CheckCircle2, Clock } from 'lucide-react'
import { approveVerification, rejectVerification } from '@/app/actions/admin'
import Link from 'next/link'

type VReq = {
  id: string
  user_id: string
  status: string
  document_url?: string
  created_at: string
  profiles?: { display_name: string }
}

const PAGE_SIZE = 12

export default function VerificationPage() {
  const [requests, setRequests] = useState<VReq[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [modal, setModal]       = useState<{ req: VReq; action: 'approve' | 'reject' } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [note, setNote]         = useState('')

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Quick Stats
    const [allRes, pRes, aRes, rRes] = await Promise.all([
      sb.from('verification_requests').select('*', { count: 'exact', head: true }),
      sb.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      sb.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
    ])
    
    setStats({
      total: allRes.count || 0,
      pending: pRes.count || 0,
      approved: aRes.count || 0,
      rejected: rRes.count || 0
    })

    let q = sb.from('verification_requests')
      .select('*, profiles!inner(display_name)', { count: 'exact' })
      
    if (filter !== 'all') q = q.eq('status', filter)
    if (search) q = q.ilike('profiles.display_name', `%${search}%`)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { setRequests(data as VReq[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [filter, page, search])

  useEffect(() => { load() }, [load])

  async function doAction(req: VReq, action: 'approve' | 'reject') {
    setActionLoading(true)
    try {
      if (action === 'approve') await approveVerification(req.id, req.user_id, note)
      if (action === 'reject')  await rejectVerification(req.id, req.user_id, note)
    } catch (e) {
      console.error('Failed to perform action', e)
    }
    setModal(null); setNote(''); setActionLoading(false); load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Requests', value: stats.total.toLocaleString(), icon: <FileText size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Pending', value: stats.pending.toLocaleString(), icon: <Clock size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Approved', value: stats.approved.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Rejected', value: stats.rejected.toLocaleString(), icon: <XCircle size={16} />, color: '#ef4444', bg: '#fee2e2' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Verification Requests</h1>
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
                  {['all', 'pending', 'approved', 'rejected'].map(t => (
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
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '20%' }}>Submitted</th>
                      <th style={{ width: '15%' }}>Document</th>
                      <th style={{ width: '20%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 0 ? 160 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : requests.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><FileText /><h3>No requests found</h3></div></td></tr>
                        : requests.map(r => (
                          <tr key={r.id}>
                            <td>
                              <Link href={`/users/${r.user_id}`} style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                {r.profiles?.display_name || 'Anonymous User'}
                              </Link>
                              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.user_id.slice(0,8)}...</div>
                            </td>
                            <td>
                              {r.status === 'approved' ? (
                                <span className="badge badge-green">Approved</span>
                              ) : r.status === 'pending' ? (
                                <span className="badge badge-yellow">Pending</span>
                              ) : (
                                <span className="badge badge-red">Rejected</span>
                              )}
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                            <td>
                              {r.document_url
                                ? <a href={r.document_url} target="_blank" rel="noopener noreferrer"
                                    className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px' }}>View Doc</a>
                                : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>None</span>
                              }
                            </td>
                            <td>
                              {r.status === 'pending' && (
                                <div className="td-actions" style={{ display: 'flex', gap: '8px' }}>
                                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px', color: 'var(--green)' }}
                                    onClick={() => setModal({ req: r, action: 'approve' })}>
                                    <CheckCircle size={14} /> Approve
                                  </button>
                                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px', color: 'var(--red)' }}
                                    onClick={() => setModal({ req: r, action: 'reject' })}>
                                    <XCircle size={14} /> Reject
                                  </button>
                                </div>
                              )}
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
              <span className="modal-title">{modal.action === 'approve' ? 'Approve Verification' : 'Reject Verification'}</span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>
                {modal.action === 'approve' ? 'Approve' : 'Reject'} request from <strong>{modal.req.profiles?.display_name || 'this user'}</strong>?
              </p>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <textarea className="form-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Add a note for the audit log…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`btn ${modal.action === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                onClick={() => doAction(modal.req, modal.action)}
                disabled={actionLoading}
              >
                {actionLoading ? <span className="spinner" /> : modal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
