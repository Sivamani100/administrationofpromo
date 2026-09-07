'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, ToggleRight, ToggleLeft, Check, X, Shield } from 'lucide-react'

type Flag = {
  key: string
  description?: string
  enabled: boolean
  enabled_for_roles?: string[]
  enabled_for_user_ids?: string[]
  updated_at?: string
}

export default function FeatureFlagsPage() {
  const [flags, setFlags]     = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('feature_flags').select('*').order('key')
    if (data) setFlags(data as Flag[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = flags
    .filter(f => filter === 'all' ? true : filter === 'enabled' ? f.enabled : !f.enabled)
    .filter(f => !search || f.key.toLowerCase().includes(search.toLowerCase()) || (f.description || '').toLowerCase().includes(search.toLowerCase()))

  const enabledCount  = flags.filter(f => f.enabled).length
  const disabledCount = flags.filter(f => !f.enabled).length

  const STATS = [
    { label: 'Total Flags', value: flags.length,    color: '#6366f1', bg: '#ede9fe', icon: <ToggleRight size={16} /> },
    { label: 'Enabled',     value: enabledCount,    color: '#10b981', bg: '#d1fae5', icon: <Check size={16} /> },
    { label: 'Disabled',    value: disabledCount,   color: '#6b7280', bg: '#f3f4f6', icon: <X size={16} /> },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Feature Flags</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Toggle beta features and control rollout across the platform</p>
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
                <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', gap: 16 }}>
                  {['all', 'enabled', 'disabled'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`}
                      onClick={() => setFilter(t)}
                      style={{ padding: '8px 4px', fontSize: 14, borderBottomWidth: 3 }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search flags…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Key / Name</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '22%' }}>Role Overrides</th>
                      <th style={{ width: '15%' }}>User Overrides</th>
                      <th style={{ width: '20%' }}>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: j === 0 ? 160 : 80 }} /></td>)}</tr>
                        ))
                      : filtered.length === 0
                        ? <tr><td colSpan={5}><div className="empty-state"><ToggleRight /><h3>No feature flags found</h3></div></td></tr>
                        : filtered.map(f => (
                          <tr key={f.key}>
                            <td>
                              <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{f.key}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{f.description}</div>
                            </td>
                            <td>
                              {f.enabled
                                ? <span className="badge badge-green"><Check size={11} /> Enabled</span>
                                : <span className="badge badge-gray"><X size={11} /> Disabled</span>}
                            </td>
                            <td>
                              {f.enabled_for_roles && f.enabled_for_roles.length > 0
                                ? <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {f.enabled_for_roles.map(r => (
                                      <span key={r} style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <Shield size={10} /> {r}
                                      </span>
                                    ))}
                                  </div>
                                : <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>}
                            </td>
                            <td>
                              {f.enabled_for_user_ids && f.enabled_for_user_ids.length > 0
                                ? <span className="badge badge-blue">{f.enabled_for_user_ids.length} Users</span>
                                : <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>}
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                              {f.updated_at ? new Date(f.updated_at).toLocaleDateString() : '—'}
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
