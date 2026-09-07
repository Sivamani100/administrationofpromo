import { createClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { 
  User, Mail, Calendar, Shield, Activity, MapPin, 
  AlertTriangle, History, Ban, Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'
import UserActions from './UserActions'

export const dynamic = 'force-dynamic'

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  
  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // Fetch social accounts
  const { data: socials } = await supabase
    .from('user_social_accounts')
    .select('*')
    .eq('user_id', params.id)

  // Fetch warnings
  const { data: warnings } = await supabase
    .from('user_warnings')
    .select('*, issuer:profiles!user_warnings_issued_by_fkey(display_name)')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false })

  // Fetch recent logins
  const { data: logins } = await supabase
    .from('login_history')
    .select('*')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="page-wrap">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700
            }}>
              {profile.display_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {profile.display_name || 'Anonymous User'}
                {profile.account_status === 'banned' && (
                  <span className="badge badge-red" style={{ fontSize: 12 }}><Ban size={12}/> Banned</span>
                )}
                {profile.account_status === 'suspended' && (
                  <span className="badge badge-yellow" style={{ fontSize: 12 }}>Suspended</span>
                )}
              </h1>
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Shield size={14}/> {profile.role}
              </p>
            </div>
          </div>
        </div>
        <div className="page-header-right">
          <UserActions userId={profile.id} status={profile.account_status} />
        </div>
      </div>

      <div className="charts-grid">
        {/* Left Col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LinkIcon size={16}/> Connected Social Accounts
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {socials && socials.length > 0 ? (
                <div className="table-responsive">
          <table style={{ margin: 0 }}>
                  <tbody>
                    {socials.map(s => (
                      <tr key={s.id}>
                        <td style={{ padding: '12px 20px', fontWeight: 600, textTransform: 'capitalize' }}>
                          {s.platform}
                        </td>
                        <td style={{ padding: '12px 20px' }}>@{s.social_username}</td>
                        <td style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--text-2)' }}>
                          {s.follower_count?.toLocaleString()} followers
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        </div>
              ) : (
                <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 13 }}>No social accounts linked.</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16}/> Warning History
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {warnings && warnings.length > 0 ? (
                <div className="table-responsive">
          <table style={{ margin: 0 }}>
                  <tbody>
                    {warnings.map(w => (
                      <tr key={w.id}>
                        <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-2)' }}>
                          {new Date(w.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 20px' }}>{w.reason}</td>
                        <td style={{ padding: '12px 20px' }}>
                          {w.status === 'active' ? (
                            <span className="badge badge-red">Active</span>
                          ) : (
                            <span className="badge badge-green">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        </div>
              ) : (
                <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 13 }}>No warnings issued.</div>
              )}
            </div>
          </div>

        </div>

        {/* Right Col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div className="card">
            <div className="card-header">
              <div className="card-title">Profile Details</div>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{profile.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Joined</div>
                  <div style={{ fontSize: 13 }}>{new Date(profile.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Last Seen</div>
                  <div style={{ fontSize: 13 }}>{profile.last_seen ? new Date(profile.last_seen).toLocaleString() : 'Never'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={16}/> Recent Logins
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {logins && logins.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {logins.map(l => (
                    <div key={l.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{l.ip_address}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(l.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <MapPin size={12}/> {l.city ? `${l.city}, ${l.country}` : (l.country || 'Unknown')}
                        {l.is_suspicious && <span className="badge badge-red" style={{ padding: '1px 4px', fontSize: 10 }}>Suspicious</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 13 }}>No login history available.</div>
              )}
              <div className="card-footer" style={{ borderTop: 'none', padding: '12px 20px' }}>
                <Link href="/login-history" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>View full history &rarr;</Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
