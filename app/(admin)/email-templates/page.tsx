'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, FileCode, Mail, Variable, User } from 'lucide-react'

type Template = {
  id: string
  name: string
  subject: string
  variables?: string[]
  updated_at?: string
  updater?: { display_name: string }
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('email_templates')
      .select('*, updater:profiles!email_templates_updated_by_fkey(id, display_name)')
      .order('name')
    if (data) setTemplates(data as Template[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = templates.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-wrap">
      <div className="dashboard-card-wrap" style={{ padding: 0 }}>

        <div className="dashboard-header" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg-2)', padding: '20px 24px 16px 24px',
          borderBottom: '1px solid var(--border)',
          borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
          flexWrap: 'wrap', gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Email Templates</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Manage system and transactional email templates</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Live Overview</span>
            <button onClick={load} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13, gap: 6, borderRadius: 8 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>

          {/* Stats */}
          <div style={{ marginBottom: 24 }}>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {[
                { label: 'Total Templates', value: templates.length, icon: <FileCode size={16} />, color: '#6366f1', bg: '#ede9fe' },
                { label: 'With Variables',  value: templates.filter(t => t.variables && t.variables.length > 0).length, icon: <Variable size={16} />, color: '#f59e0b', bg: '#fef3c7' },
              ].map((s, i) => (
                <div key={i} style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                    {loading ? <div className="skeleton" style={{ height: 26, width: 60 }} /> : s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>All Templates</h3>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Name</th>
                      <th style={{ width: '28%' }}>Subject</th>
                      <th style={{ width: '25%' }}>Variables</th>
                      <th style={{ width: '13%' }}>Last Updated</th>
                      <th style={{ width: '12%' }}>Updated By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: j === 1 ? 200 : 100 }} /></td>)}</tr>
                        ))
                      : filtered.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><FileCode /><h3>No email templates found</h3></div></td></tr>
                        : filtered.map(t => (
                          <tr key={t.id}>
                            <td>
                              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Mail size={13} color="var(--primary)" /> {t.name}
                              </div>
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{t.subject}</td>
                            <td>
                              {t.variables && t.variables.length > 0
                                ? <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {t.variables.map(v => (
                                      <span key={v} className="badge badge-gray" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <Variable size={9} /> {v}
                                      </span>
                                    ))}
                                  </div>
                                : <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>}
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                              {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '—'}
                            </td>
                            <td>
                              {t.updater
                                ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                                    <User size={12} /> {t.updater.display_name}
                                  </div>
                                : <span style={{ color: 'var(--text-3)' }}>—</span>}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
