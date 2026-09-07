'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList,
} from 'recharts'
import { useRouter } from 'next/navigation'
import {
  Users, Megaphone, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown, RefreshCw, CheckCircle, Clock, XCircle,
  Send, MessageCircle, Settings, DollarSign, MessageSquare, LifeBuoy, Star, UserX, Flag, ShieldAlert, CheckSquare, Activity
} from 'lucide-react'

// Helper to format dates to Month
const getMonthLabel = (dateStr: string) => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr)
  return d.toLocaleString('default', { month: 'short' })
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ 
    users: 0, campaigns: 0, reports: 0, verifications: 0, applications: 0, rooms: 0, 
    warnings: 0, disputes: 0, revenue: 0, tickets: 0, reviews: 0, avgRating: 0, deleted: 0,
    pendingReports: 0, escalatedReports: 0, milestones: 0, auditEvents: 0 
  })
  
  // Analytics specific charts
  const [monthlyGrowth, setMonthlyGrowth] = useState<any[]>([])
  const [monthlyActivity, setMonthlyActivity] = useState<any[]>([])
  const [financialData, setFinancialData] = useState<any[]>([])
  const [disputesData, setDisputesData] = useState<any[]>([])
  const [ticketsTrend, setTicketsTrend] = useState<any[]>([])
  
  // Dashboard shared charts
  const [roleData, setRoleData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [onboardingData, setOnboardingData] = useState<any[]>([])
  const [applicationsData, setApplicationsData] = useState<any[]>([])
  const [verificationsData, setVerificationsData] = useState<any[]>([])
  const [warningsData, setWarningsData] = useState<any[]>([])
  const [demographicsData, setDemographicsData] = useState<any[]>([])
  const [ticketsData, setTicketsData] = useState<any[]>([])
  const [ratingsData, setRatingsData] = useState<any[]>([])
  const [reportsStatusData, setReportsStatusData] = useState<any[]>([])
  const [milestonesData, setMilestonesData] = useState<any[]>([])
  const [auditData, setAuditData] = useState<any[]>([])
  
  async function loadData() {
    setLoading(true)
    const sb = createClient()
    
    // Fetch totals
    const [
      { count: u }, { count: c }, { count: r }, { count: v },
      { count: app }, { count: room }, { count: warn }, { count: disp },
      { count: t }, { count: rev }, { count: miles }, { count: audit }
    ] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('cards').select('*', { count: 'exact', head: true }),
      sb.from('reports').select('*', { count: 'exact', head: true }),
      sb.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('applications').select('*', { count: 'exact', head: true }),
      sb.from('rooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('user_warnings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      sb.from('reviews').select('*', { count: 'exact', head: true }),
      sb.from('milestones').select('*', { count: 'exact', head: true }),
      sb.from('audit_logs').select('*', { count: 'exact', head: true })
    ])

    // Fetch raw data
    const [
      { data: profiles },
      { data: campaigns },
      { data: reports },
      { data: applications },
      { data: warnings },
      { data: verificationsRaw },
      { data: paymentRecords },
      { data: disputesRaw },
      { data: supportTickets },
      { data: reviewsRaw },
      { data: milestonesRaw },
      { data: auditLogsRaw }
    ] = await Promise.all([
      sb.from('profiles').select('created_at, role, deleted_at, is_active, onboarding_step, location'),
      sb.from('cards').select('created_at, category, status'),
      sb.from('reports').select('created_at, status'),
      sb.from('applications').select('created_at, status'),
      sb.from('user_warnings').select('created_at, reason, status'),
      sb.from('verification_requests').select('created_at, status'),
      sb.from('payment_records').select('created_at, amount, status'),
      sb.from('disputes').select('created_at, status'),
      sb.from('support_tickets').select('created_at, priority, status'),
      sb.from('reviews').select('created_at, rating'),
      sb.from('milestones').select('status'),
      sb.from('audit_logs').select('action').limit(1000)
    ])

    const totalRevenue = (paymentRecords || []).filter(p => p.status === 'completed').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    const avgRat = (reviewsRaw || []).length > 0 ? ((reviewsRaw || []).reduce((acc, curr) => acc + (curr.rating || 5), 0) / (reviewsRaw || []).length).toFixed(1) : 0
    let deletedCount = 0
    ;(profiles || []).forEach(p => { if (p.deleted_at) deletedCount++ })
    const pendingRep = (reports || []).filter(r => r.status === 'pending').length
    const escRep = (reports || []).filter(r => r.status === 'escalated').length

    setTotals({ 
      users: u ?? 0, campaigns: c ?? 0, reports: r ?? 0, verifications: v ?? 0,
      applications: app ?? 0, rooms: room ?? 0, warnings: warn ?? 0,
      disputes: disp ?? 0, revenue: totalRevenue,
      tickets: t ?? 0, reviews: rev ?? 0, avgRating: parseFloat(avgRat as string), deleted: deletedCount,
      pendingReports: pendingRep, escalatedReports: escRep, milestones: miles ?? 0, auditEvents: audit ?? 0
    })

    // --- ANALYTICS UNIQUE CHARTS ---
    const months = Array.from({length: 6}, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      return d.toLocaleString('default', { month: 'short' })
    })

    const growth = months.map(m => ({ month: m, users: 0, campaigns: 0 }))
    const activity = months.map(m => ({ month: m, reports: 0, warnings: 0 }))
    const financial = months.map(m => ({ month: m, volume: 0 }))
    const tTrend = months.map(m => ({ month: m, tickets: 0 }))

    months.forEach((m, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      d.setDate(31)
      const pCount = (profiles || []).filter(p => new Date(p.created_at) <= d).length
      const cCount = (campaigns || []).filter(c => new Date(c.created_at) <= d).length
      growth[i].users = pCount
      growth[i].campaigns = cCount
      
      const rCount = (reports || []).filter(r => getMonthLabel(r.created_at) === m).length
      const wCount = (warnings || []).filter(w => getMonthLabel(w.created_at) === m).length
      activity[i].reports = rCount
      activity[i].warnings = wCount

      const rev = (paymentRecords || []).filter(p => p.status === 'completed' && getMonthLabel(p.created_at) === m)
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
      financial[i].volume = rev

      tTrend[i].tickets = (supportTickets || []).filter(st => getMonthLabel(st.created_at) === m).length
    })
    setMonthlyGrowth(growth)
    setMonthlyActivity(activity)
    setFinancialData(financial)
    setTicketsTrend(tTrend)

    // --- DASHBOARD SHARED CHARTS ---
    
    // 1. Roles
    const rolesMap = (profiles || []).reduce((acc: any, p) => {
      const r = p.role || 'Other'
      acc[r] = (acc[r] || 0) + 1
      return acc
    }, {})
    setRoleData(Object.keys(rolesMap).map((k, i) => ({ name: k, value: rolesMap[k], color: COLORS[i % COLORS.length] })))

    // 2. Status
    const statusMap = { Active: 0, Deleted: 0, Inactive: 0 }
    ;(profiles || []).forEach(p => {
      if (p.deleted_at) statusMap.Deleted++
      else if (p.is_active === false) statusMap.Inactive++
      else statusMap.Active++
    })
    setStatusData([
      { name: 'Active', value: statusMap.Active, color: '#10b981' },
      { name: 'Inactive', value: statusMap.Inactive, color: '#f59e0b' },
      { name: 'Deleted', value: statusMap.Deleted, color: '#ef4444' },
    ].filter(d => d.value > 0))

    // 3. Categories
    const catMap = (campaigns || []).reduce((acc: any, c) => {
      const cat = c.category || 'Uncategorized'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
    const sortedCats = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] })).sort((a,b) => b.value - a.value)
    setCategoryData(sortedCats.slice(0, 5).map((d, i) => ({ ...d, color: COLORS[(i+4) % COLORS.length] })))

    // 4. Onboardings
    const onboardCounts = (profiles || []).reduce((acc: any, curr) => {
      let step = curr.onboarding_step || 0
      acc[step] = (acc[step] || 0) + 1
      return acc
    }, {})
    setOnboardingData(Object.entries(onboardCounts).map(([step, count]) => ({ step: `Step ${step}`, count })).sort((a,b) => a.step.localeCompare(b.step)))

    // 5. Applications
    const appsMap = new Map<string, any>()
    ;(applications || []).forEach(curr => {
      const d = curr.created_at ? new Date(curr.created_at) : new Date()
      const key = d.toISOString().split('T')[0]
      const st = (curr.status || 'pending').toLowerCase()
      if (!appsMap.has(key)) appsMap.set(key, { dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), ts: d.getTime(), accepted: 0, pending: 0, rejected: 0 })
      const obj = appsMap.get(key)
      if (st === 'approved' || st === 'accepted') obj.accepted++
      else if (st === 'rejected') obj.rejected++
      else obj.pending++
    })
    setApplicationsData(Array.from(appsMap.values()).sort((a,b) => a.ts - b.ts))

    // 6. Verifications
    const verCounts = (verificationsRaw || []).reduce((acc: any, curr) => {
      let status = curr.status || 'Pending'
      status = status.charAt(0).toUpperCase() + status.slice(1)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    setVerificationsData(Object.entries(verCounts).map(([name, value], i) => ({ 
      name, value, color: COLORS[(i + 4) % COLORS.length] 
    })))

    // 7. Warnings
    const warnMap = new Map<string, any>()
    ;(warnings || []).forEach(curr => {
      const d = curr.created_at ? new Date(curr.created_at) : new Date()
      const key = d.toISOString().split('T')[0]
      if (!warnMap.has(key)) warnMap.set(key, { dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), ts: d.getTime(), count: 0 })
      warnMap.get(key).count++
    })
    setWarningsData(Array.from(warnMap.values()).sort((a,b) => a.ts - b.ts))

    // 8. Demographics
    const demoCounts = (profiles || []).reduce((acc: any, curr) => {
      let loc = curr.location || 'Srikakulam'
      if (loc.toLowerCase() === 'unknown') loc = 'Srikakulam'
      acc[loc] = (acc[loc] || 0) + 1
      return acc
    }, {})
    const topLocations = Object.entries(demoCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)
    setDemographicsData(topLocations.map(([subject, A]) => ({ subject, A })))

    // 9. Disputes
    const dispCounts = (disputesRaw || []).reduce((acc: any, curr) => {
      let status = curr.status || 'open'
      status = status.charAt(0).toUpperCase() + status.slice(1)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    setDisputesData(Object.entries(dispCounts).map(([name, value], i) => ({ 
      name, value, color: COLORS[(i + 5) % COLORS.length] 
    })))

    // 10. Tickets Priority
    const tickCounts = (supportTickets || []).reduce((acc: any, curr) => {
      let p = curr.priority || 'medium'
      p = p.charAt(0).toUpperCase() + p.slice(1)
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {})
    setTicketsData(Object.entries(tickCounts).map(([name, value], i) => ({ 
      name, value, color: COLORS[(i + 6) % COLORS.length] 
    })))

    // 11. Ratings Distribution
    const ratCounts = { '5 Stars': 0, '4 Stars': 0, '3 Stars': 0, '2 Stars': 0, '1 Star': 0 }
    ;(reviewsRaw || []).forEach(r => {
      const rating = Math.round(r.rating || 5)
      if (rating === 5) ratCounts['5 Stars']++
      else if (rating === 4) ratCounts['4 Stars']++
      else if (rating === 3) ratCounts['3 Stars']++
      else if (rating === 2) ratCounts['2 Stars']++
      else ratCounts['1 Star']++
    })
    setRatingsData(Object.entries(ratCounts).map(([rating, count]) => ({ rating, count })))

    // 12. Reports Status Breakdown
    const repCounts = (reports || []).reduce((acc: any, curr) => {
      let status = curr.status || 'pending'
      status = status.charAt(0).toUpperCase() + status.slice(1)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    setReportsStatusData(Object.entries(repCounts).map(([name, value], i) => ({ 
      name, value, color: COLORS[(i + 7) % COLORS.length] 
    })))

    // 13. Milestones Status
    const mileCounts = (milestonesRaw || []).reduce((acc: any, curr) => {
      let status = curr.status || 'pending'
      status = status.replace('_', ' ')
      status = status.charAt(0).toUpperCase() + status.slice(1)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    setMilestonesData(Object.entries(mileCounts).map(([name, value], i) => ({ 
      name, value, color: COLORS[(i + 8) % COLORS.length] 
    })))

    // 14. Audit Actions
    const auCounts = (auditLogsRaw || []).reduce((acc: any, curr) => {
      let action = curr.action || 'unknown'
      if (action.includes('user.login')) action = 'Login'
      else if (action.includes('ban')) action = 'Ban'
      else if (action.includes('delete')) action = 'Delete'
      else if (action.includes('approve')) action = 'Approve'
      else if (action.includes('verify')) action = 'Verify'
      else if (action.includes('update')) action = 'Update'
      else action = 'Other'
      acc[action] = (acc[action] || 0) + 1
      return acc
    }, {})
    const topActions = Object.entries(auCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)
    setAuditData(topActions.map(([subject, A]) => ({ subject, A })))

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const tooltipStyle = { borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }

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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Platform Analytics</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="header-live-text" style={{ fontSize: '12px', color: 'var(--text-3)', marginRight: '8px' }}>Live Overview</span>
            <button onClick={loadData} className="btn btn-secondary header-btn" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}><RefreshCw size={14} className="header-icon"/> Refresh</button>
            <button onClick={() => router.push('/settings')} className="btn btn-secondary header-btn" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}><Settings size={14} className="header-icon"/> Settings</button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>

      {/* KPIs */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Quick Stats</h2>
          <button className="btn-ghost" style={{ border: 'none', padding: '4px' }}>
            <span style={{ fontSize: '16px', lineHeight: 1, color: 'var(--text-3)' }}>...</span>
          </button>
        </div>
        <div className="stats-grid">
          {[
            { label: 'Total Users',       value: totals.users,         icon: <Users size={16} />,       color: '#6366f1', bg: '#ede9fe', up: true, delta: 'Live' },
            { label: 'Active Campaigns',  value: totals.campaigns,     icon: <Megaphone size={16} />,   color: '#10b981', bg: '#d1fae5', up: true, delta: 'Live' },
            { label: 'Total Revenue',     value: `$${totals.revenue.toLocaleString()}`, icon: <DollarSign size={16} />, color: '#10b981', bg: '#d1fae5', up: true, delta: 'Live' },
            { label: 'Total Applications',value: totals.applications,  icon: <Send size={16} />,        color: '#3b82f6', bg: '#dbeafe', up: true, delta: 'Live' },
            { label: 'Active Chat Rooms', value: totals.rooms,         icon: <MessageCircle size={16} />, color: '#8b5cf6', bg: '#ede9fe', up: true, delta: 'Live' },
            { label: 'Total Milestones',  value: totals.milestones,    icon: <CheckSquare size={16} />, color: '#14b8a6', bg: '#ccfbf1', up: true, delta: 'Live' },
            { label: 'Pending Verify',    value: totals.verifications, icon: <ShieldCheck size={16} />, color: '#f59e0b', bg: '#fef3c7', up: true, delta: 'Live' },
            { label: 'Open Tickets',      value: totals.tickets,       icon: <LifeBuoy size={16} />,    color: '#0ea5e9', bg: '#e0f2fe', up: false, delta: 'Live' },
            { label: 'Pending Reports',   value: totals.pendingReports,icon: <Flag size={16} />,        color: '#f97316', bg: '#ffedd5', up: false, delta: 'Live' },
            { label: 'Escalated Reports', value: totals.escalatedReports,icon:<ShieldAlert size={16} />,color: '#ef4444', bg: '#fee2e2', up: false, delta: 'Live' },
            { label: 'Open Disputes',     value: totals.disputes,      icon: <MessageSquare size={16} />, color: '#f97316', bg: '#ffedd5', up: false, delta: 'Live' },
            { label: 'Active Warnings',   value: totals.warnings,      icon: <AlertTriangle size={16} />, color: '#ef4444', bg: '#fee2e2', up: false, delta: 'Live' },
            { label: 'Total Reviews',     value: totals.reviews,       icon: <Star size={16} />,        color: '#eab308', bg: '#fef08a', up: true, delta: 'Live' },
            { label: 'Avg Rating',        value: `${totals.avgRating} / 5`, icon: <Star size={16} />,   color: '#eab308', bg: '#fef08a', up: totals.avgRating >= 4, delta: 'Live' },
            { label: 'Deleted Accounts',  value: totals.deleted,       icon: <UserX size={16} />,       color: '#64748b', bg: '#f1f5f9', up: false, delta: 'Live' },
            { label: 'Audit Events',      value: totals.auditEvents,   icon: <Activity size={16} />,    color: '#8b5cf6', bg: '#ede9fe', up: true, delta: 'Live' },
          ].map(k => (
            <div key={k.label} style={{ 
              border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '12px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {k.icon}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
              </div>
              {loading ? (
                <div className="skeleton" style={{ height: 26, width: 80 }} />
              ) : (
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '2px', 
                  background: k.up ? '#d1fae5' : '#fee2e2', color: k.up ? '#059669' : '#dc2626', 
                  padding: '2px 6px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 
                }}>
                  {k.delta}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Actual Database</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Detailed Analytics</h2>
      </div>

      {loading ? (
        <div className="analytics-grid">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />)}
        </div>
      ) : (
        <div className="analytics-grid">

          {/* Cumulative Growth */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Cumulative Growth</div>
                <div className="chart-card-subtitle">Total users and campaigns over 6 months</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aCampaigns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f8" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="users" stroke="#6366f1" fill="url(#aUsers)" strokeWidth={3} name="Total Users" />
                  <Area type="monotone" dataKey="campaigns" stroke="#10b981" fill="url(#aCampaigns)" strokeWidth={3} name="Total Campaigns" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Activity */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Moderation Activity</div>
                <div className="chart-card-subtitle">New reports and warnings per month</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyActivity} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f8" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="reports" fill="#ef4444" radius={[4, 4, 4, 4]} name="Reports" barSize={16} />
                  <Bar dataKey="warnings" fill="#f59e0b" radius={[4, 4, 4, 4]} name="Warnings" barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Roles */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">User Roles</div>
                <div className="chart-card-subtitle">Breakdown by type</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ width: '100%', position: 'relative', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                      {roleData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-center-text-wrap">
                  <div className="chart-center-val">{totals.users}</div>
                  <div className="chart-center-label">Total</div>
                </div>
              </div>
              <div className="custom-legend">
                {roleData.map((d, i) => (
                  <div key={i} className="custom-legend-item">
                    <div className="custom-legend-dot" style={{ background: d.color }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="custom-legend-value" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{d.name}</div>
                      <div className="custom-legend-sub">{d.value} ({((d.value/Math.max(1, totals.users))*100).toFixed(0)}%)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Onboardings */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Onboardings</div>
                <div className="chart-card-subtitle">User progress</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: '220px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={onboardingData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStep0" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="colorStep1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f472b6" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                    <linearGradient id="colorStep2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="step" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={25}>
                    {onboardingData.map((entry, index) => {
                      const fills = ['url(#colorStep0)', 'url(#colorStep1)', 'url(#colorStep2)'];
                      return <Cell key={`cell-${index}`} fill={fills[index % fills.length]} />;
                    })}
                    <LabelList dataKey="count" position="top" style={{ fill: 'var(--text-1)', fontSize: '12px', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Account Status (Half Donut) */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Account Status</div>
                <div className="chart-card-subtitle">Overall status</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cy="100%" startAngle={180} endAngle={0} innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                      {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-center-text-wrap" style={{ bottom: '0', top: 'auto', paddingBottom: '10px' }}>
                  <div className="chart-center-val" style={{ fontSize: '28px' }}>
                    {totals.users > 0 ? Math.round(((statusData.find(d => d.name === 'Active')?.value || 0) / totals.users) * 100) : 0}%
                  </div>
                  <div className="chart-center-label" style={{ color: '#10b981', fontWeight: 600, fontSize: '12px' }}>Active</div>
                </div>
              </div>
              <div className="custom-legend">
                {statusData.map((d, i) => (
                  <div key={i} className="custom-legend-item">
                    <div className="custom-legend-dot" style={{ background: d.color }}></div>
                    <div className="custom-legend-label" style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: '12px' }}>{d.name} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{d.value}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign Categories */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Top Categories</div>
                <div className="chart-card-subtitle">Campaign distribution</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ width: '100%', position: 'relative', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                      {categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-center-text-wrap">
                  <div className="chart-center-val">{totals.campaigns}</div>
                  <div className="chart-center-label">Total</div>
                </div>
              </div>
              <div className="custom-legend">
                {categoryData.slice(0,4).map((d, i) => (
                  <div key={i} className="custom-legend-item">
                    <div className="custom-legend-dot" style={{ background: d.color }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="custom-legend-value" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{d.name}</div>
                      <div className="custom-legend-sub">{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Applications Status Area Chart */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header" style={{ marginBottom: 0 }}>
              <div>
                <div className="chart-card-title">Applications</div>
                <div className="chart-card-subtitle">Status breakdown</div>
              </div>
            </div>
            <div style={{ height: '180px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={applicationsData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="dateStr" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-3)' }} dy={10} hide />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="accepted" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAccepted)" activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorPending)" activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="rejected" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRejected)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="custom-legend">
              {[{k: 'Accepted', c: '#10b981', v: applicationsData.reduce((a,b)=>a+b.accepted,0)},
                {k: 'Pending', c: '#f59e0b', v: applicationsData.reduce((a,b)=>a+b.pending,0)},
                {k: 'Rejected', c: '#3b82f6', v: applicationsData.reduce((a,b)=>a+b.rejected,0)}].map((d, i) => (
                <div key={i} className="custom-legend-item">
                  <div className="custom-legend-dot" style={{ background: d.c }}></div>
                  <div className="custom-legend-label" style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: '12px' }}>{d.k} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{d.v}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Verifications */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Verifications</div>
                <div className="chart-card-subtitle">Verification status</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ width: '100%', position: 'relative', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 100 100" style={{ width: '120px', height: '120px', transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="15 5" strokeDashoffset="0" />
                </svg>
                <div className="chart-center-text-wrap" style={{ zIndex: 1 }}>
                  <div className="chart-center-val" style={{ fontSize: '20px' }}>
                    {totals.verifications > 0 ? Math.round(((verificationsData.find(d => d.name === 'Approved')?.value || 0) / totals.verifications) * 100) : 0}%
                  </div>
                  <div className="chart-center-label" style={{ color: '#ef4444', fontWeight: 600, fontSize: '12px' }}>Approved</div>
                </div>
              </div>
              <div className="custom-legend">
                {verificationsData.map((d, i) => {
                  const iconMap:any = { 'Approved': <CheckCircle size={14} color="#fff" />, 'Pending': <Clock size={14} color="#fff" />, 'Rejected': <XCircle size={14} color="#fff" /> };
                  const colorMap:any = { 'Approved': '#f59e0b', 'Pending': '#3b82f6', 'Rejected': '#94a3b8' };
                  const color = colorMap[d.name] || '#cbd5e1';
                  return (
                    <div key={i} className="custom-legend-item" style={{ gap: '8px' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {iconMap[d.name]}
                      </div>
                      <div className="custom-legend-label" style={{ color: 'var(--text-1)', fontSize: '12px' }}>{d.name} <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>{d.value}</span></div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Warnings */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Warnings</div>
                <div className="chart-card-subtitle">Recent warnings trend</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: '220px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={warningsData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWarning" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="dateStr" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-3)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorWarning)" activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demographics */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Districts</div>
                <div className="chart-card-subtitle">Top user districts</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: '220px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographicsData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }} barSize={12}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="subject" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-2)', fontWeight: 500 }} width={90} tickFormatter={(val) => val.length > 10 ? val.substring(0,8)+'...' : val} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="A" radius={10} background={{ fill: '#f1f5f9', radius: 10 }}>
                    {demographicsData.map((entry, index) => {
                      const colors = ['#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#fbbf24'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                    <LabelList dataKey="A" position="right" style={{ fill: 'var(--text-1)', fontSize: '12px', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Volume (Financial) */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Payment Volume</div>
                <div className="chart-card-subtitle">Completed payments over time</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: '220px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFinancial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-3)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickFormatter={val => `$${val}`} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 2 }} formatter={(val: any) => [`$${val}`, 'Volume']} />
                  <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFinancial)" activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Disputes Status */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Disputes</div>
                <div className="chart-card-subtitle">Resolution status breakdown</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ width: '100%', position: 'relative', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={disputesData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                      {disputesData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-center-text-wrap">
                  <div className="chart-center-val">{disputesData.reduce((acc, curr) => acc + curr.value, 0)}</div>
                  <div className="chart-center-label">Total</div>
                </div>
              </div>
              <div className="custom-legend">
                {disputesData.map((d, i) => (
                  <div key={i} className="custom-legend-item">
                    <div className="custom-legend-dot" style={{ background: d.color }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="custom-legend-value" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{d.name}</div>
                      <div className="custom-legend-sub">{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Support Tickets Priority */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Ticket Priority</div>
                <div className="chart-card-subtitle">Support tickets by priority</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ width: '100%', position: 'relative', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ticketsData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                      {ticketsData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-center-text-wrap">
                  <div className="chart-center-val">{ticketsData.reduce((acc, curr) => acc + curr.value, 0)}</div>
                  <div className="chart-center-label">Total</div>
                </div>
              </div>
              <div className="custom-legend">
                {ticketsData.map((d, i) => (
                  <div key={i} className="custom-legend-item">
                    <div className="custom-legend-dot" style={{ background: d.color }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="custom-legend-value" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{d.name}</div>
                      <div className="custom-legend-sub">{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Review Ratings */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Review Ratings</div>
                <div className="chart-card-subtitle">Distribution of star ratings</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: '220px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingsData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="rating" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#eab308" radius={[6, 6, 0, 0]} barSize={25}>
                    <LabelList dataKey="count" position="top" style={{ fill: 'var(--text-1)', fontSize: '12px', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reports Status */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Moderation Queue</div>
                <div className="chart-card-subtitle">Reports by status</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ width: '100%', position: 'relative', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportsStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                      {reportsStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-center-text-wrap">
                  <div className="chart-center-val">{reportsStatusData.reduce((acc, curr) => acc + curr.value, 0)}</div>
                  <div className="chart-center-label">Total</div>
                </div>
              </div>
              <div className="custom-legend">
                {reportsStatusData.map((d, i) => (
                  <div key={i} className="custom-legend-item">
                    <div className="custom-legend-dot" style={{ background: d.color }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="custom-legend-value" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{d.name}</div>
                      <div className="custom-legend-sub">{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Milestones Status */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Campaign Milestones</div>
                <div className="chart-card-subtitle">Milestones completion status</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ width: '100%', position: 'relative', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={milestonesData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                      {milestonesData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-center-text-wrap">
                  <div className="chart-center-val">{milestonesData.reduce((acc, curr) => acc + curr.value, 0)}</div>
                  <div className="chart-center-label">Total</div>
                </div>
              </div>
              <div className="custom-legend">
                {milestonesData.map((d, i) => (
                  <div key={i} className="custom-legend-item">
                    <div className="custom-legend-dot" style={{ background: d.color }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="custom-legend-value" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{d.name}</div>
                      <div className="custom-legend-sub">{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Actions Bar */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">System Audit Log</div>
                <div className="chart-card-subtitle">Top administrative actions</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: '220px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }} barSize={12}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="subject" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-2)', fontWeight: 500 }} width={90} tickFormatter={(val) => val.length > 10 ? val.substring(0,8)+'...' : val} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="A" radius={10} background={{ fill: '#f1f5f9', radius: 10 }}>
                    {auditData.map((entry, index) => {
                      const colors = ['#8b5cf6', '#3b82f6', '#0ea5e9', '#10b981', '#fbbf24'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                    <LabelList dataKey="A" position="right" style={{ fill: 'var(--text-1)', fontSize: '12px', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Support Tickets Trend */}
          <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Tickets Trend</div>
                <div className="chart-card-subtitle">New tickets over 6 months</div>
              </div>
              <button className="chart-dots-btn">⋮</button>
            </div>
            <div style={{ height: '220px', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ticketsTrend} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-3)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="tickets" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
        </div>
      </div>
    </div>
  )
}
