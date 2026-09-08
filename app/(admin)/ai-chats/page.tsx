'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Search, RefreshCw, Bot, User, MessageSquare, Save, Key, Cpu, Server } from 'lucide-react'
import Link from 'next/link'
import { getAiConfig, updateAiConfig } from '@/app/actions/admin'

type ChatMessage = {
  id: string
  created_at: string
  user_id: string
  message: string
  is_user: boolean
  user?: { display_name: string }
}

const PAGE_SIZE = 12

export default function AiChatsPage() {
  const [chats, setChats]           = useState<ChatMessage[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('all')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)

  const [stats, setStats] = useState({
    total: 0,
    userMsgs: 0,
    aiMsgs: 0
  })

  const [aiConfig, setAiConfig] = useState({ provider: '', model: '', api_key: '' })
  const [configSaving, setConfigSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    
    // Quick Stats
    const [allRes, config] = await Promise.all([
      sb.from('ai_assistant_chats').select('*', { count: 'exact', head: true }).eq('is_user', true),
      getAiConfig()
    ])
    
    setAiConfig(config)
    
    setStats({
      total: allRes.count || 0,
      userMsgs: allRes.count || 0,
      aiMsgs: 0
    })

    let q = sb.from('ai_assistant_chats')
      .select('*, user:profiles!ai_assistant_chats_user_id_fkey(display_name)', { count: 'exact' })
      .eq('is_user', true)
      
    if (search) q = q.ilike('message', `%${search}%`)
    
    q = q.order('created_at', { ascending: false })
         .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
         
    const { data, count } = await q
    if (data) { 
      setChats(data as ChatMessage[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setConfigSaving(true)
    try {
      await updateAiConfig(aiConfig)
      alert('AI Configuration updated successfully!')
    } catch (err) {
      console.error(err)
      alert('Failed to update configuration.')
    } finally {
      setConfigSaving(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const STATS = [
    { label: 'Total User Messages', value: stats.total.toLocaleString(), icon: <MessageSquare size={16} />, color: '#6366f1', bg: '#ede9fe' },
    { label: 'Unique Users', value: stats.userMsgs.toLocaleString(), icon: <User size={16} />, color: '#10b981', bg: '#d1fae5' }
  ]

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
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-1)' }}>AI Chat Logs</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className="header-live-text" style={{ fontSize: '12px', color: 'var(--text-3)', marginRight: '8px' }}>Live Overview</span>
            <button onClick={load} className="btn btn-secondary header-btn" style={{ padding: '8px 16px', fontSize: '13px', gap: '6px', borderRadius: '8px' }}>
              <RefreshCw size={14} className="header-icon"/> Refresh
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          
          <div style={{ marginBottom: '32px', border: '1px solid var(--border)', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="var(--primary)" />
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>AI Provider Settings</h3>
            </div>
            <form onSubmit={handleSaveConfig} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px' }}><Server size={14} /> Provider</label>
                  <select 
                    className="input" 
                    value={aiConfig.provider} 
                    onChange={e => setAiConfig({...aiConfig, provider: e.target.value})}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                    required
                  >
                    <option value="">Select Provider</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px' }}><Cpu size={14} /> Model Name</label>
                  <input 
                    className="input" 
                    placeholder="e.g. gemini-1.5-pro" 
                    value={aiConfig.model} 
                    onChange={e => setAiConfig({...aiConfig, model: e.target.value})}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '6px' }}><Key size={14} /> API Key</label>
                <input 
                  type="password"
                  className="input" 
                  placeholder="Enter API Key" 
                  value={aiConfig.api_key} 
                  onChange={e => setAiConfig({...aiConfig, api_key: e.target.value})}
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={configSaving || loading} style={{ padding: '8px 20px', borderRadius: '8px', gap: '6px' }}>
                  <Save size={16} /> {configSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${STATS.length}, 1fr)` }}>
              {STATS.map((s, i) => (
                <div key={i} style={{ 
                  border: '1px solid rgba(0,0,0,0.04)', borderRadius: '12px', padding: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.icon}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    {loading ? (
                      <div className="skeleton" style={{ height: 26, width: 80 }} />
                    ) : (
                      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                        {s.value}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-toolbar">
              <div className="table-toolbar-left">
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>User Chat Logs</h3>
              </div>
              <div className="table-toolbar-right">
                <div className="search-input-wrap">
                  <Search size={16} />
                  <input placeholder="Search messages…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ width: '320px' }} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Date</th>
                      <th style={{ width: '30%' }}>User</th>
                      <th style={{ width: '50%' }}>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 3 }).map((_, j) => (
                              <td key={j}><div className="skeleton" style={{ height: 16, width: j === 2 ? 240 : 80 }} /></td>
                            ))}
                          </tr>
                        ))
                      : chats.length === 0
                        ? <tr><td colSpan={3}><div className="empty-state"><MessageSquare /><h3>No user conversations</h3></div></td></tr>
                        : chats.map(c => (
                          <tr key={c.id}>
                            <td>
                              <div style={{ color: 'var(--text-2)', fontSize: 12 }}>
                                {new Date(c.created_at).toLocaleString()}
                              </div>
                            </td>
                            <td>
                              <Link href={`/users/${c.user_id}`} style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} /> {c.user?.display_name || 'Unknown User'}
                              </Link>
                            </td>
                            <td>
                              <div style={{ 
                                fontSize: 13, 
                                color: 'var(--text-1)',
                                fontWeight: 500,
                                lineHeight: 1.5
                              }}>
                                {c.message}
                              </div>
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pagination">
              <span className="pagination-info">
                {total > 0 ? `${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : '0 of 0'}
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
    </div>
  )
}
