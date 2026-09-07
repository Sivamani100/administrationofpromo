'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, ShieldCheck, AlertTriangle, Mail, Activity } from 'lucide-react'

type Log = {
  id: string
  action: string
  created_at: string
  metadata?: Record<string, unknown>
  admin_id?: string
}

const PAGE_SIZE = 20

function actionStyle(action: string) {
  if (action.includes('ban') || action.includes('delete') || action.includes('suspend'))
    return { color: '#ef4444', background: '#fee2e2' }
  if (action.includes('approve') || action.includes('verify') || action.includes('unban'))
    return { color: '#10b981', background: '#d1fae5' }
  if (action.includes('email') || action.includes('notify') || action.includes('broadcast'))
    return { color: '#3b82f6', background: '#dbeafe' }
  return { color: '#7c3aed', background: '#ede9fe' }
}

export default function AuditLogsPage() {
  const [logs, setLogs]       = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [stats, setStats]     = useState({ total: 0, danger: 0, emails: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()

    const [allRes, dangerRes, emailRes] = await Promise.all([
      sb.from('audit_logs').select('*', { count: 'exact', head: true }),
      sb.from('audit_logs').select('*', { count: 'exact', head: true }).or('action.ilike.%ban%,action.ilike.%delete%,action.ilike.%suspend%'),
      sb.from('audit_logs').select('*', { count: 'exact', head: true }).or('action.ilike.%email%,action.ilike.%notify%'),
    ])
    setStats({ total: allRes.count || 0, danger: dangerRes.count || 0, emails: emailRes.count || 0 })

    let q = sb.from('audit_logs').select('*', { count: 'exact' })
    if (search) q = q.ilike('action', `%${search}%`)
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    const { data, count } = await q
    if (data) { setLogs(data as Log[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [search, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Events',   value: stats.total,  icon: <Activity size={16} />,      color: '#6366f1', bg: '#ede9fe' },
    { label: 'Danger Actions', value: stats.danger, icon: <AlertTriangle size={16} />, color: '#ef4444', bg: '#fee2e2' },
    { label: 'Email Events',   value: stats.emails, icon: <Mail size={16} />,          color: '#3b82f6', bg: '#dbeafe' },
  ]

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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Audit Logs</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Complete system event log</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Live Overview</span>
            <button onClick={load} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13, gap: 6, borderRadius: 8 }}>
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
                  <div>{loading ? <div className="skeleton" style={{ height: 26, width: 80 }} /> : <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{s.value.toLocaleString()}</div>}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={15} color="var(--primary)" /> System Events
                </h3>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Filter by action…" value={search}
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
                      <th style={{ width: '30%' }}>Action</th>
                      <th style={{ width: '50%' }}>Metadata</th>
                      <th style={{ width: '20%' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>{[160, 300, 120].map((w, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: w }} /></td>)}</tr>
                        ))
                      : logs.length === 0
                        ? <tr><td colSpan={3}><div className="empty-state"><ShieldCheck /><h3>No audit events found</h3></div></td></tr>
                        : logs.map(l => (
                          <tr key={l.id}>
                            <td>
                              <span className="badge" style={{ ...actionStyle(l.action), borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600 }}>
                                {l.action}
                              </span>
                            </td>
                            <td>
                              <code style={{ background: 'var(--bg-3)', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: 'var(--text-2)', display: 'block', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {JSON.stringify(l.metadata || {}).slice(0, 140)}
                              </code>
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
