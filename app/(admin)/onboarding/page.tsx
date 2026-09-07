'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Zap, Clock, AlertTriangle, User, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

type OnboardingEvent = {
  id: string
  created_at: string
  user_id: string
  step_number: number
  step_name: string
  event_type: string
  time_spent_seconds: number
  error_encountered: string
  user?: { display_name: string }
}

const PAGE_SIZE = 12

export default function OnboardingPage() {
  const [events, setEvents]         = useState<OnboardingEvent[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)

  const [stats, setStats] = useState({
    total: 0,
    errors: 0,
    completed: 0,
    uniqueUsers: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Quick Stats
    const [allRes, errRes, compRes, uniqRes] = await Promise.all([
      sb.from('onboarding_events').select('*', { count: 'exact', head: true }),
      sb.from('onboarding_events').select('*', { count: 'exact', head: true }).not('error_encountered', 'is', null),
      sb.from('onboarding_events').select('*', { count: 'exact', head: true }).eq('event_type', 'completed'),
      sb.rpc('get_unique_onboarding_users') // Assuming we have this, otherwise we fallback
    ])
    
    setStats({
      total: allRes.count || 0,
      errors: errRes.count || 0,
      completed: compRes.count || 0,
      uniqueUsers: uniqRes.data || 0 // if RPC doesn't exist, we just show 0 for now.
    })

    let q = sb.from('onboarding_events')
      .select('*, user:profiles!onboarding_events_user_id_fkey(display_name)', { count: 'exact' })
      
    if (filter === 'errors') q = q.not('error_encountered', 'is', null)
    if (filter === 'success') q = q.is('error_encountered', null)
    if (search) q = q.ilike('step_name', `%${search}%`)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { 
      setEvents(data as OnboardingEvent[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filter, page, search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Events', value: stats.total.toLocaleString(), icon: <Zap size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Completed Steps', value: stats.completed.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Errors Encountered', value: stats.errors.toLocaleString(), icon: <AlertTriangle size={16} />, color: '#ef4444', bg: '#fee2e2' },
    { label: 'Unique Users', value: stats.uniqueUsers.toLocaleString(), icon: <User size={16} />, color: '#8b5cf6', bg: '#ede9fe' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Onboarding Funnel</h1>
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
                  {['all', 'success', 'errors'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search steps…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>Date</th>
                      <th style={{ width: '20%' }}>User</th>
                      <th style={{ width: '25%' }}>Step</th>
                      <th style={{ width: '15%' }}>Event Type</th>
                      <th style={{ width: '25%' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 2 ? 140 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : events.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><Zap /><h3>No events found</h3></div></td></tr>
                        : events.map(e => (
                          <tr key={e.id}>
                            <td>
                              <div style={{ color: 'var(--text-2)', fontSize: 12 }}>
                                {new Date(e.created_at).toLocaleString()}
                              </div>
                            </td>
                            <td>
                              {e.user_id ? (
                                <Link href={`/users/${e.user_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <User size={14} /> {e.user?.display_name || 'Anonymous'}
                                </Link>
                              ) : (
                                <span style={{ color: 'var(--text-3)' }}>Anonymous</span>
                              )}
                            </td>
                            <td>
                              <span className="badge badge-gray">Step {e.step_number}: {e.step_name}</span>
                            </td>
                            <td style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                              {e.event_type}
                            </td>
                            <td>
                              {e.error_encountered ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--red)', fontSize: 12 }}>
                                  <AlertTriangle size={12}/> {e.error_encountered}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }}>
                                  <Clock size={12}/> {e.time_spent_seconds ? `${e.time_spent_seconds}s spent` : '—'}
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
    </div>
  )
}
