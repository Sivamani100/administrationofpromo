import { createClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  Briefcase, DollarSign, Calendar, MapPin, 
  Users, CheckCircle2, AlertTriangle, EyeOff, CheckCircle 
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  
  // Fetch Campaign Data
  const { data: campaign, error: campaignError } = await supabase
    .from('cards')
    .select('*, brand:profiles!brand_id(id, display_name)')
    .eq('id', params.id)
    .single()

  if (campaignError || !campaign) {
    notFound()
  }

  // Fetch Applications Data
  const { data: apps } = await supabase
    .from('applications')
    .select('*, influencer:profiles!applications_influencer_id_fkey(id, display_name)')
    .eq('card_id', params.id)
    .order('created_at', { ascending: false })

  const statusBadge = (status: string) =>
    status === 'suspended' ? <span className="badge badge-red">Suspended</span> :
    status === 'active'   ? <span className="badge badge-green">Active</span> :
    status === 'pending'  ? <span className="badge badge-yellow">Pending</span> :
    status === 'draft'    ? <span className="badge badge-gray">Draft</span> :
                            <span className="badge badge-blue">{status}</span>

  return (
    <div className="page-wrap">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, background: 'var(--primary)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Briefcase size={28} />
            </div>
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {campaign.title}
                {statusBadge(campaign.status)}
              </h1>
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                by <Link href={`/users/${campaign.brand?.id}`} style={{ fontWeight: 600, color: 'var(--primary)' }}>{campaign.brand?.display_name || 'Anonymous'}</Link>
              </p>
            </div>
          </div>
        </div>
        <div className="page-header-right">
          {campaign.status === 'suspended' ? (
            <button className="btn btn-primary" disabled><CheckCircle size={15}/> Reactivate (Use Table)</button>
          ) : (
            <button className="btn btn-danger" disabled><EyeOff size={15}/> Suspend (Use Table)</button>
          )}
        </div>
      </div>

      <div className="charts-grid">
        {/* Left Column: Campaign Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Campaign Details</div>
            </div>
            <div className="card-body">
              <p style={{ color: 'var(--text-1)', lineHeight: 1.6, marginBottom: 20 }}>
                {campaign.description || 'No description provided.'}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{campaign.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Category</div>
                  <div style={{ fontSize: 13, textTransform: 'capitalize' }}>{campaign.category || 'General'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Platform</div>
                  <div style={{ fontSize: 13, textTransform: 'capitalize' }}>{campaign.platform || 'Any'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Budget</div>
                  <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DollarSign size={14}/> {campaign.budget_range || 'Negotiable'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Location</div>
                  <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14}/> {campaign.location || 'Remote'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Created At</div>
                  <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14}/> {new Date(campaign.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Applications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16}/> Applications
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {apps && apps.length > 0 ? (
                <div className="table-responsive">
          <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px 20px', fontSize: 11 }}>Influencer</th>
                      <th style={{ padding: '12px 20px', fontSize: 11 }}>Status</th>
                      <th style={{ padding: '12px 20px', fontSize: 11 }}>Proposed Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map(a => (
                      <tr key={a.id}>
                        <td style={{ padding: '12px 20px', fontWeight: 600 }}>
                          <Link href={`/users/${a.influencer_id}`} style={{ color: 'var(--primary)' }}>
                            {a.influencer?.display_name || 'Anonymous User'}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span className={`badge ${a.status === 'accepted' ? 'badge-green' : a.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px', color: 'var(--text-2)' }}>
                          {a.proposed_rate || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        </div>
              ) : (
                <div style={{ padding: 20, color: 'var(--text-3)', fontSize: 13 }}>No applications yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
