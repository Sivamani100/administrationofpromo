'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Briefcase, User, CheckCircle2, Clock, Ban, Send, Eye, Star } from 'lucide-react'

type Application = {
  id: string
  created_at: string
  status: string
  proposed_rate: string
  influencer_id: string
  card_id: string
  influencer?: { display_name: string }
  card?: { title: string }
}

const PAGE_SIZE = 12

export default function ApplicationsPage() {
  const [apps, setApps]           = useState<Application[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    shortlisted: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Fetch Quick Stats
    const [allRes, pendingRes, acceptedRes, rejectedRes, shortlistedRes] = await Promise.all([
      sb.from('applications').select('*', { count: 'exact', head: true }),
      sb.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
      sb.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      sb.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'shortlisted')
    ])
    
    setStats({
      total: allRes.count || 0,
      pending: pendingRes.count || 0,
      accepted: acceptedRes.count || 0,
      rejected: rejectedRes.count || 0,
      shortlisted: shortlistedRes.count || 0
    })

    // Fetch Table Data
    let q = sb.from('applications')
      .select('*, influencer:profiles!applications_influencer_id_fkey(display_name), card:cards!applications_card_id_fkey(title)', { count: 'exact' })
      
    if (filter !== 'all') q = q.eq('status', filter)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { 
      setApps(data as Application[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Applications', value: stats.total.toLocaleString(), icon: <Send size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Pending', value: stats.pending.toLocaleString(), icon: <Clock size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Shortlisted', value: stats.shortlisted.toLocaleString(), icon: <Star size={16} />, color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Accepted', value: stats.accepted.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Rejected', value: stats.rejected.toLocaleString(), icon: <Ban size={16} />, color: '#ef4444', bg: '#fee2e2' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Applications</h1>
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
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
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
                  {['all', 'pending', 'shortlisted', 'accepted', 'rejected'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search applications…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '12%' }}>Date</th>
                      <th style={{ width: '28%' }}>Campaign</th>
                      <th style={{ width: '20%' }}>Influencer</th>
                      <th style={{ width: '12%' }}>Rate</th>
                      <th style={{ width: '13%' }}>Status</th>
                      <th style={{ width: '15%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 1 ? 180 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : apps.length === 0
                        ? <tr><td colSpan={6}><div className="empty-state"><Send /><h3>No applications found</h3></div></td></tr>
                        : apps.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                              {new Date(a.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <Link href={`/campaigns/${a.card_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Briefcase size={14} /> {a.card?.title || 'Unknown Campaign'}
                              </Link>
                            </td>
                            <td>
                              <Link href={`/users/${a.influencer_id}`} style={{ fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} /> {a.influencer?.display_name || 'Unknown User'}
                              </Link>
                            </td>
                            <td style={{ color: 'var(--text-2)', fontWeight: 600 }}>{a.proposed_rate || '—'}</td>
                            <td>
                              {a.status === 'pending' && <span className="badge badge-yellow">Pending</span>}
                              {a.status === 'accepted' && <span className="badge badge-green">Accepted</span>}
                              {a.status === 'rejected' && <span className="badge badge-red">Rejected</span>}
                              {a.status === 'shortlisted' && <span className="badge badge-purple">Shortlisted</span>}
                            </td>
                            <td>
                              <div className="td-actions">
                                <Link href={`/applications/${a.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}>
                                  <Eye size={14} /> View
                                </Link>
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
