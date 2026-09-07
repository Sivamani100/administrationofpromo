'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Star, MessageSquare, Reply, User } from 'lucide-react'

type Review = {
  id: string
  created_at: string
  rating: number
  reviewer_id: string
  reviewed_id: string
  comment: string
  reply: string | null
  reviewer?: { display_name: string }
  reviewed?: { display_name: string }
}

const PAGE_SIZE = 12

export default function ReviewsPage() {
  const [reviews, setReviews]       = useState<Review[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)

  const [stats, setStats] = useState({
    total: 0,
    replied: 0,
    unanswered: 0,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Fetch Quick Stats
    const [allRes, repliedRes, unRes] = await Promise.all([
      sb.from('reviews').select('*', { count: 'exact', head: true }),
      sb.from('reviews').select('*', { count: 'exact', head: true }).not('reply', 'is', null),
      sb.from('reviews').select('*', { count: 'exact', head: true }).is('reply', null)
    ])
    
    setStats({
      total: allRes.count || 0,
      replied: repliedRes.count || 0,
      unanswered: unRes.count || 0
    })

    // Fetch Table Data
    let q = sb.from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(display_name), reviewed:profiles!reviews_reviewed_id_fkey(display_name)', { count: 'exact' })
      
    if (filter === 'replied') q = q.not('reply', 'is', null)
    if (filter === 'unanswered') q = q.is('reply', null)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { 
      setReviews(data as Review[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Reviews', value: stats.total.toLocaleString(), icon: <Star size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Replied', value: stats.replied.toLocaleString(), icon: <Reply size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Unanswered', value: stats.unanswered.toLocaleString(), icon: <MessageSquare size={16} />, color: '#f59e0b', bg: '#fef3c7' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Reviews & Ratings</h1>
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
                  {['all', 'replied', 'unanswered'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search reviews…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>Rating</th>
                      <th style={{ width: '25%' }}>Reviewer</th>
                      <th style={{ width: '25%' }}>Reviewed User</th>
                      <th style={{ width: '25%' }}>Comment</th>
                      <th style={{ width: '10%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 3 ? 180 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : reviews.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><Star /><h3>No reviews found</h3></div></td></tr>
                        : reviews.map(r => (
                          <tr key={r.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontWeight: 700 }}>
                                <Star size={14} fill="currentColor" /> {r.rating}/5
                              </div>
                            </td>
                            <td>
                              <Link href={`/users/${r.reviewer_id}`} style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                {r.reviewer?.display_name || 'Unknown'}
                              </Link>
                            </td>
                            <td>
                              <Link href={`/users/${r.reviewed_id}`} style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                                {r.reviewed?.display_name || 'Unknown'}
                              </Link>
                            </td>
                            <td>
                              <div style={{ fontSize: 13, color: 'var(--text-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {r.comment}
                              </div>
                            </td>
                            <td>
                              {r.reply ? (
                                <span className="badge badge-blue"><Reply size={12}/> Replied</span>
                              ) : (
                                <span className="badge badge-gray">No Reply</span>
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
