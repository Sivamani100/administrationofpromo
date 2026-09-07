'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, CheckCircle, XCircle, FileText, AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { resolveReport, dismissReport } from '@/app/actions/admin'
import Link from 'next/link'

type Report = {
  id: string
  reason: string
  status: string
  description?: string
  reported_user_id?: string
  reporter_id?: string
  card_id?: string
  created_at: string
  reporter?: { display_name: string }
  reported?: { display_name: string }
}

const PAGE_SIZE = 12

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('pending')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [modal, setModal]     = useState<{ r: Report; action: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    dismissed: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Quick Stats
    const [allRes, pRes, rRes, dRes] = await Promise.all([
      sb.from('reports').select('*', { count: 'exact', head: true }),
      sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'dismissed')
    ])
    
    setStats({
      total: allRes.count || 0,
      pending: pRes.count || 0,
      resolved: rRes.count || 0,
      dismissed: dRes.count || 0
    })

    let q = sb.from('reports')
      .select('*, reporter:reporter_id(display_name), reported:reported_user_id(display_name)', { count: 'exact' })
      
    if (filter !== 'all') q = q.eq('status', filter)
    if (search) q = q.ilike('reason', `%${search}%`)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { setReports(data as Report[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [filter, search, page])

  useEffect(() => { load() }, [load])

  async function doAction(r: Report, action: string) {
    setActionLoading(true)
    try {
      if (action === 'resolve') await resolveReport(r.id)
      if (action === 'dismiss') await dismissReport(r.id)
    } catch (e) {
      console.error('Failed to perform action', e)
    }
    setModal(null); setActionLoading(false); load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Reports', value: stats.total.toLocaleString(), icon: <AlertOctagon size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Pending', value: stats.pending.toLocaleString(), icon: <AlertTriangle size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Resolved', value: stats.resolved.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Dismissed', value: stats.dismissed.toLocaleString(), icon: <XCircle size={16} />, color: '#8b5cf6', bg: '#ede9fe' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Reports Queue</h1>
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
                  {['all', 'pending', 'resolved', 'dismissed', 'escalated'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search reason…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>Reporter</th>
                      <th style={{ width: '20%' }}>Reported User</th>
                      <th style={{ width: '25%' }}>Reason</th>
                      <th style={{ width: '10%' }}>Type</th>
                      <th style={{ width: '10%' }}>Status</th>
                      <th style={{ width: '10%' }}>Date</th>
                      <th style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 2 ? 140 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : reports.length === 0
                        ? <tr><td colSpan={7}><div className="empty-state"><FileText /><h3>No reports found</h3></div></td></tr>
                        : reports.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                              <Link href={`/users/${r.reporter_id}`}>
                                {r.reporter?.display_name || 'Anonymous'}
                              </Link>
                            </td>
                            <td>
                              <Link href={`/users/${r.reported_user_id}`} style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                                {r.reported?.display_name || 'Anonymous'}
                              </Link>
                              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.reported_user_id?.slice(0,8)}...</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{r.reason}</div>
                              <div className="truncate" style={{ fontSize: 12, color: 'var(--text-3)' }} title={r.description}>{r.description}</div>
                            </td>
                            <td><span className="badge badge-blue">{r.card_id ? 'Card' : 'User'}</span></td>
                            <td>
                              <span className={`badge ${r.status === 'pending' ? 'badge-yellow' : r.status === 'resolved' ? 'badge-green' : r.status === 'dismissed' ? 'badge-gray' : 'badge-red'}`}>
                                {r.status}
                              </span>
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                            <td>
                              {r.status === 'pending' && (
                                <div className="td-actions" style={{ display: 'flex', gap: '8px' }}>
                                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px', color: 'var(--green)' }}
                                    onClick={() => setModal({ r, action: 'resolve' })}>
                                    <CheckCircle size={14} /> Resolve
                                  </button>
                                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }} onClick={() => setModal({ r, action: 'dismiss' })}>
                                    Dismiss
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
              <span className="modal-title" style={{ textTransform: 'capitalize' }}>{modal.action} Report</span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                Are you sure you want to <strong>{modal.action}</strong> this report from <strong>{modal.r.reporter?.display_name || 'User'}</strong>?
              </div>
              <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{modal.r.reason}</div>
                <div style={{ color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{modal.r.description}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => doAction(modal.r, modal.action)} disabled={actionLoading}>
                {actionLoading ? <span className="spinner" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
