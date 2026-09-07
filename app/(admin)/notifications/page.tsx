'use client'

import { useState } from 'react'
import { Bell, Send, Users, Tag, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const AUDIENCES = [
  { label: 'All Users',      value: 'all',         icon: <Users size={15} />,        desc: 'Every registered account' },
  { label: 'Brands',         value: 'brand',        icon: <Tag size={15} />,          desc: 'Brand & advertiser accounts' },
  { label: 'Influencers',    value: 'influencer',   icon: <Users size={15} />,        desc: 'Content creator accounts' },
  { label: 'Verified Users', value: 'verified',     icon: <CheckCircle2 size={15} />, desc: 'KYC-verified users only' },
]

export default function NotificationsPage() {
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [target, setTarget] = useState('all')
  const [sending, setSending] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true); setError(''); setSent(false)
    try {
      const sb = createClient()
      await sb.from('audit_logs').insert({
        action: 'admin_push_notification',
        metadata: { title, body: body.slice(0, 100), target },
      })
      // In production: await sb.functions.invoke('send-push', { body: { title, body, target } })
      setSent(true); setTitle(''); setBody('')
    } catch {
      setError('Failed to send notification.')
    }
    setSending(false)
  }

  const selectedAudience = AUDIENCES.find(a => a.value === target)

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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Push Notifications</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Send push notifications to app users</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Target:</span>
            <span className="badge badge-blue">{selectedAudience?.label}</span>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

            {/* Compose Form */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} color="var(--primary)" /> Compose Notification
              </div>
              <div style={{ padding: '20px' }}>
                {sent && (
                  <div style={{ background: 'var(--green-bg)', color: 'var(--green)', borderRadius: 8, padding: '12px 16px', marginBottom: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} /> Notification queued successfully!
                  </div>
                )}
                {error && (
                  <div style={{ background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 8, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} /> {error}
                  </div>
                )}
                <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Target Audience</label>
                    <select className="form-select" value={target} onChange={e => setTarget(e.target.value)}>
                      {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Notification Title</label>
                    <input type="text" className="form-input" placeholder="e.g. New feature available!"
                      value={title} onChange={e => setTitle(e.target.value)} required maxLength={65} />
                    <div className="form-hint">{title.length}/65 characters</div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Message Body</label>
                    <textarea className="form-textarea" rows={4} placeholder="Write your notification message…"
                      value={body} onChange={e => setBody(e.target.value)} required maxLength={200} />
                    <div className="form-hint">{body.length}/200 characters</div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={sending}
                    style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, gap: 8, borderRadius: '10px' }}>
                    {sending ? <span className="spinner" /> : <><Send size={15} /> Send Push Notification</>}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Audience Picker */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>Audience</div>
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {AUDIENCES.map(o => (
                    <div key={o.value} onClick={() => setTarget(o.value)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: '8px', cursor: 'pointer', border: '1px solid',
                      borderColor: target === o.value ? 'var(--primary)' : 'var(--border)',
                      background: target === o.value ? '#ede9fe' : 'var(--bg-3)',
                      color: target === o.value ? 'var(--primary)' : 'var(--text-1)',
                      transition: 'all 0.15s ease',
                    }}>
                      {o.icon}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{o.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 1 }}>{o.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>Live Preview</div>
                <div style={{ padding: '14px 18px' }}>
                  <div style={{
                    background: 'var(--sidebar-bg)', borderRadius: 14, padding: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 38, height: 38, background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Bell size={18} color="#fff" />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Promo App</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>now</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 6 }}>
                      {title || 'Notification Title'}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                      {body || 'Your notification message will appear here.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
