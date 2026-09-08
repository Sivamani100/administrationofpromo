'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { RefreshCw, MessageSquare, AlertOctagon, AlertTriangle, CheckCircle2, Archive, Search, MoreVertical, Eye } from 'lucide-react'
import { resolveDispute, closeDispute } from '@/app/actions/admin'
import { ConfirmModal } from '@/components/ui/Modal'
import Dropdown from '@/components/ui/Dropdown'
import Tooltip from '@/components/ui/Tooltip'
import { useToast } from '@/components/ui/Toast'
import Sheet from '@/components/ui/Sheet'

type Dispute = {
  id: string
  agreement_id?: string
  status: string
  category: string
  description: string
  created_at: string
  requester?: { display_name: string }
}

const PAGE_SIZE = 12

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('open')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)

  // New: use global ConfirmModal + Toast
  const [confirm, setConfirm] = useState<{ d: Dispute; action: 'resolve' | 'close' } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [detailSheet, setDetailSheet] = useState<Dispute | null>(null)
  const { success, error: toastError } = useToast()

  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, closed: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const [allRes, openRes, resolvedRes, closedRes] = await Promise.all([
      sb.from('disputes').select('*', { count: 'exact', head: true }),
      sb.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      sb.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      sb.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
    ])
    setStats({ total: allRes.count || 0, open: openRes.count || 0, resolved: resolvedRes.count || 0, closed: closedRes.count || 0 })

    let q = sb.from('disputes').select('*, requester:raised_by(display_name)', { count: 'exact' })
    if (filter !== 'all') q = q.eq('status', filter)
    q = q.order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    const { data, count } = await q
    if (data) { setDisputes(data as Dispute[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  async function doAction() {
    if (!confirm) return
    setActionLoading(true)
    try {
      if (confirm.action === 'resolve') await resolveDispute(confirm.d.id)
      if (confirm.action === 'close')   await closeDispute(confirm.d.id)
      success(
        confirm.action === 'resolve' ? 'Dispute resolved' : 'Dispute closed',
        `For ${confirm.d.requester?.display_name || 'user'}`
      )
    } catch {
      toastError('Action failed', 'Please try again.')
    }
    setConfirm(null)
    setActionLoading(false)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Disputes', value: stats.total.toLocaleString(), icon: <AlertOctagon size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Open',     value: stats.open.toLocaleString(),     icon: <AlertTriangle size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Resolved', value: stats.resolved.toLocaleString(), icon: <CheckCircle2 size={16} />,  color: '#10b981', bg: '#d1fae5' },
    { label: 'Closed',   value: stats.closed.toLocaleString(),   icon: <Archive size={16} />,       color: '#8b5cf6', bg: '#ede9fe' },
  ]

  return (
    <div className="page-wrap">
      <div className="dashboard-card-wrap" style={{ padding: 0 }}>

        {/* Header */}
        <div className="dashboard-header">
          <h1>Disputes</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Live Overview</span>
            <Tooltip content="Refresh data" side="bottom">
              <button onClick={load} className="btn btn-secondary btn-sm">
                <RefreshCw size={13} /> Refresh
              </button>
            </Tooltip>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* Stats */}
          <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${STATS.length}, 1fr)`, marginBottom: 24 }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{s.label}</div>
                </div>
                {loading ? <div className="skeleton" style={{ height: 26, width: 80 }} /> : <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{s.value}</div>}
              </div>
            ))}
          </div>

          <div className="table-wrap">
            {/* Toolbar */}
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', gap: 16 }}>
                  {['all', 'open', 'resolved', 'closed'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => { setFilter(t); setPage(1) }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={15} />
                  <input placeholder="Search disputes…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: 280 }} />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Requester</th>
                    <th style={{ width: '15%' }}>Agreement</th>
                    <th style={{ width: '28%' }}>Category / Description</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '13%' }}>Date</th>
                    <th style={{ width: '12%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: j === 2 ? 140 : 80 }} /></td>)}</tr>
                      ))
                    : disputes.length === 0
                      ? <tr><td colSpan={6}><div className="empty-state"><MessageSquare /><h3>No disputes found</h3></div></td></tr>
                      : disputes.map(d => (
                          <tr key={d.id}>
                            <td><div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.requester?.display_name || 'Anonymous'}</div></td>
                            <td style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'monospace' }}>{d.agreement_id?.slice(0, 8) || '—'}…</td>
                            <td style={{ maxWidth: 220 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{d.category}</div>
                              <div className="truncate" style={{ fontSize: 12, color: 'var(--text-3)' }} title={d.description}>{d.description}</div>
                            </td>
                            <td>
                              <span className={`badge ${d.status === 'open' ? 'badge-yellow' : d.status === 'resolved' ? 'badge-green' : 'badge-gray'}`}>
                                {d.status}
                              </span>
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {/* View Details → Sheet */}
                                <Tooltip content="View details" side="top">
                                  <button className="btn btn-secondary btn-xs" onClick={() => setDetailSheet(d)}>
                                    <Eye size={13} />
                                  </button>
                                </Tooltip>

                                {/* Actions Dropdown (only for open) */}
                                {d.status === 'open' && (
                                  <Dropdown
                                    align="right"
                                    trigger={
                                      <button className="btn btn-secondary btn-xs"><MoreVertical size={13} /></button>
                                    }
                                    items={[
                                      { label: 'Mark Resolved', icon: <CheckCircle2 size={14} />, variant: 'success', onClick: () => setConfirm({ d, action: 'resolve' }) },
                                      { label: 'Close Dispute', icon: <Archive size={14} />, onClick: () => setConfirm({ d, action: 'close' }) },
                                    ]}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                  }
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <span className="pagination-info">
                {total > 0 ? `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : '0 of 0'}
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

      {/* ── Global ConfirmModal (replaces old inline modal) ── */}
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doAction}
        loading={actionLoading}
        title={confirm?.action === 'resolve' ? 'Resolve Dispute' : 'Close Dispute'}
        message={`Are you sure you want to ${confirm?.action} this dispute raised by ${confirm?.d.requester?.display_name || 'this user'}?`}
        confirmLabel={confirm?.action === 'resolve' ? 'Resolve' : 'Close'}
        destructive={confirm?.action === 'close'}
        icon={confirm?.action === 'resolve' ? <CheckCircle2 size={18} /> : <Archive size={18} />}
      />

      {/* ── Detail Sheet ── */}
      <Sheet
        open={!!detailSheet}
        onClose={() => setDetailSheet(null)}
        title="Dispute Details"
        subtitle={detailSheet?.category}
        footer={
          detailSheet?.status === 'open' ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailSheet(null)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: '#10b981', color: '#fff', border: 'none' }}
                onClick={() => { setConfirm({ d: detailSheet!, action: 'resolve' }); setDetailSheet(null) }}>
                <CheckCircle2 size={14} /> Resolve
              </button>
              <button className="btn btn-secondary btn-sm"
                onClick={() => { setConfirm({ d: detailSheet!, action: 'close' }); setDetailSheet(null) }}>
                <Archive size={14} /> Close
              </button>
            </div>
          ) : undefined
        }
      >
        {detailSheet && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className={`badge ${detailSheet.status === 'open' ? 'badge-yellow' : detailSheet.status === 'resolved' ? 'badge-green' : 'badge-gray'}`}>
                {detailSheet.status}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>Requester</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{detailSheet.requester?.display_name || 'Anonymous'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>Agreement ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>{detailSheet.agreement_id || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>Category</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{detailSheet.category}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg-3)', padding: '12px 14px', borderRadius: 10 }}>{detailSheet.description}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>Filed On</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-2)' }}>{new Date(detailSheet.created_at).toLocaleString()}</div>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
