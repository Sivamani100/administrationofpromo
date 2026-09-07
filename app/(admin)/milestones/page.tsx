'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, CheckSquare, Calendar, MessagesSquare, CheckCircle2, Clock } from 'lucide-react'

type Milestone = {
  id: string
  created_at: string
  title: string
  room_id: string
  created_by: string
  due_date: string | null
  status: string
  creator?: { display_name: string }
}

const PAGE_SIZE = 12

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Fetch Quick Stats
    const [allRes, compRes, inProgRes] = await Promise.all([
      sb.from('milestones').select('*', { count: 'exact', head: true }),
      sb.from('milestones').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      sb.from('milestones').select('*', { count: 'exact', head: true }).eq('status', 'in_progress')
    ])
    
    setStats({
      total: allRes.count || 0,
      completed: compRes.count || 0,
      inProgress: inProgRes.count || 0
    })

    // Fetch Table Data
    let q = sb.from('milestones')
      .select('*, creator:profiles!milestones_created_by_fkey(display_name)', { count: 'exact' })
      
    if (filter !== 'all') q = q.eq('status', filter)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { 
      setMilestones(data as Milestone[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Milestones', value: stats.total.toLocaleString(), icon: <CheckSquare size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'In Progress', value: stats.inProgress.toLocaleString(), icon: <Clock size={16} />, color: '#3b82f6', bg: '#dbeafe' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Milestones Tracker</h1>
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
                  {['all', 'in_progress', 'completed'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search milestones…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Title</th>
                      <th style={{ width: '20%' }}>Room ID</th>
                      <th style={{ width: '15%' }}>Creator</th>
                      <th style={{ width: '15%' }}>Due Date</th>
                      <th style={{ width: '15%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 0 ? 180 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : milestones.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><CheckSquare /><h3>No milestones found</h3></div></td></tr>
                        : milestones.map(m => (
                          <tr key={m.id}>
                            <td style={{ fontWeight: 600 }}>{m.title}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)' }}>
                                <MessagesSquare size={14} /> {m.room_id?.substring(0, 8)}...
                              </div>
                            </td>
                            <td>
                              <Link href={`/users/${m.created_by}`} style={{ color: 'var(--primary)' }}>
                                {m.creator?.display_name || 'Unknown'}
                              </Link>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={14} style={{ color: 'var(--text-3)' }} />
                                {m.due_date ? new Date(m.due_date).toLocaleDateString() : '—'}
                              </div>
                            </td>
                            <td>
                              {m.status === 'completed' ? (
                                <span className="badge badge-green"><CheckCircle2 size={12}/> Completed</span>
                              ) : m.status === 'in_progress' ? (
                                <span className="badge badge-blue"><Clock size={12}/> In Progress</span>
                              ) : (
                                <span className="badge badge-gray">{m.status}</span>
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
