'use client'

import { useActionState } from 'react'
import { createUser } from '@/lib/actions'

const inputStyle = {
  padding: '9px 12px', border: '1.5px solid #D4E4F4', borderRadius: '7px',
  fontSize: '13.5px', color: '#0F2137', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  fontFamily: 'var(--font-body)',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F2137' }}>
        {label}{required && <span style={{ color: '#C0392B' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

export function NewUserForm() {
  const [state, action, pending] = useActionState(createUser, null)

  return (
    <form action={action}>
      {state?.error && (
        <div style={{ background: '#FDECEA', border: '1px solid #e8a09a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#C0392B', fontSize: '13.5px' }}>
          {state.error}
        </div>
      )}
      {state?.success && (
        <div style={{ background: '#E6F7F0', border: '1px solid #7CBFA2', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#0D7A4E', fontSize: '13.5px' }}>
          User created successfully.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <Field label="Full Name" required>
          <input style={inputStyle} type="text" name="name" placeholder="Jane Smith" autoComplete="off" />
        </Field>
        <Field label="Email Address" required>
          <input style={inputStyle} type="email" name="email" placeholder="jane@seamorris.com" autoComplete="off" />
        </Field>
        <Field label="Password" required>
          <input style={inputStyle} type="password" name="password" placeholder="Min. 8 characters" autoComplete="new-password" />
        </Field>
        <Field label="Role" required>
          <select style={inputStyle} name="role">
            <option value="">Select role…</option>
            <option value="operations_analyst">Operations Analyst</option>
            <option value="account_manager">Account Manager</option>
            <option value="admin">Administrator</option>
          </select>
        </Field>
      </div>
      <button
        type="submit"
        disabled={pending}
        style={{
          padding: '9px 22px', background: pending ? '#8BAAC4' : '#1355C2',
          color: 'white', border: 'none', borderRadius: '7px',
          fontSize: '13.5px', fontWeight: 600, cursor: pending ? 'not-allowed' : 'pointer',
        }}>
        {pending ? 'Creating…' : 'Create User'}
      </button>
    </form>
  )
}
