'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions'
import { useState } from 'react'

const QUICK_LOGINS = [
  { label: 'Marcus Webb', role: 'Operations Analyst', email: 'marcus@seamorris.com' },
  { label: 'Claire Okafor', role: 'Account Manager', email: 'claire@seamorris.com' },
  { label: 'Admin User', role: 'Admin', email: 'admin@seamorris.com' },
]

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)
  const [email, setEmail] = useState('marcus@seamorris.com')
  const [password, setPassword] = useState('seamorris2024')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0B1829 0%, #0F2D4A 50%, #0B1829 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '40px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{
            width: '46px', height: '46px', background: '#1355C2', borderRadius: '11px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '20px', color: 'white',
            boxShadow: '0 8px 20px rgba(19,85,194,0.4)', flexShrink: 0,
          }}>SM</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#0B1829' }}>Sea Morris</div>
            <div style={{ fontSize: '11px', color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>Operations Platform</div>
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: '#0B1829', marginBottom: '6px' }}>
          Scope Order Manager
        </div>
        <div style={{ fontSize: '13.5px', color: '#4D6B8A', marginBottom: '24px' }}>Sign in to continue</div>

        {state?.error && (
          <div style={{
            background: '#FDECEA', border: '1px solid #e8a09a', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', fontSize: '13.5px', color: '#C0392B',
          }}>
            {state.error}
          </div>
        )}

        <form action={action}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0F2137', marginBottom: '5px' }}>Email</label>
            <input
              type="email" name="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #D4E4F4',
                borderRadius: '7px', fontSize: '13.5px', color: '#0F2137', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0F2137', marginBottom: '5px' }}>Password</label>
            <input
              type="password" name="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #D4E4F4',
                borderRadius: '7px', fontSize: '13.5px', color: '#0F2137', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit" disabled={pending}
            style={{
              width: '100%', padding: '11px', background: pending ? '#8BAAC4' : '#1355C2',
              color: 'white', border: 'none', borderRadius: '7px',
              fontSize: '14px', fontWeight: 600, cursor: pending ? 'not-allowed' : 'pointer',
            }}>
            {pending ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        {/* Quick logins */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #D4E4F4' }}>
          <div style={{ fontSize: '11px', color: '#8BAAC4', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Demo accounts (password: seamorris2024)
          </div>
          {QUICK_LOGINS.map(q => (
            <button
              key={q.email}
              type="button"
              onClick={() => { setEmail(q.email); setPassword('seamorris2024') }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: '#F4F8FF', border: '1.5px solid #D4E4F4',
                borderRadius: '7px', padding: '8px 12px', fontSize: '12.5px',
                cursor: 'pointer', color: '#0F2137', marginBottom: '6px',
              }}>
              <strong style={{ color: '#1355C2' }}>{q.label}</strong>
              <span style={{ color: '#4D6B8A' }}> — {q.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
