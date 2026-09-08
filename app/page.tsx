'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1400&q=85&fit=crop',
    title: 'Manage Your Platform.',
    sub: 'Monitor users, campaigns, and analytics — all from one unified admin control panel.'
  },
  {
    url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1400&q=85&fit=crop',
    title: 'Real-time Insights.',
    sub: 'Track growth, engagement, and activity as it happens across the platform.'
  },
  {
    url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1400&q=85&fit=crop',
    title: 'Full Control.',
    sub: 'Moderate content, manage users, and handle disputes with powerful admin tools.'
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPass] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [slide, setSlide]           = useState(0)

  // Auto-advance slides
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4000)
    return () => clearInterval(t)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const current = SLIDES[slide]

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: '#f4f4f6',
    }}>

      {/* ── Left — Form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 80px',
        background: '#fff',
        height: '100vh',
        overflowY: 'auto',
      }}>

        <div style={{ width: '100%', maxWidth: 380 }}>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', margin: '0 0 6px', letterSpacing: -0.4 }}>
          Welcome Back!
        </h1>
        <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 32px' }}>
          Sign in to your admin account
        </p>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#dc2626', borderRadius: 10, padding: '12px 16px',
            fontSize: 13, fontWeight: 500, marginBottom: 20
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Email</label>
            <input
              type="email"
              placeholder="admin@promo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                padding: '11px 14px', borderRadius: 10,
                border: '1.5px solid #e5e7eb', fontSize: 14,
                outline: 'none', background: '#fafafa', color: '#111',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '11px 52px 11px 14px',
                  borderRadius: 10, border: '1.5px solid #e5e7eb',
                  fontSize: 14, outline: 'none', background: '#fafafa',
                  color: '#111', boxSizing: 'border-box', transition: 'border-color 0.2s'
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#6b7280',
                  fontSize: 12, fontWeight: 600, padding: '4px 6px'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Sign In */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6, padding: '13px',
              background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        </div>
      </div>

      {/* ── Right — Rounded Image Carousel ── */}
      <div style={{
        width: '55%',
        flexShrink: 0,
        padding: '10px 10px 10px 0',
        display: 'flex',
        alignItems: 'stretch',
      }}>
        <div style={{
          flex: 1,
          borderRadius: 24,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Slides */}
          {SLIDES.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', inset: 0,
                opacity: i === slide ? 1 : 0,
                transition: 'opacity 0.8s ease',
                zIndex: i === slide ? 1 : 0,
              }}
            >
              <img
                src={s.url}
                alt={s.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))}

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)',
          }} />

          {/* Text + dots */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            zIndex: 3, padding: '36px 36px 32px'
          }}>
            <h2 style={{
              color: '#fff', fontSize: 32, fontWeight: 800,
              margin: '0 0 10px', lineHeight: 1.18, letterSpacing: -0.6,
              transition: 'opacity 0.4s'
            }}>
              {current.title}
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.72)', fontSize: 14,
              margin: '0 0 24px', lineHeight: 1.7, maxWidth: 320
            }}>
              {current.sub}
            </p>

            {/* Dot indicators */}
            <div style={{ display: 'flex', gap: 8 }}>
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  style={{
                    width: i === slide ? 24 : 8,
                    height: 8, borderRadius: 999,
                    background: i === slide ? '#fff' : 'rgba(255,255,255,0.4)',
                    border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
