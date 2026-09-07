'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Filter, AlertTriangle, User, CheckCircle2, ShieldCheck, Clock, XCircle } from 'lucide-react'

type ModQueueItem = {
  id: string
  created_at: string
  content_type: string
  author_id: string
  flag_reason: string
  flag_source: string
  status: string
  author?: { display_name: string }
}

const PAGE_SIZE = 12

export default function ModerationQueuePage() {
  const [queue, setQueue]           = useState<ModQueueItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)

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
    const [allRes, pendingRes, appRes, rejRes] = await Promise.all([
      sb.from('moderation_queue').select('*', { count: 'exact', head: true }),
      sb.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      sb.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
    ])
    
    setStats({
      total: allRes.count || 0,
      pending: pendingRes.count || 0,
      approved: appRes.count || 0,
      rejected: rejRes.count || 0
    })

    let q = sb.from('moderation_queue')
      .select('*, author:profiles!moderation_queue_author_id_fkey(display_name)', { count: 'exact' })
      
    if (filter !== 'all') q = q.eq('status', filter)
    if (search) q = q.ilike('flag_reason', `%${search}%`)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { 
      setQueue(data as ModQueueItem[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filter, page, search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Queue', value: stats.total.toLocaleString(), icon: <ShieldCheck size={16} />, color: '#6366f1', bg: '#ede9fe' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Moderation Queue</h1>
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
                  <input placeholder="Search queue…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>Date Flagged</th>
                      <th style={{ width: '15%' }}>Content Type</th>
                      <th style={{ width: '25%' }}>Author</th>
                      <th style={{ width: '30%' }}>Reason</th>
                      <th style={{ width: '15%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 2 ? 180 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : queue.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><ShieldCheck /><h3>Queue is empty</h3></div></td></tr>
                        : queue.map(q => (
                          <tr key={q.id}>
                            <td>
                              <div style={{ color: 'var(--text-2)', fontSize: 12 }}>
                                {new Date(q.created_at).toLocaleString()}
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-gray" style={{ textTransform: 'uppercase' }}>
                                {q.content_type}
                              </span>
                            </td>
                            <td>
                              <Link href={`/users/${q.author_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} /> {q.author?.display_name || 'Unknown'}
                              </Link>
                            </td>
                            <td style={{ color: 'var(--red)', fontWeight: 500 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertTriangle size={14} /> {q.flag_reason}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Source: {q.flag_source}</div>
                            </td>
                            <td>
                              {q.status === 'pending' ? (
                                <span className="badge badge-yellow">Pending</span>
                              ) : q.status === 'approved' ? (
                                <span className="badge badge-green"><CheckCircle2 size={12}/> Approved</span>
                              ) : (
                                <span className="badge badge-red">Rejected</span>
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
    </div>
  )
}
