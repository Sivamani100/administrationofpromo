'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Hash, AlertCircle, User, MessageSquare } from 'lucide-react'
import Link from 'next/link'

type SearchEvent = {
  id: string
  created_at: string
  user_id: string
  query: string
  result_count: number
  user?: { display_name: string }
}

const PAGE_SIZE = 12

export default function SearchInsightsPage() {
  const [searches, setSearches]     = useState<SearchEvent[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)

  const [stats, setStats] = useState({
    total: 0,
    zeroResults: 0,
    withResults: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Quick Stats
    const [allRes, zeroRes, withRes] = await Promise.all([
      sb.from('search_events').select('*', { count: 'exact', head: true }),
      sb.from('search_events').select('*', { count: 'exact', head: true }).eq('result_count', 0),
      sb.from('search_events').select('*', { count: 'exact', head: true }).gt('result_count', 0)
    ])
    
    setStats({
      total: allRes.count || 0,
      zeroResults: zeroRes.count || 0,
      withResults: withRes.count || 0
    })

    let q = sb.from('search_events')
      .select('*, user:profiles!search_events_user_id_fkey(display_name)', { count: 'exact' })
      
    if (filter === 'zero') q = q.eq('result_count', 0)
    if (filter === 'results') q = q.gt('result_count', 0)
    if (search) q = q.ilike('query', `%${search}%`)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { 
      setSearches(data as SearchEvent[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filter, page, search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Searches', value: stats.total.toLocaleString(), icon: <Search size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'With Results', value: stats.withResults.toLocaleString(), icon: <Hash size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Zero Results', value: stats.zeroResults.toLocaleString(), icon: <AlertCircle size={16} />, color: '#ef4444', bg: '#fee2e2' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Search Insights</h1>
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
                  {['all', 'results', 'zero'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t === 'zero' ? 'Zero Results' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search queries…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Date</th>
                      <th style={{ width: '25%' }}>User</th>
                      <th style={{ width: '40%' }}>Query</th>
                      <th style={{ width: '15%' }}>Results Found</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 4 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 2 ? 140 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : searches.length === 0
                        ? <tr><td colSpan={4}><div className="empty-state"><Search /><h3>No search events</h3></div></td></tr>
                        : searches.map(s => (
                          <tr key={s.id}>
                            <td>
                              <div style={{ color: 'var(--text-2)', fontSize: 12 }}>
                                {new Date(s.created_at).toLocaleString()}
                              </div>
                            </td>
                            <td>
                              {s.user_id ? (
                                <Link href={`/users/${s.user_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <User size={14} /> {s.user?.display_name || 'Unknown'}
                                </Link>
                              ) : (
                                <span style={{ color: 'var(--text-3)' }}>Anonymous</span>
                              )}
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                              "{s.query}"
                            </td>
                            <td>
                              {s.result_count === 0 ? (
                                <span className="badge badge-red"><AlertCircle size={12}/> 0 Results</span>
                              ) : (
                                <span className="badge badge-green"><Hash size={12}/> {s.result_count}</span>
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
