'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { 
  Shield, MapPin, Calendar, Clock, Activity, AlertTriangle, 
  CheckCircle, Ban, MessageSquare, Send, Users, History 
} from 'lucide-react'
import { banUser, unbanUser, verifyUser, warnUser } from '@/app/actions/admin'

type Profile = any

export default function UserViewModal({ userId, onClose }: { userId: string, onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Analytics
  const [stats, setStats] = useState({ chats: 0, apps: 0, views: 0 })
  
  // Activity
  const [logs, setLogs] = useState<any[]>([])
  const [recentChats, setRecentChats] = useState<any[]>([])
  const [recentApps, setRecentApps] = useState<any[]>([])
  
  // Actions
  const [warningReason, setWarningReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data)
  }, [userId])

  const loadAnalytics = useCallback(async () => {
    const sb = createClient()
    const [chatsRes, appsRes, viewsRes] = await Promise.all([
      sb.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      sb.from('applications').select('*', { count: 'exact', head: true }).eq('influencer_id', userId),
      sb.from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', userId)
    ])
    setStats({
      chats: chatsRes.count || 0,
      apps: appsRes.count || 0,
      views: viewsRes.count || 0
    })
  }, [userId])

  const loadActivity = useCallback(async () => {
    const sb = createClient()
    const [logsRes, appsRes] = await Promise.all([
      sb.from('audit_logs').select('*').or(`metadata->>user_id.eq.${userId},action.ilike.%${userId}%`).order('created_at', { ascending: false }).limit(5),
      sb.from('applications').select('*, card:cards!applications_card_id_fkey(title)').eq('influencer_id', userId).order('created_at', { ascending: false }).limit(5)
    ])
    if (logsRes.data) setLogs(logsRes.data)
    if (appsRes.data) setRecentApps(appsRes.data)
    
    // Recent chats - get rooms the user is in, then get other members
    const { data: userRooms } = await sb.from('group_members').select('room_id').eq('user_id', userId)
    if (userRooms && userRooms.length > 0) {
      const roomIds = userRooms.map((r: any) => r.room_id)
      const { data: chatPartners } = await sb.from('group_members')
        .select('room_id, user:profiles!group_members_user_id_fkey(id, display_name)')
        .in('room_id', roomIds)
        .neq('user_id', userId)
        .limit(10)
      if (chatPartners) {
        // deduplicate partners
        const uniquePartners = Array.from(new Map(chatPartners.map((item: any) => [item.user?.id, item.user])).values()).filter(Boolean)
        setRecentChats(uniquePartners)
      }
    }
  }, [userId])

  useEffect(() => {
    loadProfile().then(() => setLoading(false))
  }, [loadProfile])

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics()
    if (activeTab === 'activity') loadActivity()
  }, [activeTab, loadAnalytics, loadActivity])

  async function handleAction(actionType: string) {
    if (!profile) return
    setActionLoading(true)
    try {
      if (actionType === 'ban') {
        await banUser(userId)
        setProfile({ ...profile, account_status: 'suspended' })
      }
      if (actionType === 'unban') {
        await unbanUser(userId)
        setProfile({ ...profile, account_status: 'active' })
      }
      if (actionType === 'verify') {
        await verifyUser(userId)
        setProfile({ ...profile, is_verified: true })
      }
      if (actionType === 'warn') {
        if (!warningReason.trim()) return
        await warnUser(userId, warningReason)
        setWarningReason('')
        alert('Warning issued successfully')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to perform action')
    }
    setActionLoading(false)
  }

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%' }}>
        <div className="modal-body"><div className="skeleton" style={{ height: 200 }} /></div>
      </div>
    </div>
  )

  if (!profile) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', padding: 0, overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '24px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-2)' }}>✕</button>
          
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              profile.display_name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {profile.display_name || 'Anonymous User'}
              {profile.is_verified && <CheckCircle size={16} color="var(--primary)" />}
            </h1>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span className={`badge ${profile.role === 'brand' ? 'badge-blue' : profile.role === 'influencer' ? 'badge-purple' : 'badge-gray'}`}>
                {profile.role || 'user'}
              </span>
              <span className={`badge ${profile.account_status === 'suspended' || profile.account_status === 'banned' ? 'badge-red' : 'badge-green'}`}>
                {profile.account_status === 'suspended' ? 'Suspended' : profile.account_status === 'banned' ? 'Banned' : 'Active'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-2)', fontSize: '13px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14}/> {profile.location || 'Unknown location'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14}/> Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)', padding: '0 24px' }}>
          {['overview', 'analytics', 'activity', 'actions'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'transparent', border: 'none', padding: '16px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-2)',
              borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
              textTransform: 'capitalize'
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px', maxHeight: '50vh', overflowY: 'auto', background: 'var(--bg-1)' }}>
          
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-2)' }}>Bio</h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-1)', whiteSpace: 'pre-wrap', background: 'var(--bg-2)', padding: '16px', borderRadius: '8px' }}>
                  {profile.bio || 'No bio provided.'}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--bg-2)', padding: '16px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>User ID</span>
                  <strong style={{ fontSize: '13px', wordBreak: 'break-all' }}>{profile.id}</strong>
                </div>
                <div style={{ background: 'var(--bg-2)', padding: '16px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Last Seen</span>
                  <strong style={{ fontSize: '13px' }}>{profile.last_seen ? new Date(profile.last_seen).toLocaleString() : 'Never'}</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ 
                border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ede9fe', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageSquare size={16}/>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Total Chats</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{stats.chats}</div>
                </div>
              </div>

              <div style={{ 
                border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#d1fae5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Send size={16}/>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Applications</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{stats.apps}</div>
                </div>
              </div>

              <div style={{ 
                border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0f2fe', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={16}/>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Profile Visitors</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{stats.views}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px' }}><History size={16}/> Recent Audit Logs</h3>
                {logs.length > 0 ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    {logs.map((log, i) => (
                      <div key={log.id} style={{ padding: '12px 16px', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong>{log.action}</strong>
                          <span style={{ color: 'var(--text-3)' }}>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <div style={{ color: 'var(--text-2)', fontFamily: 'monospace', fontSize: '11px' }}>
                          {JSON.stringify(log.metadata)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>No recent admin actions/logs.</div>}
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={16}/> Chatted With</h3>
                {recentChats.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {recentChats.map(u => (
                      <span key={u.id} className="badge badge-gray" style={{ padding: '6px 12px', fontSize: '13px' }}>
                        {u.display_name || 'Anonymous'}
                      </span>
                    ))}
                  </div>
                ) : <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>No chat history found.</div>}
              </div>
              
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px' }}><Send size={16}/> Recent Applications</h3>
                {recentApps.length > 0 ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    {recentApps.map((app, i) => (
                      <div key={app.id} style={{ padding: '12px 16px', borderBottom: i < recentApps.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Applied to <strong>{app.card?.title || 'Unknown'}</strong></span>
                        <span className={`badge ${app.status === 'accepted' ? 'badge-green' : app.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{app.status}</span>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>No recent applications found.</div>}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Warn User */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-1)' }}><AlertTriangle size={16} color="var(--yellow)"/> Issue Warning</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>Send a formal warning to this user. This will be recorded in their history.</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="Reason for warning..." 
                    value={warningReason} 
                    onChange={e => setWarningReason(e.target.value)} 
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                  <button className="btn btn-secondary" onClick={() => handleAction('warn')} disabled={actionLoading || !warningReason.trim()}>
                    {actionLoading ? 'Processing...' : 'Send Warning'}
                  </button>
                </div>
              </div>

              {/* Status Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {!profile.is_verified && (
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} color="var(--green)"/> Verify User</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 16px 0', flex: 1 }}>Grant verification badge manually.</p>
                    <button className="btn btn-primary" onClick={() => handleAction('verify')} disabled={actionLoading}>Verify Now</button>
                  </div>
                )}

                {profile.account_status === 'suspended' || profile.account_status === 'banned' ? (
                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} color="var(--green)"/> Reactivate Account</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 16px 0', flex: 1 }}>Restore access for this suspended user.</p>
                    <button className="btn btn-secondary" onClick={() => handleAction('unban')} disabled={actionLoading}>Unsuspend User</button>
                  </div>
                ) : (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px', color: '#be123c' }}><Ban size={16}/> Suspend Account</h3>
                    <p style={{ fontSize: '13px', color: '#9f1239', margin: '0 0 16px 0', flex: 1 }}>Instantly block user from accessing the platform.</p>
                    <button className="btn btn-danger" onClick={() => handleAction('ban')} disabled={actionLoading}>Suspend User</button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
