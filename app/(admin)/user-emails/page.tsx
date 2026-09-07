'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw, Download, Users, Tag, Mail, CheckCircle2, Copy } from 'lucide-react'
import { getUserEmails } from '@/app/actions/admin'

type UserEmail = {
  id: string
  email: string
  display_name: string
  role: string
  is_verified: boolean
  account_status: string
  created_at: string
}

const PAGE_SIZE = 50

export default function UserEmailsPage() {
  const [users, setUsers]     = useState<UserEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)
  const [copied, setCopied]   = useState(false)

  // Derived stats from full load
  const [stats, setStats] = useState({ total: 0, brands: 0, influencers: 0, verified: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getUserEmails(filter, search, page, PAGE_SIZE)
      setUsers(result.users)
      setTotal(result.total)

      // Load all-filter totals for stats (only when no filter/search active)
      if (filter === 'all' && !search) {
        const [allRes, brandRes, infRes, verRes] = await Promise.all([
          getUserEmails('all', '', 1, 1),
          getUserEmails('brand', '', 1, 1),
          getUserEmails('influencer', '', 1, 1),
          getUserEmails('verified', '', 1, 1),
        ])
        setStats({
          total: allRes.total,
          brands: brandRes.total,
          influencers: infRes.total,
          verified: verRes.total,
        })
      }
    } catch (e) {
      console.error('Failed to load user emails', e)
    }
    setLoading(false)
  }, [filter, search, page])

  useEffect(() => { load() }, [load])

  // Download ALL matching emails as CSV (no pagination limit)
  async function downloadCSV() {
    setLoading(true)
    try {
      const result = await getUserEmails(filter, search, 1, 999999)
      const headers = ['Name', 'Email', 'Role', 'Verified', 'Status', 'Joined']
      const rows = result.users.map((u: UserEmail) => [
        u.display_name || '',
        u.email,
        u.role || '',
        u.is_verified ? 'Yes' : 'No',
        u.account_status || '',
        new Date(u.created_at).toLocaleDateString()
      ])
      const csv = [headers, ...rows]
        .map(r => r.map((v: string) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `user-emails-${filter}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('CSV download failed', e)
    }
    setLoading(false)
  }

  // Copy all visible page emails to clipboard
  async function copyEmails() {
    const emailList = users.map(u => u.email).join('\n')
    await navigator.clipboard.writeText(emailList)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Emails',  value: stats.total.toLocaleString(),      icon: <Mail size={16} />,         color: '#6366f1', bg: '#ede9fe' },
    { label: 'Brands',        value: stats.brands.toLocaleString(),      icon: <Tag size={16} />,          color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Influencers',   value: stats.influencers.toLocaleString(), icon: <Users size={16} />,        color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Verified',      value: stats.verified.toLocaleString(),    icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
  ]

  return (
    <div className="page-wrap">
      <div className="dashboard-card-wrap" style={{ padding: 0 }}>

        {/* Sticky Header */}
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>User Emails</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Browse and export all registered user emails</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Live Overview</span>
            <button onClick={load} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={copyEmails} className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '13px', gap: '6px', borderRadius: '8px', color: copied ? 'var(--green)' : undefined }}>
              {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy Page</>}
            </button>
            <button onClick={downloadCSV} className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }} disabled={loading}>
              <Download size={14} /> Download CSV
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
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                  </div>
                  <div>{loading ? <div className="skeleton" style={{ height: 26, width: 80 }} /> : <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{s.value}</div>}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', gap: '16px' }}>
                  {[
                    { key: 'all',        label: 'All Users' },
                    { key: 'brand',      label: 'Brands' },
                    { key: 'influencer', label: 'Influencers' },
                    { key: 'verified',   label: 'Verified' },
                  ].map(t => (
                    <button key={t.key} className={`tab-btn${filter === t.key ? ' active' : ''}`}
                      onClick={() => { setFilter(t.key); setPage(1) }}
                      style={{ padding: '8px 4px', fontSize: '14px', borderBottomWidth: '3px' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search by name or email…" value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                    style={{ width: '300px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Name</th>
                      <th style={{ width: '35%' }}>Email</th>
                      <th style={{ width: '15%' }}>Role</th>
                      <th style={{ width: '10%' }}>Verified</th>
                      <th style={{ width: '15%' }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: j === 1 ? 200 : 100 }} /></td>)}</tr>
                        ))
                      : users.length === 0
                        ? <tr><td colSpan={5}>
                            <div className="empty-state">
                              <Mail />
                              <h3>No users found</h3>
                              <p>Try adjusting the filter or search.</p>
                            </div>
                          </td></tr>
                        : users.map(u => (
                          <tr key={u.id}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.display_name || '—'}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'monospace' }}>{u.id.slice(0, 8)}…</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Mail size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                                <a href={`mailto:${u.email}`} style={{ color: 'var(--primary)', fontWeight: 500, fontSize: 13 }}>
                                  {u.email}
                                </a>
                              </div>
                            </td>
                            <td>
                              {u.role === 'brand'
                                ? <span className="badge badge-blue">Brand</span>
                                : u.role === 'influencer'
                                  ? <span className="badge" style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: '6px', padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>Influencer</span>
                                  : <span className="badge badge-gray">{u.role || 'User'}</span>
                              }
                            </td>
                            <td>
                              {u.is_verified
                                ? <span className="badge badge-green"><CheckCircle2 size={11} /> Yes</span>
                                : <span className="badge badge-gray">No</span>}
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer with info + pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Showing {total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of <strong>{total}</strong> · <em>Download CSV exports all records</em>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
    </div>
  )
}
