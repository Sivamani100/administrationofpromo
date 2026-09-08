'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, EyeOff, CheckCircle, Eye, Megaphone, CheckCircle2, Clock, Ban, LayoutGrid, PauseCircle } from 'lucide-react'

type Campaign = {
  id: string
  title: string
  description: string
  status: string
  brand_id: string
  created_at: string
  updated_at?: string
  budget_range?: string
  category?: string
  cover_image_url?: string
  niche_tags?: string[]
  platform_requirements?: string[]
  deliverables?: string[]
  preferred_location?: string
  openings?: number
  min_followers?: number
  timeline?: string
  application_deadline?: string
  languages?: string[]
  profiles?: { display_name: string }
}

const PAGE_SIZE = 12

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [modal, setModal]         = useState<{ c: Campaign; action: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
    paused: 0
  })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Fetch Quick Stats
    const [allRes, activeRes, pendingRes, suspendedRes, pausedRes] = await Promise.all([
      sb.from('cards').select('*', { count: 'exact', head: true }),
      sb.from('cards').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('cards').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('cards').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
      sb.from('cards').select('*', { count: 'exact', head: true }).eq('status', 'paused')
    ])
    
    setStats({
      total: allRes.count || 0,
      active: activeRes.count || 0,
      pending: pendingRes.count || 0,
      suspended: suspendedRes.count || 0,
      paused: pausedRes.count || 0
    })

    // Fetch Table Data
    let q = sb.from('cards')
      .select('*, profiles:brand_id(display_name)', { count: 'exact' })
    if (search)               q = q.ilike('title', `%${search}%`)
    if (filter !== 'all')     q = q.eq('status', filter)
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { setCampaigns(data as Campaign[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [search, filter, page])

  useEffect(() => { load() }, [load])

  async function doAction(c: Campaign, action: string) {
    setActionLoading(true)
    const sb = createClient()
    if (action === 'suspend')   await sb.from('cards').update({ status: 'suspended' }).eq('id', c.id)
    if (action === 'reactivate') await sb.from('cards').update({ status: 'active' }).eq('id', c.id)
    await sb.from('audit_logs').insert({ action: `admin_${action}_campaign`, metadata: { campaign_id: c.id, title: c.title } })
    setModal(null)
    setActionLoading(false)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const statusBadge = (c: Campaign) =>
    c.status === 'suspended' ? <span className="badge badge-red">Suspended</span> :
    c.status === 'active'   ? <span className="badge badge-green">Active</span> :
    c.status === 'pending'  ? <span className="badge badge-yellow">Pending</span> :
    c.status === 'paused'   ? <span className="badge badge-gray">Paused</span> :
    c.status === 'draft'    ? <span className="badge badge-gray">Draft</span> :
                              <span className="badge badge-blue">{c.status}</span>

  const STATS = [
    { label: 'Total Campaigns', value: stats.total.toLocaleString(), icon: <Megaphone size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Active', value: stats.active.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Pending', value: stats.pending.toLocaleString(), icon: <Clock size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Paused', value: stats.paused.toLocaleString(), icon: <PauseCircle size={16} />, color: '#64748b', bg: '#f1f5f9' },
    { label: 'Suspended', value: stats.suspended.toLocaleString(), icon: <Ban size={16} />, color: '#ef4444', bg: '#fee2e2' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Campaigns</h1>
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
                  {['all', 'active', 'pending', 'paused', 'suspended'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search campaigns…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Campaign</th>
                      <th style={{ width: '20%' }}>Owner</th>
                      <th style={{ width: '15%' }}>Category</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '15%' }}>Created</th>
                      <th style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 0 ? 180 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : campaigns.length === 0
                        ? <tr><td colSpan={6}><div className="empty-state"><LayoutGrid /><h3>No campaigns found</h3></div></td></tr>
                        : campaigns.map(c => (
                          <tr key={c.id}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.title}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}
                                className="truncate" title={c.description}>
                                {c.description?.slice(0, 60)}{c.description?.length > 60 ? '…' : ''}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.profiles?.display_name || 'Anonymous'}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.brand_id?.slice(0,8)}...</div>
                            </td>
                            <td><span className="badge badge-blue">{c.category || 'General'}</span></td>
                            <td>{statusBadge(c)}</td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                              {new Date(c.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <div className="td-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setModal({ c, action: 'view' })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}>
                                  <Eye size={14} /> View
                                </button>
                                {c.status === 'suspended'
                                  ? <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}
                                      onClick={() => setModal({ c, action: 'reactivate' })}>
                                      <CheckCircle size={14} /> Reactivate
                                    </button>
                                  : <button className="btn" style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '6px 12px', fontSize: '12.5px', gap: '6px', borderRadius: '8px' }}
                                      onClick={() => setModal({ c, action: 'suspend' })}>
                                      <EyeOff size={14} /> Suspend
                                    </button>
                                }
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

          {modal && (
            <div className="modal-overlay" onClick={() => setModal(null)}>
              <div className={`modal ${modal.action === 'view' ? 'modal-lg' : ''}`} onClick={e => e.stopPropagation()} style={modal.action === 'view' ? { maxWidth: '600px', width: '90%' } : {}}>
                <div className="modal-header">
                  <span className="modal-title">
                    {modal.action === 'view' ? 'Campaign Details' : modal.action === 'suspend' ? 'Suspend Campaign' : 'Reactivate Campaign'}
                  </span>
                  <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                </div>
                <div className="modal-body" style={modal.action === 'view' ? { maxHeight: '70vh', overflowY: 'auto' } : {}}>
                  {modal.action === 'view' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {modal.c.cover_image_url && (
                        <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-3)' }}>
                          <img src={modal.c.cover_image_url} alt={modal.c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0' }}>{modal.c.title}</h2>
                        <span className="badge badge-blue">{modal.c.category || 'General'}</span>
                        {modal.c.status && <span style={{ marginLeft: '8px' }}>{statusBadge(modal.c)}</span>}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-2)' }}>Description</h3>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}>{modal.c.description}</p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--bg-2)', padding: '16px', borderRadius: '8px' }}>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Campaign ID</span>
                          <strong style={{ fontSize: '13px', wordBreak: 'break-all' }}>{modal.c.id}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Owner</span>
                          <strong style={{ fontSize: '13px' }}>{modal.c.profiles?.display_name || 'Anonymous'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Budget Range</span>
                          <strong style={{ fontSize: '13px' }}>{modal.c.budget_range || 'Negotiable'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Preferred Location</span>
                          <strong style={{ fontSize: '13px' }}>{modal.c.preferred_location || 'Anywhere'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Openings</span>
                          <strong style={{ fontSize: '13px' }}>{modal.c.openings || 'Not specified'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Min Followers</span>
                          <strong style={{ fontSize: '13px' }}>{modal.c.min_followers || '0'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Timeline</span>
                          <strong style={{ fontSize: '13px' }}>{modal.c.timeline || 'Not specified'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Application Deadline</span>
                          <strong style={{ fontSize: '13px' }}>
                            {modal.c.application_deadline ? new Date(modal.c.application_deadline).toLocaleDateString() : 'None'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Created At</span>
                          <strong style={{ fontSize: '13px' }}>{new Date(modal.c.created_at).toLocaleString()}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Updated At</span>
                          <strong style={{ fontSize: '13px' }}>
                            {modal.c.updated_at ? new Date(modal.c.updated_at).toLocaleString() : 'N/A'}
                          </strong>
                        </div>
                      </div>
                      {(modal.c.languages && modal.c.languages.length > 0) && (
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-2)' }}>Languages</h3>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {modal.c.languages.map(l => <span key={l} className="badge badge-gray">{l}</span>)}
                          </div>
                        </div>
                      )}
                      {(modal.c.platform_requirements && modal.c.platform_requirements.length > 0) && (
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-2)' }}>Platforms</h3>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {modal.c.platform_requirements.map(p => <span key={p} className="badge badge-gray">{p}</span>)}
                          </div>
                        </div>
                      )}
                      {(modal.c.deliverables && modal.c.deliverables.length > 0) && (
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-2)' }}>Deliverables</h3>
                          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--text-1)' }}>
                            {modal.c.deliverables.map(d => <li key={d}>{d}</li>)}
                          </ul>
                        </div>
                      )}
                      {(modal.c.niche_tags && modal.c.niche_tags.length > 0) && (
                        <div>
                          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-2)' }}>Tags</h3>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {modal.c.niche_tags.map(t => <span key={t} className="badge badge-gray">{t}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>Confirm <strong>{modal.action}</strong> for: <strong>{modal.c.title}</strong>?</>
                  )}
                </div>
                <div className="modal-footer">
                  {modal.action === 'view' ? (
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>
                  ) : (
                    <>
                      <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                      <button
                        className={`btn ${modal.action === 'suspend' ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => doAction(modal.c, modal.action)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <span className="spinner" /> : `Confirm`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
