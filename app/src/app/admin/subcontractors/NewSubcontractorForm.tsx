'use client'

import { useActionState } from 'react'
import { createSubcontractor } from '@/lib/actions'

const inputStyle = {
  padding: '8px 11px', border: '1.5px solid #D4E4F4', borderRadius: '7px',
  fontSize: '13px', color: '#0F2137', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  fontFamily: 'var(--font-body)',
}

export function NewSubcontractorForm() {
  const [state, action, pending] = useActionState(createSubcontractor, null)

  return (
    <form action={action}>
      {state?.error && (
        <div style={{ background: '#FDECEA', border: '1px solid #e8a09a', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#C0392B', fontSize: '13px' }}>
          {state.error}
        </div>
      )}
      {state?.success && (
        <div style={{ background: '#E6F7F0', border: '1px solid #a3d9c0', borderRadius: '7px', padding: '10px 14px', marginBottom: '14px', color: '#0D7A4E', fontSize: '13px' }}>
          Subcontractor added successfully.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '12px', alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4D6B8A' }}>Company Name <span style={{ color: '#C0392B' }}>*</span></label>
          <input style={inputStyle} type="text" name="name" placeholder="Austin Pro Roofing" required />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4D6B8A' }}>Contact Name</label>
          <input style={inputStyle} type="text" name="contact_name" placeholder="Jane Smith" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4D6B8A' }}>Phone</label>
          <input style={inputStyle} type="tel" name="phone" placeholder="(512) 555-0000" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4D6B8A' }}>Email</label>
          <input style={inputStyle} type="email" name="email" placeholder="jane@example.com" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#4D6B8A' }}>Specialty</label>
          <input style={inputStyle} type="text" name="specialty" placeholder="Roofing" />
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{ padding: '9px 16px', background: pending ? '#8BAAC4' : '#1355C2', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {pending ? 'Adding…' : '+ Add'}
        </button>
      </div>
    </form>
  )
}
