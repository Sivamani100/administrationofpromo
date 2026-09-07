'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Globe, Eye, User, Link as LinkIcon, FileText, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

type PromoPage = {
  id: string
  username: string
  user_id: string
  theme: string
  view_count: number
  is_published: boolean
  created_at: string
  user?: { display_name: string }
}

const PAGE_SIZE = 12

export default function PromoPagesPage() {
  const [pages, setPages]           = useState<PromoPage[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)

  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    totalViews: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Quick Stats
    const [allRes, pubRes, draftRes, viewRes] = await Promise.all([
      sb.from('promo_pages').select('*', { count: 'exact', head: true }),
      sb.from('promo_pages').select('*', { count: 'exact', head: true }).eq('is_published', true),
      sb.from('promo_pages').select('*', { count: 'exact', head: true }).eq('is_published', false),
      sb.from('promo_pages').select('view_count')
    ])
    
    const views = viewRes.data?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0;

    setStats({
      total: allRes.count || 0,
      published: pubRes.count || 0,
      draft: draftRes.count || 0,
      totalViews: views
    })

    let q = sb.from('promo_pages')
      .select('*, user:profiles!promo_pages_user_id_fkey(display_name)', { count: 'exact' })
      
    if (filter === 'published') q = q.eq('is_published', true)
    if (filter === 'draft') q = q.eq('is_published', false)
    if (search) q = q.ilike('username', `%${search}%`)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { 
      setPages(data as PromoPage[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filter, page, search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Promo Pages', value: stats.total.toLocaleString(), icon: <Globe size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Published', value: stats.published.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Drafts', value: stats.draft.toLocaleString(), icon: <FileText size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: <Eye size={16} />, color: '#8b5cf6', bg: '#ede9fe' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Promo Pages</h1>
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
                  {['all', 'published', 'draft'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search usernames…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Username</th>
                      <th style={{ width: '25%' }}>Owner</th>
                      <th style={{ width: '15%' }}>Theme</th>
                      <th style={{ width: '10%' }}>Views</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 0 ? 140 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : pages.length === 0
                        ? <tr><td colSpan={6}><div className="empty-state"><Globe /><h3>No promo pages found</h3></div></td></tr>
                        : pages.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                                @{p.username}
                              </div>
                            </td>
                            <td>
                              <Link href={`/users/${p.user_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} /> {p.user?.display_name || 'Anonymous'}
                              </Link>
                            </td>
                            <td style={{ textTransform: 'capitalize', color: 'var(--text-2)' }}>{p.theme || 'Dark'}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--text-1)' }}>
                                <Eye size={14} style={{ color: 'var(--text-3)' }}/> {p.view_count.toLocaleString()}
                              </div>
                            </td>
                            <td>
                              {p.is_published ? (
                                <span className="badge badge-green">Published</span>
                              ) : (
                                <span className="badge badge-gray">Draft</span>
                              )}
                            </td>
                            <td>
                              <a href={`https://promo.app/${p.username}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}>
                                <LinkIcon size={12} /> Visit
                              </a>
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
