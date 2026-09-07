'use client'

import { useState } from 'react'
import { Ban, AlertTriangle, CheckCircle } from 'lucide-react'
import { banUser, unbanUser } from '@/app/actions/admin'
import { useRouter } from 'next/navigation'

export default function UserActions({ 
  userId, 
  status 
}: { 
  userId: string
  status: string 
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleToggleBan() {
    setLoading(true)
    try {
      if (status === 'suspended') {
        await unbanUser(userId)
      } else {
        await banUser(userId)
      }
      router.refresh()
    } catch (e) {
      console.error('Failed to toggle ban', e)
    }
    setLoading(false)
  }

  return (
    <>
      <button 
        className={`btn ${status === 'suspended' ? 'btn-primary' : 'btn-secondary'}`} 
        onClick={handleToggleBan}
        disabled={loading}
      >
        {loading ? <span className="spinner" /> : (
          <>
            {status === 'suspended' ? <CheckCircle size={15} /> : <Ban size={15}/>}
            {status === 'suspended' ? 'Un-suspend User' : 'Suspend User'}
          </>
        )}
      </button>
      {/* Warning button is a stub for now, as warnings require a more complex modal for reason input */}
      <button className="btn btn-danger" onClick={() => alert('Issuing warnings will be implemented in a future update. For now, use the Suspend feature.')}>
        <AlertTriangle size={15}/> Issue Warning
      </button>
    </>
  )
}
