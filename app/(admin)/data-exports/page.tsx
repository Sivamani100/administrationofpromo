'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, DownloadCloud, Clock, CheckCircle2, User, Play } from 'lucide-react'

type DataExport = {
  id: string
  created_at: string
  user_id: string
  status: string
  expires_at: string | null
  download_url: string | null
  user?: { display_name: string }
}

const PAGE_SIZE = 12

export default function DataExportsPage() {
  const [exports, setExports]       = useState<DataExport[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Fetch Quick Stats
    const [allRes, pendingRes, compRes] = await Promise.all([
      sb.from('data_export_requests').select('*', { count: 'exact', head: true }),
      sb.from('data_export_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('data_export_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed')
    ])
    
    setStats({
      total: allRes.count || 0,
      pending: pendingRes.count || 0,
      completed: compRes.count || 0
    })

    // Fetch Table Data
    let q = sb.from('data_export_requests')
      .select('*, user:profiles!data_export_requests_user_id_fkey(display_name)', { count: 'exact' })
      
    if (filter !== 'all') q = q.eq('status', filter)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { 
      setExports(data as DataExport[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Requests', value: stats.total.toLocaleString(), icon: <DownloadCloud size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Pending', value: stats.pending.toLocaleString(), icon: <Clock size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Completed', value: stats.completed.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Data Export Requests</h1>
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
                  {['all', 'pending', 'completed'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search exports…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Date Requested</th>
                      <th style={{ width: '30%' }}>User</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '20%' }}>Expires At</th>
                      <th style={{ width: '15%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 1 ? 140 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : exports.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><DownloadCloud /><h3>No export requests</h3></div></td></tr>
                        : exports.map(e => (
                          <tr key={e.id}>
                            <td>
                              <div style={{ color: 'var(--text-2)', fontSize: 12 }}>
                                {new Date(e.created_at).toLocaleString()}
                              </div>
                            </td>
                            <td>
                              <Link href={`/users/${e.user_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} /> {e.user?.display_name || 'Anonymous User'}
                              </Link>
                            </td>
                            <td>
                              {e.status === 'completed' ? (
                                <span className="badge badge-green"><CheckCircle2 size={12}/> Completed</span>
                              ) : e.status === 'pending' ? (
                                <span className="badge badge-yellow"><Clock size={12}/> Pending</span>
                              ) : (
                                <span className="badge badge-gray">{e.status}</span>
                              )}
                            </td>
                            <td style={{ color: 'var(--text-2)' }}>
                              {e.expires_at ? new Date(e.expires_at).toLocaleDateString() : '—'}
                            </td>
                            <td>
                              <div className="td-actions" style={{ display: 'flex', gap: '8px' }}>
                                {e.status === 'pending' && (
                                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}>
                                    <Play size={12}/> Trigger
                                  </button>
                                )}
                                {e.status === 'completed' && e.download_url && (
                                  <a href={e.download_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}>
                                    <DownloadCloud size={12}/> Download
                                  </a>
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
