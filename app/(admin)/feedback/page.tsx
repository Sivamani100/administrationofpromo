'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, MessageSquare, Bug, Lightbulb, Star } from 'lucide-react'

type FeedbackItem = {
  id: string
  created_at: string
  score?: number
  type?: string
  comment?: string
  // Bug fields
  title?: string
  screen_or_feature?: string
  device_type?: string
  severity?: string
  submitter_name?: string
  submitter_email?: string
  // Idea fields
  problem_it_solves?: string
}

const PAGE_SIZE = 12

export default function FeedbackPage() {
  const [tab, setTab]             = useState<'feedback' | 'bugs' | 'ideas'>('bugs')
  const [items, setItems]         = useState<FeedbackItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)

  const [stats, setStats] = useState({ feedback: 0, bugs: 0, ideas: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()

    const [fbRes, bugRes, ideaRes] = await Promise.all([
      sb.from('feedback').select('*', { count: 'exact', head: true }),
      sb.from('bug_reports').select('*', { count: 'exact', head: true }),
      sb.from('idea_submissions').select('*', { count: 'exact', head: true }),
    ])
    setStats({ feedback: fbRes.count || 0, bugs: bugRes.count || 0, ideas: ideaRes.count || 0 })

    const table = tab === 'feedback' ? 'feedback' : tab === 'bugs' ? 'bug_reports' : 'idea_submissions'
    const searchCol = tab === 'bugs' ? 'title' : tab === 'ideas' ? 'title' : 'comment'

    let q = (sb.from(table) as any).select('*', { count: 'exact' })
    if (search) q = q.ilike(searchCol, `%${search}%`)
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    const { data, count } = await q
    if (data) { setItems(data as FeedbackItem[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [tab, page, search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'General Feedback', value: stats.feedback.toLocaleString(), icon: <MessageSquare size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Bug Reports',      value: stats.bugs.toLocaleString(),     icon: <Bug size={16} />,           color: '#ef4444', bg: '#fee2e2' },
    { label: 'Idea Submissions', value: stats.ideas.toLocaleString(),    icon: <Lightbulb size={16} />,     color: '#f59e0b', bg: '#fef3c7' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Feedback & Ideas</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', marginRight: '8px' }}>Live Overview</span>
            <button onClick={load} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>

          {/* Stats */}
          <div style={{ marginBottom: '24px' }}>
            <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${STATS.length}, 1fr)` }}>
              {STATS.map((s, i) => (
                <div key={i} style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600 }}>{s.label}</div>
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
                  {(['bugs', 'ideas', 'feedback'] as const).map(t => (
                    <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); setPage(1) }} style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t === 'bugs' ? 'Bug Reports' : t === 'ideas' ? 'Ideas' : 'General Feedback'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder={`Search ${tab}…`} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '300px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      {tab === 'bugs' && <>
                        <th style={{ width: '15%' }}>Date</th>
                        <th style={{ width: '30%' }}>Title</th>
                        <th style={{ width: '20%' }}>Device / Screen</th>
                        <th style={{ width: '15%' }}>Severity</th>
                        <th style={{ width: '20%' }}>Submitter</th>
                      </>}
                      {tab === 'ideas' && <>
                        <th style={{ width: '15%' }}>Date</th>
                        <th style={{ width: '30%' }}>Title</th>
                        <th style={{ width: '35%' }}>Problem Solved</th>
                        <th style={{ width: '20%' }}>Submitter</th>
                      </>}
                      {tab === 'feedback' && <>
                        <th style={{ width: '15%' }}>Date</th>
                        <th style={{ width: '15%' }}>Score</th>
                        <th style={{ width: '15%' }}>Type</th>
                        <th style={{ width: '55%' }}>Comment</th>
                      </>}
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>{Array.from({ length: tab === 'feedback' ? 4 : 5 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: j === 1 ? 180 : 80 }} /></td>)}</tr>
                        ))
                      : items.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><MessageSquare /><h3>No {tab} found</h3></div></td></tr>
                        : items.map(item => (
                          <tr key={item.id}>
                            <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{new Date(item.created_at).toLocaleDateString()}</td>
                            {tab === 'bugs' && <>
                              <td style={{ fontWeight: 600 }}>{item.title}</td>
                              <td>
                                <div style={{ fontSize: 13 }}>{item.screen_or_feature}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.device_type}</div>
                              </td>
                              <td>
                                {item.severity === 'high' || item.severity === 'critical'
                                  ? <span className="badge badge-red">{item.severity}</span>
                                  : <span className="badge badge-gray">{item.severity}</span>}
                              </td>
                              <td>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.submitter_name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.submitter_email}</div>
                              </td>
                            </>}
                            {tab === 'ideas' && <>
                              <td style={{ fontWeight: 600 }}>{item.title}</td>
                              <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.problem_it_solves}</td>
                              <td>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.submitter_name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.submitter_email}</div>
                              </td>
                            </>}
                            {tab === 'feedback' && <>
                              <td>
                                {item.score ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                                    <Star size={14} fill="currentColor" color="#f59e0b" /> {item.score}/10
                                  </div>
                                ) : '—'}
                              </td>
                              <td style={{ textTransform: 'capitalize' }}><span className="badge badge-blue">{item.type || '—'}</span></td>
                              <td style={{ fontSize: 13 }}>{item.comment || '—'}</td>
                            </>}
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
