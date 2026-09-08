'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Activity, Clock, Zap } from 'lucide-react'
import Link from 'next/link'

type UserLog = {
  id: string
  user_id: string
  endpoint: string
  method: string
  status_code: number
  response_ms: number
  created_at: string
  profiles?: { display_name: string }
}

const PAGE_SIZE = 20

export default function UserLogsPage() {
  const [logs, setLogs]       = useState<UserLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [stats, setStats]     = useState({ total: 0, errors: 0, avgMs: 0 })

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const load = useCallback(async (abortSignal?: AbortSignal) => {
    setLoading(true)
    const sb = createClient()

    const [allRes, errorRes] = await Promise.all([
      sb.from('api_usage').select('*', { count: 'exact', head: true }),
      sb.from('api_usage').select('*', { count: 'exact', head: true }).gte('status_code', 400),
    ])

    if (abortSignal?.aborted) return

    // Get avg response time from a sample
    const { data: sample } = await sb.from('api_usage').select('response_ms').limit(200)
    const avgMs = sample && sample.length > 0
      ? Math.round(sample.reduce((a: number, b: any) => a + (b.response_ms || 0), 0) / sample.length)
      : 0

    setStats({ total: allRes.count || 0, errors: errorRes.count || 0, avgMs })

    let q = sb.from('api_usage').select('*, profiles:user_id(display_name)', { count: 'exact' })
    if (debouncedSearch) q = q.ilike('endpoint', `%${debouncedSearch}%`)
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    const { data, count } = await q
    
    if (abortSignal?.aborted) return
    
    if (data) { setLogs(data as UserLog[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [debouncedSearch, page])

  useEffect(() => { 
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Requests', value: stats.total.toLocaleString(),  icon: <Activity size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Errors (4xx/5xx)', value: stats.errors.toLocaleString(), icon: <Zap size={16} />,    color: '#ef4444', bg: '#fee2e2' },
    { label: 'Avg Response',   value: `${stats.avgMs}ms`,            icon: <Clock size={16} />,   color: '#f59e0b', bg: '#fef3c7' },
  ]

  function statusBadge(code: number) {
    if (code >= 500) return <span className="badge badge-red">{code}</span>
    if (code >= 400) return <span className="badge badge-yellow">{code}</span>
    if (code >= 300) return <span className="badge badge-blue">{code}</span>
    return <span className="badge badge-green">{code}</span>
  }

  function methodBadge(method: string) {
    const m = (method || '').toUpperCase()
    const map: Record<string, string> = { GET: 'badge-blue', POST: 'badge-green', PUT: 'badge-yellow', DELETE: 'badge-red', PATCH: 'badge-purple' }
    return <span className={`badge ${map[m] || 'badge-gray'}`} style={{ fontSize: 11, fontFamily: 'monospace' }}>{m}</span>
  }

  return (
    <div className="page-wrap">
      <div className="dashboard-card-wrap" style={{ padding: 0 }}>

        <div className="dashboard-header" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg-2)', padding: '20px 24px 16px 24px',
          borderBottom: '1px solid var(--border)',
          borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
          flexWrap: 'wrap', gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>User Activity Logs</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Per-user API request activity</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Live Overview</span>
            <button onClick={() => load()} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13, gap: 6, borderRadius: 8 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: 24 }}>
            <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${STATS.length}, 1fr)` }}>
              {STATS.map((s, i) => (
                <div key={i} style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{s.label}</div>
                  </div>
                  <div>{loading ? <div className="skeleton" style={{ height: 26, width: 80 }} /> : <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{s.value}</div>}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>API Requests</h3>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Filter by endpoint…" value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                    style={{ width: 300 }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>User</th>
                      <th style={{ width: '30%' }}>Endpoint</th>
                      <th style={{ width: '10%' }}>Method</th>
                      <th style={{ width: '15%' }}>Status / Time</th>
                      <th style={{ width: '25%' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>{[120, 200, 60, 80, 130].map((w, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: w }} /></td>)}</tr>
                        ))
                      : logs.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><Activity /><h3>No logs found</h3></div></td></tr>
                        : logs.map(l => (
                          <tr key={l.id}>
                            <td>
                              <Link href={`/users/${l.user_id}`} style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 13.5 }}>
                                {l.profiles?.display_name || 'Anonymous'}
                              </Link>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{l.user_id?.slice(0, 8)}…</div>
                            </td>
                            <td>
                              <code style={{ background: 'var(--bg-3)', borderRadius: 5, padding: '3px 8px', fontSize: 12, display: 'inline-block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {l.endpoint}
                              </code>
                            </td>
                            <td>{methodBadge(l.method)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {statusBadge(l.status_code)}
                                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{l.response_ms}ms</span>
                              </div>
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                              {new Date(l.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pagination">
              <span className="pagination-info">{total > 0 ? `${Math.min((page-1)*PAGE_SIZE+1,total)}–${Math.min(page*PAGE_SIZE,total)} of ${total.toLocaleString()}` : '0'}</span>
              <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
