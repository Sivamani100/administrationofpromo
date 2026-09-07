'use client'

import { useState } from 'react'
import { Send, Users, Tag, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { broadcastEmail } from '@/app/actions/admin'

const AUDIENCES = [
  { label: 'All Users',       value: 'all',          icon: <Users size={15} />,  desc: 'Every registered account' },
  { label: 'Brand Accounts',  value: 'brand',        icon: <Tag size={15} />,    desc: 'Brands & advertisers only' },
  { label: 'Influencers',     value: 'influencer',   icon: <Users size={15} />,  desc: 'Content creators only' },
  { label: 'Verified Users',  value: 'verified',     icon: <CheckCircle2 size={15} />, desc: 'KYC-verified accounts' },
  { label: 'Unverified',      value: 'unverified',   icon: <AlertCircle size={15} />, desc: 'Users pending verification' },
]

export default function EmailsPage() {
  const [subject, setSubject] = useState('')
  const [body, setBody]       = useState('')
  const [target, setTarget]   = useState('all')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    setSending(true); setError(''); setSent(false)
    try {
      await broadcastEmail(subject, body, target)
      setSent(true)
      setSubject(''); setBody('')
    } catch {
      setError('Failed to send. Please try again.')
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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>Broadcast Email</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-3)' }}>Send emails to users across the platform</p>
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
                <Mail size={16} color="var(--primary)" /> Compose Message
              </div>
              <div style={{ padding: '20px' }}>
                {sent && (
                  <div style={{ background: 'var(--green-bg)', color: 'var(--green)', borderRadius: 8, padding: '12px 16px', marginBottom: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} /> Email broadcast queued successfully!
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
                    <div className="form-hint">Select which group of users will receive this email.</div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Subject Line</label>
                    <input type="text" className="form-input" placeholder="e.g. Important update about your account"
                      value={subject} onChange={e => setSubject(e.target.value)} required />
                    <div className="form-hint">{subject.length}/60 characters recommended</div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Email Body</label>
                    <textarea className="form-textarea" rows={10} placeholder="Write your email content here…"
                      value={body} onChange={e => setBody(e.target.value)} required style={{ minHeight: 220 }} />
                    <div className="form-hint">Plain text. HTML tags will be escaped.</div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={sending}
                    style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, gap: 8, borderRadius: '10px' }}>
                    {sending ? <span className="spinner" /> : <><Send size={15} /> Send Broadcast</>}
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

              {/* Tips Card */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>💡 Tips</div>
                <div style={{ padding: '14px 18px' }}>
                  <ul style={{ paddingLeft: 16, color: 'var(--text-2)', fontSize: 13, lineHeight: 2, margin: 0 }}>
                    <li>Keep subject lines under 60 characters</li>
                    <li>Always test with a small group first</li>
                    <li>Include an unsubscribe note in body</li>
                    <li>Avoid ALL CAPS and spam triggers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
