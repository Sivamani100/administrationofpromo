'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, LifeBuoy, AlertCircle, Clock, CheckCircle2, User, Archive } from 'lucide-react'
import Link from 'next/link'

type Ticket = {
  id: string
  ticket_number?: string
  email?: string
  subject: string
  description?: string
  priority: string
  status: string
  created_at: string
  user_id?: string
  user?: { display_name: string }
}

const PAGE_SIZE = 12

export default function SupportTicketsPage() {
  const [tickets, setTickets]   = useState<Ticket[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)

  const [stats, setStats] = useState({
    total: 0, open: 0, resolved: 0, high: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()

    const [allRes, openRes, resolvedRes, highRes] = await Promise.all([
      sb.from('support_tickets').select('*', { count: 'exact', head: true }),
      sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('priority', 'high'),
    ])

    setStats({
      total: allRes.count || 0,
      open: openRes.count || 0,
      resolved: resolvedRes.count || 0,
      high: highRes.count || 0,
    })

    let q = sb.from('support_tickets')
      .select('*, user:profiles!support_tickets_user_id_fkey(display_name)', { count: 'exact' })

    if (filter !== 'all') q = q.eq('status', filter)
    if (search) q = q.ilike('subject', `%${search}%`)

    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    const { data, count } = await q
    if (data) { setTickets(data as Ticket[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [filter, page, search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Tickets',   value: stats.total.toLocaleString(),    icon: <LifeBuoy size={16} />,     color: '#6366f1', bg: '#ede9fe' },
    { label: 'Open',            value: stats.open.toLocaleString(),     icon: <Clock size={16} />,        color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Resolved',        value: stats.resolved.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'High Priority',   value: stats.high.toLocaleString(),     icon: <AlertCircle size={16} />,  color: '#ef4444', bg: '#fee2e2' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Support Tickets</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', marginRight: '8px' }}>Live Overview</span>
            <button onClick={load} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>

          <div style={{ marginBottom: '24px' }}>
            <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${STATS.length}, 1fr)` }}>
              {STATS.map((s, i) => (
                <div key={i} style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                  </div>
                  <div>{loading ? <div className="skeleton" style={{ height: 26, width: 80 }} /> : <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{s.value}</div>}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', gap: '16px' }}>
                  {['all', 'open', 'in_progress', 'resolved', 'closed'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search tickets…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '300px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>Ticket #</th>
                      <th style={{ width: '20%' }}>User / Email</th>
                      <th style={{ width: '30%' }}>Subject</th>
                      <th style={{ width: '10%' }}>Priority</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '15%' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: j === 2 ? 180 : 80 }} /></td>)}</tr>
                        ))
                      : tickets.length === 0
                        ? <tr><td colSpan={6}><div className="empty-state"><LifeBuoy /><h3>No tickets found</h3></div></td></tr>
                        : tickets.map(t => (
                          <tr key={t.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>
                              #{t.ticket_number || t.id.split('-')[0]}
                            </td>
                            <td>
                              {t.user_id ? (
                                <Link href={`/users/${t.user_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <User size={14} /> {t.user?.display_name || 'Unknown'}
                                </Link>
                              ) : (
                                <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{t.email || '—'}</span>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.subject}</div>
                              <div className="truncate" style={{ fontSize: 12, color: 'var(--text-3)' }} title={t.description}>{t.description}</div>
                            </td>
                            <td>
                              {t.priority === 'high' ? <span className="badge badge-red"><AlertCircle size={12}/> High</span>
                               : t.priority === 'medium' ? <span className="badge badge-yellow">Medium</span>
                               : <span className="badge badge-gray">Low</span>}
                            </td>
                            <td>
                              {t.status === 'open' ? <span className="badge badge-blue"><Clock size={12}/> Open</span>
                               : t.status === 'resolved' ? <span className="badge badge-green"><CheckCircle2 size={12}/> Resolved</span>
                               : t.status === 'closed' ? <span className="badge badge-gray"><Archive size={12}/> Closed</span>
                               : <span className="badge badge-gray">{t.status}</span>}
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pagination">
              <span className="pagination-info">{total > 0 ? `${Math.min((page-1)*PAGE_SIZE+1,total)}–${Math.min(page*PAGE_SIZE,total)} of ${total}` : '0 of 0'}</span>
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
