'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, DollarSign, Clock, CheckCircle2, User, TrendingUp, XCircle } from 'lucide-react'
import Link from 'next/link'

type Payment = {
  id: string
  created_at: string
  amount: number
  currency: string
  payment_method?: string
  status: string
  brand_id?: string
  influencer_id?: string
  brand?: { id: string; display_name: string }
  influencer?: { id: string; display_name: string }
}

const PAGE_SIZE = 15

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)

  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, volume: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()

    const [allRes, completedRes, pendingRes, volRes] = await Promise.all([
      sb.from('payment_records').select('*', { count: 'exact', head: true }),
      sb.from('payment_records').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      sb.from('payment_records').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('payment_records').select('amount').eq('status', 'completed'),
    ])

    const totalVolume = volRes.data ? volRes.data.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) : 0

    setStats({
      total: allRes.count || 0,
      completed: completedRes.count || 0,
      pending: pendingRes.count || 0,
      volume: totalVolume,
    })

    let q = sb.from('payment_records').select(`
      *,
      brand:profiles!payment_records_brand_id_fkey(id, display_name),
      influencer:profiles!payment_records_influencer_id_fkey(id, display_name)
    `, { count: 'exact' })

    if (filter !== 'all') q = q.eq('status', filter)

    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    const { data, count } = await q
    if (data) { setPayments(data as Payment[]); setTotal(count ?? 0) }
    setLoading(false)
  }, [filter, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total Transactions', value: stats.total.toLocaleString(),                        icon: <DollarSign size={16} />,  color: '#6366f1', bg: '#ede9fe' },
    { label: 'Completed',          value: stats.completed.toLocaleString(),                    icon: <CheckCircle2 size={16} />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Pending',            value: stats.pending.toLocaleString(),                      icon: <Clock size={16} />,        color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Total Volume',       value: `$${stats.volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <TrendingUp size={16} />, color: '#3b82f6', bg: '#dbeafe' },
  ]

  function statusBadge(status: string) {
    switch (status) {
      case 'completed': return <span className="badge badge-green"><CheckCircle2 size={11} /> Completed</span>
      case 'pending':   return <span className="badge badge-yellow"><Clock size={11} /> Pending</span>
      case 'failed':    return <span className="badge badge-red"><XCircle size={11} /> Failed</span>
      default:          return <span className="badge badge-gray">{status}</span>
    }
  }

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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Payment Records</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Monitor collaboration payments between brands and influencers</p>
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
            <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${STATS.length}, 1fr)` }}>
              {STATS.map((s, i) => (
                <div key={i} style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: 12, padding: 16, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                  </div>
                  <div>{loading ? <div className="skeleton" style={{ height: 26, width: 80 }} /> : <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{s.value}</div>}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', gap: 16 }}>
                  {['all', 'completed', 'pending', 'failed'].map(t => (
                    <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`}
                      onClick={() => { setFilter(t); setPage(1) }}
                      style={{ padding: '8px 4px', fontSize: 14, borderBottomWidth: 3 }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search transactions…" value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                    style={{ width: 300 }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>Date</th>
                      <th style={{ width: '15%' }}>Amount</th>
                      <th style={{ width: '22%' }}>Brand (Sender)</th>
                      <th style={{ width: '22%' }}>Influencer (Recipient)</th>
                      <th style={{ width: '12%' }}>Method</th>
                      <th style={{ width: '14%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, width: j === 1 ? 80 : 120 }} /></td>)}</tr>
                        ))
                      : payments.length === 0
                        ? <tr><td colSpan={6}><div className="empty-state"><DollarSign /><h3>No payment records found</h3><p>Once payments are made, they'll appear here.</p></div></td></tr>
                        : payments.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                            <td>
                              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-1)' }}>
                                {p.currency?.toUpperCase() === 'USD' ? '$' : p.currency} {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </td>
                            <td>
                              <Link href={`/users/${p.brand_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                                <User size={13} /> {p.brand?.display_name || 'Unknown Brand'}
                              </Link>
                            </td>
                            <td>
                              <Link href={`/users/${p.influencer_id}`} style={{ fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                                <User size={13} /> {p.influencer?.display_name || 'Unknown Influencer'}
                              </Link>
                            </td>
                            <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{p.payment_method || '—'}</td>
                            <td>{statusBadge(p.status)}</td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pagination">
              <span className="pagination-info">{total > 0 ? `${Math.min((page-1)*PAGE_SIZE+1,total)}–${Math.min(page*PAGE_SIZE,total)} of ${total.toLocaleString()}` : '0 of 0'}</span>
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
