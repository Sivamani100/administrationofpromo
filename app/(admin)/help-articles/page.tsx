'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, BookOpen, Plus, Edit2, Trash2, CheckCircle2, FileText } from 'lucide-react'

type Article = {
  id: string
  title: string
  content: string
  category: string
  published: boolean
  created_at: string
}

const CATEGORIES = ['general', 'account', 'campaigns', 'payments', 'safety', 'technical']
const PAGE_SIZE = 12

export default function HelpArticlesPage() {
  const [articles, setArticles]   = useState<Article[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [modal, setModal]         = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing]     = useState<Article | null>(null)
  const [form, setForm]           = useState({ title: '', content: '', category: 'general', published: true })
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)

  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()

    const [allRes, pubRes, draftRes] = await Promise.all([
      sb.from('help_articles').select('*', { count: 'exact', head: true }),
      sb.from('help_articles').select('*', { count: 'exact', head: true }).eq('published', true),
      sb.from('help_articles').select('*', { count: 'exact', head: true }).eq('published', false),
    ])
    setStats({ total: allRes.count || 0, published: pubRes.count || 0, draft: draftRes.count || 0 })

    let q = sb.from('help_articles').select('*', { count: 'exact' })
    if (filter === 'published') q = q.eq('published', true)
    if (filter === 'draft') q = q.eq('published', false)
    if (search) q = q.ilike('title', `%${search}%`)
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    const { data, count } = await q
    if (data) { setArticles(data as Article[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [filter, search, page])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm({ title: '', content: '', category: 'general', published: true })
    setEditing(null); setModal('create')
  }
  function openEdit(a: Article) {
    setForm({ title: a.title, content: a.content, category: a.category, published: a.published })
    setEditing(a); setModal('edit')
  }
  async function handleSave() {
    setSaving(true)
    const sb = createClient()
    if (modal === 'create') await sb.from('help_articles').insert(form)
    else if (editing) await sb.from('help_articles').update(form).eq('id', editing.id)
    setModal(null); setSaving(false); load()
  }
  async function handleDelete(id: string) {
    await createClient().from('help_articles').delete().eq('id', id)
    setDeleteId(null); load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Articles', value: stats.total.toLocaleString(),     icon: <BookOpen size={16} />,     color: '#6366f1', bg: '#ede9fe' },
    { label: 'Published',      value: stats.published.toLocaleString(), icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Drafts',         value: stats.draft.toLocaleString(),     icon: <FileText size={16} />,     color: '#f59e0b', bg: '#fef3c7' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Help Articles</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', marginRight: '8px' }}>Live Overview</span>
            <button onClick={load} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={openCreate} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}>
              <Plus size={14} /> New Article
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
                  <input placeholder="Search articles…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '300px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Title</th>
                      <th style={{ width: '15%' }}>Category</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '15%' }}>Created</th>
                      <th style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>{[200, 80, 70, 90, 100].map((w, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: w }} /></td>)}</tr>
                        ))
                      : articles.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><BookOpen /><h3>No articles found</h3></div></td></tr>
                        : articles.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 600 }}>{a.title}</td>
                            <td><span className="badge badge-blue">{a.category}</span></td>
                            <td><span className={`badge ${a.published ? 'badge-green' : 'badge-gray'}`}>{a.published ? 'Published' : 'Draft'}</span></td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                            <td>
                              <div className="td-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px' }} onClick={() => openEdit(a)}>
                                  <Edit2 size={12} /> Edit
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px', color: 'var(--red)' }} onClick={() => setDeleteId(a.id)}>
                                  <Trash2 size={12} />
                                </button>
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

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'create' ? 'New Article' : 'Edit Article'}</span>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Article title" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea className="form-textarea" rows={8} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write article content…" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label className="toggle">
                  <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>Publish immediately</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Delete Article</span>
              <button className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <div className="modal-body">Are you sure you want to delete this article? This cannot be undone.</div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
