'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { RefreshCw, MessageSquare, AlertOctagon, AlertTriangle, CheckCircle2, Archive, Search } from 'lucide-react'

import { resolveDispute, closeDispute } from '@/app/actions/admin'

type Dispute = {
  id: string
  agreement_id?: string
  status: string
  category: string
  description: string
  created_at: string
  requester?: { display_name: string }
}

const PAGE_SIZE = 12

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('open') // all, open, resolved, closed
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [modal, setModal]       = useState<{ d: Dispute; action: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    resolved: 0,
    closed: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Fetch Quick Stats in parallel
    const [allRes, openRes, resolvedRes, closedRes] = await Promise.all([
      sb.from('disputes').select('*', { count: 'exact', head: true }),
      sb.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      sb.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      sb.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'closed')
    ])
    
    setStats({
      total: allRes.count || 0,
      open: openRes.count || 0,
      resolved: resolvedRes.count || 0,
      closed: closedRes.count || 0
    })

    // Fetch Table Data
    let q = sb.from('disputes')
      .select('*, requester:raised_by(display_name)', { count: 'exact' })
    if (filter !== 'all') q = q.eq('status', filter)
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { setDisputes(data as Dispute[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  async function doAction(d: Dispute, action: string) {
    setActionLoading(true)
    try {
      if (action === 'resolve') await resolveDispute(d.id)
      if (action === 'close')   await closeDispute(d.id)
    } catch (e) {
      console.error('Failed to perform action', e)
    }
    setModal(null); setActionLoading(false); load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Disputes', value: stats.total.toLocaleString(), icon: <AlertOctagon size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Open', value: stats.open.toLocaleString(), icon: <AlertTriangle size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Resolved', value: stats.resolved.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Closed', value: stats.closed.toLocaleString(), icon: <Archive size={16} />, color: '#8b5cf6', bg: '#ede9fe' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Disputes</h1>
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
                  {['all', 'open', 'resolved', 'closed'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search disputes…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Requester</th>
                      <th style={{ width: '15%' }}>Agreement</th>
                      <th style={{ width: '25%' }}>Category</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '15%' }}>Date</th>
                      <th style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: j === 2 ? 140 : 80 }} /></td>)}
                      </tr>
                    ))
                  : disputes.length === 0
                    ? <tr><td colSpan={6}><div className="empty-state"><MessageSquare /><h3>No disputes found</h3></div></td></tr>
                    : disputes.map(d => (
                        <tr key={d.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.requester?.display_name || 'Anonymous'}</div>
                          </td>
                          <td style={{ fontSize: 12.5, color: 'var(--text-2)', fontFamily: 'monospace' }}>{d.agreement_id?.slice(0, 8) || '—'}…</td>
                          <td style={{ maxWidth: 220 }}>
                            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{d.category}</div>
                            <div className="truncate" style={{ fontSize: 12, color: 'var(--text-3)' }} title={d.description}>{d.description}</div>
                          </td>
                          <td>
                            <span className={`badge ${d.status === 'open' ? 'badge-yellow' : d.status === 'resolved' ? 'badge-green' : 'badge-gray'}`}>
                              {d.status}
                            </span>
                          </td>
                          <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                          <td>
                            {d.status === 'open' && (
                              <div className="td-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}
                                  onClick={() => setModal({ d, action: 'resolve' })}>
                                  <CheckCircle2 size={14} /> Resolve
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }} onClick={() => setModal({ d, action: 'close' })}>
                                  Close
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
            {total > 0 ? `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : '0 of 0'}
          </span>
          <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>‹</button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
            <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || total === 0}>›</button>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ textTransform: 'capitalize' }}>{modal.action} Dispute</span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                Are you sure you want to <strong>{modal.action}</strong> this dispute raised by <strong>{modal.d.requester?.display_name || 'User'}</strong>?
              </div>
              <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{modal.d.category}</div>
                <div style={{ color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{modal.d.description}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => doAction(modal.d, modal.action)} disabled={actionLoading}>
                {actionLoading ? <span className="spinner" /> : 'Confirm'}
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
