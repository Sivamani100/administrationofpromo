'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Users, Megaphone, Flag, ShieldCheck, TrendingUp, TrendingDown,
  Activity, Bell, Clock, CheckCircle, XCircle, AlertTriangle, Send, MessageCircle, DollarSign,
  Search, Download, Plus, RefreshCw, Settings
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar, ComposedChart, Legend,
  CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis, AreaChart, Area, LabelList
} from 'recharts'

interface Stat { label: string; value: string; delta?: string; up?: boolean; icon: React.ReactNode; color: string; bg: string }

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#ef4444', '#14b8a6']

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({ users: 0, campaigns: 0, reports: 0, verifications: 0, applications: 0, rooms: 0, warnings: 0, payments: 0 })
  
  // Real Chart States
  const [rolesData, setRolesData] = useState<any[]>([])
  const [onboardingData, setOnboardingData] = useState<any[]>([])
  const [deletionsData, setDeletionsData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [applicationsData, setApplicationsData] = useState<any[]>([])
  const [verificationsData, setVerificationsData] = useState<any[]>([])
  const [warningsData, setWarningsData] = useState<any[]>([])
  const [demographicsData, setDemographicsData] = useState<any[]>([])

  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    const sb = createClient()
    const [
        { count: users },
        { count: campaigns },
        { count: reports },
        { count: verifications },
        { count: applications },
        { count: rooms },
        { count: warnings },
        { count: payments },
      ] = await Promise.all([
        sb.from('profiles').select('*', { count: 'exact', head: true }),
        sb.from('cards').select('*', { count: 'exact', head: true }),
        sb.from('reports').select('*', { count: 'exact', head: true }),
        sb.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('applications').select('*', { count: 'exact', head: true }),
        sb.from('rooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
        sb.from('user_warnings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        sb.from('payment_records').select('*', { count: 'exact', head: true }),
      ])
      
      setStats({
        users: users ?? 0,
        campaigns: campaigns ?? 0,
        reports: reports ?? 0,
        verifications: verifications ?? 0,
        applications: applications ?? 0,
        rooms: rooms ?? 0,
        warnings: warnings ?? 0,
        payments: payments ?? 0,
      })

      // Fetch Real Data for Charts
      const [
        { data: profilesRaw },
        { data: cardsData },
        { data: appsRaw },
        { data: verificationsRaw },
        { data: warningsRaw }
      ] = await Promise.all([
        sb.from('profiles').select('role, onboarding_step, deleted_at, location'),
        sb.from('cards').select('category'),
        sb.from('applications').select('status, created_at'),
        sb.from('verification_requests').select('status'),
        sb.from('user_warnings').select('reason, created_at')
      ])

      // 1. Roles Data (Pie)
      const roleCounts = (profilesRaw || []).reduce((acc: any, curr) => {
        const role = curr.role || 'Unspecified'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {})
      setRolesData(Object.entries(roleCounts).map(([name, value], i) => ({ 
        name, value, color: CHART_COLORS[i % CHART_COLORS.length] 
      })))

      // 2. Onboarding Data (Bar)
      const onboardCounts = (profilesRaw || []).reduce((acc: any, curr) => {
        const step = `Step ${curr.onboarding_step || 0}`
        acc[step] = (acc[step] || 0) + 1
        return acc
      }, {})
      const sortedSteps = Object.keys(onboardCounts).sort()
      setOnboardingData(sortedSteps.map((step, i) => ({ 
        step, count: onboardCounts[step], fill: CHART_COLORS[(i + 1) % CHART_COLORS.length] 
      })))

      // 3. Deletions Data (Donut)
      let active = 0
      let deleted = 0
      ;(profilesRaw || []).forEach(p => {
        if (p.deleted_at) deleted++
        else active++
      })
      setDeletionsData([
        { name: 'Active', value: active, color: '#10b981' },
        { name: 'Deleted', value: deleted, color: '#ef4444' }
      ])

      // 4. Category Data (Pie)
      const categoryCounts = (cardsData || []).reduce((acc: any, curr) => {
        const cat = curr.category || 'Uncategorized'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {})
      setCategoryData(Object.entries(categoryCounts).map(([name, value], i) => ({ 
        name, value, color: CHART_COLORS[(i + 2) % CHART_COLORS.length] 
      })))

      // 5. Applications (Time Series)
      const appsMap = new Map<string, any>()
      ;(appsRaw || []).forEach(curr => {
        const d = curr.created_at ? new Date(curr.created_at) : new Date()
        const key = d.toISOString().split('T')[0]
        const st = (curr.status || 'pending').toLowerCase()
        if (!appsMap.has(key)) appsMap.set(key, { dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), ts: d.getTime(), accepted: 0, pending: 0, rejected: 0 })
        
        const obj = appsMap.get(key)
        if (st === 'approved' || st === 'accepted') obj.accepted++
        else if (st === 'rejected') obj.rejected++
        else obj.pending++
      })
      const appsFinal = Array.from(appsMap.values()).sort((a,b) => a.ts - b.ts)
      setApplicationsData(appsFinal)

      // 6. Verifications (Donut)
      const verCounts = (verificationsRaw || []).reduce((acc: any, curr) => {
        const status = curr.status || 'Pending'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {})
      setVerificationsData(Object.entries(verCounts).map(([name, value], i) => ({ 
        name, value, color: CHART_COLORS[(i + 4) % CHART_COLORS.length] 
      })))

      // 7. Warnings Data (Time Series)
      const warnMap = new Map<string, any>()
      ;(warningsRaw || []).forEach(curr => {
        const d = curr.created_at ? new Date(curr.created_at) : new Date()
        const key = d.toISOString().split('T')[0]
        if (!warnMap.has(key)) warnMap.set(key, { dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), ts: d.getTime(), count: 0 })
        warnMap.get(key).count++
      })
      const warnFinal = Array.from(warnMap.values()).sort((a,b) => a.ts - b.ts)
      setWarningsData(warnFinal)

      // 8. Demographics Data (Radar -> Bar)
      const demoCounts = (profilesRaw || []).reduce((acc: any, curr) => {
        let loc = curr.location || 'Srikakulam'
        if (loc.toLowerCase() === 'unknown') loc = 'Srikakulam'
        acc[loc] = (acc[loc] || 0) + 1
        return acc
      }, {})
      const topLocations = Object.entries(demoCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)
      const maxLoc = Math.max(...topLocations.map(t => t[1] as number)) || 1
      setDemographicsData(topLocations.map(([subject, A]) => ({ subject, A, fullMark: maxLoc * 1.2 })))

      setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const STATS: Stat[] = [
    { label: 'Total Users',       value: stats.users.toLocaleString(),         icon: <Users size={16} />,       color: '#6366f1', bg: '#ede9fe' },
    { label: 'Active Campaigns',  value: stats.campaigns.toLocaleString(),     icon: <Megaphone size={16} />,   color: '#10b981', bg: '#d1fae5' },
    { label: 'Total Applications',value: stats.applications.toLocaleString(),  icon: <Send size={16} />,        color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Active Chat Rooms', value: stats.rooms.toLocaleString(),         icon: <MessageCircle size={16} />, color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Pending Verify',    value: stats.verifications.toLocaleString(), icon: <ShieldCheck size={16} />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Active Warnings',   value: stats.warnings.toLocaleString(),      icon: <AlertTriangle size={16} />, color: '#ef4444', bg: '#fee2e2' },
  ]

  // Shared tooltip style to avoid clutter
  const tooltipStyle = { borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }
  const legendStyle = { fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', paddingTop: '10px' }

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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Administrator Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="header-live-text" style={{ fontSize: '12px', color: 'var(--text-3)', marginRight: '8px' }}>Live Overview</span>
            <button onClick={loadData} className="btn btn-secondary header-btn" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}><RefreshCw size={14} className="header-icon"/> Refresh</button>
            <button onClick={() => router.push('/settings')} className="btn btn-secondary header-btn" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}><Settings size={14} className="header-icon"/> Settings</button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Quick Stats */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Quick Stats</h2>
            <button className="btn-ghost" style={{ border: 'none', padding: '4px' }}>
              <span style={{ fontSize: '16px', lineHeight: 1, color: 'var(--text-3)' }}>...</span>
            </button>
          </div>
          <div className="stats-grid">
            {STATS.map(s => (
              <div key={s.label} style={{ 
                border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '12px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                </div>
                {loading ? (
                   <div className="skeleton" style={{ height: 26, width: 80 }} />
                ) : (
                   <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                     {s.value}
                   </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '2px', 
                    background: s.up ? '#d1fae5' : '#fee2e2', 
                    color: s.up ? '#059669' : '#dc2626', 
                    padding: '2px 6px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 
                  }}>
                    {s.up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                    {s.delta}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>vs yesterday</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Analytics Grid */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Admin Overview Analytics</h2>
          </div>
          
          {loading ? (
             <div className="analytics-grid">
               {[1,2,3,4,5,6,7,8].map(i => (
                 <div key={i} className="skeleton" style={{ height: '260px', borderRadius: '12px' }} />
               ))}
             </div>
          ) : (
            <div className="analytics-grid">
              
              {/* Chart 1: User Roles */}
              <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative' }}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">User Roles</div>
                    <div className="chart-card-subtitle">Distribution of user roles</div>
                  </div>
                  <button className="chart-dots-btn">⋮</button>
                </div>
                <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
                  <div style={{ width: '100%', position: 'relative', height: '160px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={rolesData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                          {rolesData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="chart-center-text-wrap">
                      <div className="chart-center-val">{stats.users}</div>
                      <div className="chart-center-label">Users</div>
                    </div>
                  </div>
                  <div className="custom-legend">
                    {rolesData.map((d, i) => {
                      const perc = stats.users > 0 ? ((d.value / stats.users) * 100).toFixed(1) : 0;
                      return (
                        <div key={i} className="custom-legend-item">
                          <div className="custom-legend-dot" style={{ background: d.color }}></div>
                          <div style={{ flex: 1 }}>
                            <div className="custom-legend-value" style={{ fontSize: '12px' }}>{d.name}</div>
                            <div className="custom-legend-sub">{d.value} ({perc}%)</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Chart 2: Onboardings */}
              <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">Onboardings</div>
                    <div className="chart-card-subtitle">User onboarding progress</div>
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

              {/* Chart 3: Account Status */}
              <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">Account Status</div>
                    <div className="chart-card-subtitle">Status of user accounts</div>
                  </div>
                  <button className="chart-dots-btn">⋮</button>
                </div>
                <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
                  <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deletionsData} cy="100%" startAngle={180} endAngle={0} innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={4}>
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="chart-center-text-wrap" style={{ bottom: '0', top: 'auto', paddingBottom: '10px' }}>
                      <div className="chart-center-val" style={{ fontSize: '28px' }}>
                        {stats.users > 0 ? Math.round(((deletionsData[0]?.value || 0) / stats.users) * 100) : 0}%
                      </div>
                      <div className="chart-center-label" style={{ color: '#10b981', fontWeight: 600, fontSize: '12px' }}>Active</div>
                    </div>
                  </div>
                  <div className="custom-legend">
                    {deletionsData.map((d, i) => (
                      <div key={i} className="custom-legend-item">
                        <div className="custom-legend-dot" style={{ background: d.color }}></div>
                        <div className="custom-legend-label" style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: '12px' }}>{d.name} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{d.value} ({stats.users > 0 ? ((d.value/stats.users)*100).toFixed(1) : 0}%)</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart 4: Campaigns / Promo Pages */}
              <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div className="chart-card-header">
                  <div>
                    <div className="chart-card-title">Campaigns</div>
                    <div className="chart-card-subtitle">Campaigns by category</div>
                  </div>
                  <button className="chart-dots-btn">⋮</button>
                </div>
                <div style={{ height: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
                  <div style={{ width: '100%', height: '160px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} innerRadius={0} outerRadius={75} dataKey="value" stroke="#fff" strokeWidth={2}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
                            const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                            return percent > 0.05 ? (
                              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            ) : null;
                          }}
                          labelLine={false}
                        >
                          {categoryData.map((entry, index) => {
                            const colors = ['#f472b6', '#fbbf24', '#34d399', '#3b82f6', '#a78bfa'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="custom-legend">
                    {categoryData.map((d, i) => {
                      const colors = ['#f472b6', '#fbbf24', '#34d399', '#3b82f6', '#a78bfa'];
                      return (
                        <div key={i} className="custom-legend-item">
                          <div className="custom-legend-dot" style={{ background: colors[i % colors.length] }}></div>
                          <div className="custom-legend-label" style={{ fontSize: '12px' }}>{d.name} <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>{d.value}</span></div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Chart 5: Applications */}
              <div style={{ border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div className="chart-card-header" style={{ marginBottom: 0 }}>
                  <div>
                    <div className="chart-card-title">Applications</div>
                    <div className="chart-card-subtitle">Status breakdown</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>Total</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{stats.applications}</div>
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

              {/* Chart 6: Verifications */}
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
                    {/* Simulated dashed SVG Ring */}
                    <svg viewBox="0 0 100 100" style={{ width: '120px', height: '120px', transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="15 5" strokeDashoffset="0" />
                    </svg>
                    <div className="chart-center-text-wrap" style={{ zIndex: 1 }}>
                      <div className="chart-center-val" style={{ fontSize: '20px' }}>68%</div>
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

              {/* Chart 7: Warnings */}
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

              {/* Chart 8: Demographics */}
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

            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
