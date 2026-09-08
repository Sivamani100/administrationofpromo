'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { X, Trash2 } from 'lucide-react'
import { adminDeleteMessage } from '@/app/actions/admin'

type Message = {
  id: string
  sender_id: string
  content: string
  created_at: string
  payload: any
  profiles?: {
    display_name: string
    avatar_url: string
  }
}

type ChatViewModalProps = {
  room: {
    id: string
    brand?: { display_name: string }
    influencer?: { display_name: string }
  }
  onClose: () => void
}

export default function ChatViewModal({ room, onClose }: ChatViewModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  const loadMessages = async () => {
    const sb = createClient()
    const { data } = await sb
      .from('messages')
      .select('id, sender_id, content, created_at, payload, profiles!inner(display_name, avatar_url)')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data as Message[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadMessages()
  }, [room.id])

  const handleDelete = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message? This will overwrite the content and remove any attachments.')) return
    
    try {
      await adminDeleteMessage(msgId, room.id)
      // Reload messages to show updated content
      loadMessages()
    } catch (e) {
      console.error(e)
      alert('Failed to delete message.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600, height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Chat History - {room.brand?.display_name} & {room.influencer?.display_name}</span>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <span className="spinner" />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', marginTop: 40 }}>No messages in this chat.</div>
          ) : (
            messages.map(msg => {
              const isDeleted = msg.payload?.deleted_everyone === true || msg.content === 'Deleted by the admin as it violates the rules of the application'
              
              return (
                <div key={msg.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-3)', flexShrink: 0, overflow: 'hidden' }}>
                    {msg.profiles?.avatar_url ? (
                      <img src={msg.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text-3)' }}>
                        {msg.profiles?.display_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{msg.profiles?.display_name || 'Unknown'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ 
                      background: 'var(--bg-2)', 
                      padding: '12px', 
                      borderRadius: '0 12px 12px 12px',
                      fontSize: 14,
                      color: isDeleted ? 'var(--text-3)' : 'var(--text-1)',
                      fontStyle: isDeleted ? 'italic' : 'normal',
                      border: '1px solid var(--border)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                  {!isDeleted && (
                    <button 
                      onClick={() => handleDelete(msg.id)}
                      className="btn btn-secondary" 
                      style={{ padding: '6px', color: 'var(--red)', border: 'none', background: 'transparent' }}
                      title="Delete Message"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
