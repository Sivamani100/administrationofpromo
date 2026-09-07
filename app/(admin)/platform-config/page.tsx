'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Database, Sliders } from 'lucide-react'

type ConfigRow = {
  key: string
  value: any
  description?: string
  updated_at?: string
}

export default function PlatformConfigPage() {
  const [config, setConfig]   = useState<ConfigRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    let q = sb.from('platform_config').select('*').order('key')
    const { data } = await q
    if (data) setConfig(data as ConfigRow[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = config.filter(c =>
    !search || c.key.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const STATS = [
    { label: 'Total Keys',    value: config.length,                                             color: '#6366f1', bg: '#ede9fe' },
    { label: 'Updated Today', value: config.filter(c => c.updated_at && new Date(c.updated_at).toDateString() === new Date().toDateString()).length, color: '#10b981', bg: '#d1fae5' },
  ]

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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Platform Config</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Global key-value settings for the application</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Live Overview</span>
            <button onClick={load} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13, gap: 6, borderRadius: 8 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: 24 }}>
            <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${STATS.length}, 1fr)` }}>
              {STATS.map((s, i) => (
                <div key={i} style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sliders size={16} />
                    </div>
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
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Configuration Store</h3>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search keys…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Key</th>
                      <th style={{ width: '35%' }}>Value</th>
                      <th style={{ width: '25%' }}>Description</th>
                      <th style={{ width: '15%' }}>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: j === 1 ? 200 : 120 }} /></td>)}</tr>
                        ))
                      : filtered.length === 0
                        ? <tr><td colSpan={4}><div className="empty-state"><Database /><h3>No config values found</h3></div></td></tr>
                        : filtered.map(c => (
                          <tr key={c.key}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: 'var(--primary)' }}>{c.key}</td>
                            <td>
                              <div style={{ background: 'var(--bg-3)', padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value)}
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{c.description || '—'}</td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                              {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}
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
