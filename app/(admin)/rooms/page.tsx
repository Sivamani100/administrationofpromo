'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, MessageCircle, User, Briefcase, Calendar, Ban, CheckCircle2, MessageSquare, AlertCircle, Eye } from 'lucide-react'
import ChatViewModal from '@/components/admin/ChatViewModal'

type Room = {
  id: string
  created_at: string
  is_active: boolean
  brand_id: string
  influencer_id: string
  card_id?: string
  brand?: { display_name: string }
  influencer?: { display_name: string }
  card?: { title: string }
}

const PAGE_SIZE = 12

export default function RoomsPage() {
  const [rooms, setRooms]         = useState<Room[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter]       = useState('all') // all, active, closed
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
    suspended: 0
  })

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset page on new search
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const load = useCallback(async (abortSignal?: AbortSignal) => {
    setLoading(true)
    const sb = createClient()
    
    // Fetch Quick Stats in parallel
    const [allRes, activeRes, closedRes] = await Promise.all([
      sb.from('rooms').select('*', { count: 'exact', head: true }),
      sb.from('rooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('rooms').select('*', { count: 'exact', head: true }).eq('is_active', false)
    ])
    
    if (abortSignal?.aborted) return

    setStats({
      total: allRes.count || 0,
      active: activeRes.count || 0,
      closed: closedRes.count || 0,
      suspended: 0
    })

    // Fetch Table Data using the admin_rooms_view for server-side search
    let q = sb.from('admin_rooms_view').select('*', { count: 'exact' })
    
    if (filter === 'active') q = q.eq('is_active', true)
    if (filter === 'closed') q = q.eq('is_active', false)
    
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase()
      q = q.or(`brand_name.ilike.%${s}%,influencer_name.ilike.%${s}%,card_title.ilike.%${s}%`)
    }

    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (abortSignal?.aborted) return

    if (data) {
      // Map the view back to the expected nested structure for the UI
      const mapped = data.map(r => ({
        id: r.id,
        created_at: r.created_at,
        is_active: r.is_active,
        brand_id: r.brand_id,
        influencer_id: r.influencer_id,
        card_id: r.card_id,
        brand: { display_name: r.brand_name },
        influencer: { display_name: r.influencer_name },
        card: r.card_title ? { title: r.card_title } : undefined
      })) as Room[]
      setRooms(mapped)
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [debouncedSearch, filter, page])

  useEffect(() => { 
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Rooms', value: stats.total.toLocaleString(), icon: <MessageSquare size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Active', value: stats.active.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Closed', value: stats.closed.toLocaleString(), icon: <Ban size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Suspended', value: stats.suspended.toLocaleString(), icon: <AlertCircle size={16} />, color: '#ef4444', bg: '#fee2e2' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Chat Rooms</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="header-live-text" style={{ fontSize: '12px', color: 'var(--text-3)', marginRight: '8px' }}>Live Overview</span>
            <button onClick={() => load()} className="btn btn-secondary header-btn" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}>
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
                  {['all', 'active', 'closed'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search rooms…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

        <div style={{ overflowX: 'auto' }}>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Created</th>
                  <th style={{ width: '30%' }}>Campaign</th>
                  <th style={{ width: '20%' }}>Brand</th>
                  <th style={{ width: '20%' }}>Influencer</th>
                  <th style={{ width: '15%' }}>Status</th>
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
                  : rooms.length === 0
                    ? <tr><td colSpan={6}><div className="empty-state"><MessageCircle /><h3>No chat rooms found</h3></div></td></tr>
                    : rooms.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          {r.card ? (
                            <Link href={`/campaigns/${r.card_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Briefcase size={14} /> {r.card.title.slice(0,40)}{r.card.title.length > 40 ? '...' : ''}
                            </Link>
                          ) : (
                            <span style={{ color: 'var(--text-3)' }}>No Campaign</span>
                          )}
                        </td>
                        <td>
                          <Link href={`/users/${r.brand_id}`} style={{ fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <User size={14} /> {r.brand?.display_name || 'Unknown'}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/users/${r.influencer_id}`} style={{ fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <User size={14} /> {r.influencer?.display_name || 'Unknown'}
                          </Link>
                        </td>
                        <td>
                          {r.is_active ? (
                            <span className="badge badge-green">Active</span>
                          ) : (
                            <span className="badge badge-gray">Closed</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}
                            onClick={() => setSelectedRoom(r)}
                          >
                            <Eye size={14} /> View Chat
                          </button>
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

      {selectedRoom && (
        <ChatViewModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />
      )}
    </div>
  )
}