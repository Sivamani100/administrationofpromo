'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Save, RefreshCw, AlertTriangle, CheckCircle2, Settings, DollarSign, Users, Mail } from 'lucide-react'

type Settings = {
  maintenance_mode: boolean
  allow_new_registrations: boolean
  allow_brand_signup: boolean
  allow_influencer_signup: boolean
  require_email_verification: boolean
  max_campaigns_per_user: number
  platform_fee_percent: number
  support_email: string
}

const DEFAULTS: Settings = {
  maintenance_mode: false,
  allow_new_registrations: true,
  allow_brand_signup: true,
  allow_influencer_signup: true,
  require_email_verification: true,
  max_campaigns_per_user: 10,
  platform_fee_percent: 15,
  support_email: 'support@promo.app',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const sb = createClient()
      const { data } = await sb.from('platform_settings').select('*').single()
      if (data) setSettings({ ...DEFAULTS, ...data })
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true); setSaved(false)
    const sb = createClient()
    await sb.from('platform_settings').upsert(settings)
    await sb.from('audit_logs').insert({ action: 'admin_update_settings', metadata: settings })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function Toggle({ field }: { field: keyof Settings }) {
    const val = settings[field] as boolean
    return (
      <label className="toggle">
        <input type="checkbox" checked={val} onChange={e => setSettings(s => ({ ...s, [field]: e.target.checked }))} />
        <span className="toggle-slider" />
      </label>
    )
  }

  const FLAGS = [
    { label: 'Maintenance Mode',           field: 'maintenance_mode',           desc: 'Block all user access to the app', danger: true },
    { label: 'Allow New Registrations',    field: 'allow_new_registrations',    desc: 'Let new users sign up' },
    { label: 'Allow Brand Signup',         field: 'allow_brand_signup',         desc: 'Allow brand account creation' },
    { label: 'Allow Influencer Signup',    field: 'allow_influencer_signup',    desc: 'Allow influencer account creation' },
    { label: 'Require Email Verification', field: 'require_email_verification', desc: 'Users must verify email before access' },
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>General Settings</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Platform-wide configuration and feature flags</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saved && (
              <span style={{ color: 'var(--green)', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle2 size={15} /> Saved!
              </span>
            )}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}
              style={{ padding: '8px 18px', fontSize: 13, gap: 7, borderRadius: 8 }}>
              {saving ? <span className="spinner" /> : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

              {/* Feature Toggles */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Settings size={15} color="var(--primary)" /> Feature Flags
                </div>
                <div style={{ padding: '8px 20px 20px' }}>
                  {settings.maintenance_mode && (
                    <div style={{ background: '#fee2e2', color: '#ef4444', borderRadius: 8, padding: '10px 14px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                      <AlertTriangle size={15} /> Maintenance mode is ON — users cannot access the app
                    </div>
                  )}
                  {FLAGS.map(item => (
                    <div key={item.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: (item as any).danger ? '#ef4444' : 'var(--text-1)' }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{item.desc}</div>
                      </div>
                      <Toggle field={item.field as keyof Settings} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Platform Config */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={15} color="var(--primary)" /> Platform Config
                  </div>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={13} /> Max Campaigns per User
                      </label>
                      <input type="number" className="form-input" min={1} max={100}
                        value={settings.max_campaigns_per_user}
                        onChange={e => setSettings(s => ({ ...s, max_campaigns_per_user: +e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DollarSign size={13} /> Platform Fee (%)
                      </label>
                      <input type="number" className="form-input" min={0} max={100} step={0.5}
                        value={settings.platform_fee_percent}
                        onChange={e => setSettings(s => ({ ...s, platform_fee_percent: +e.target.value }))} />
                      <div className="form-hint">Commission percentage taken from each transaction.</div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={13} /> Support Email
                      </label>
                      <input type="email" className="form-input"
                        value={settings.support_email}
                        onChange={e => setSettings(s => ({ ...s, support_email: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div style={{ border: '1px solid #fca5a5', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #fca5a5', fontWeight: 700, fontSize: 14, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={15} /> Danger Zone
                  </div>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button className="btn btn-secondary" style={{ justifyContent: 'center', width: '100%' }}>
                      <RefreshCw size={14} /> Clear App Cache
                    </button>
                    <button className="btn btn-secondary" style={{ justifyContent: 'center', width: '100%', color: '#ef4444', borderColor: '#fca5a5', opacity: 0.7, cursor: 'not-allowed' }} disabled>
                      <AlertTriangle size={14} /> Purge All Sessions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
