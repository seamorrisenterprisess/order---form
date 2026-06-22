'use client'

import { useState, useActionState, useRef, useEffect } from 'react'
import { saveAsTemplate } from '@/lib/actions'

export function SaveTemplateButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(saveAsTemplate, null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.success) {
      setOpen(false)
    }
  }, [state])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '7px 14px', border: '1.5px solid #8BAAC4', borderRadius: '7px',
          background: 'white', fontSize: '13px', color: '#4D6B8A', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '5px',
        }}
      >
        &#9734; Save as Template
      </button>
    )
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F4F8FF', border: '1.5px solid #D4E4F4', borderRadius: '8px', padding: '5px 10px' }}>
      {state?.error && (
        <span style={{ fontSize: '11px', color: '#C0392B' }}>{state.error}</span>
      )}
      <form action={action} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <input type="hidden" name="order_id" value={orderId} />
        <input
          ref={inputRef}
          name="template_name"
          type="text"
          placeholder="Template name…"
          autoFocus
          style={{
            padding: '5px 10px', border: '1.5px solid #D4E4F4', borderRadius: '6px',
            fontSize: '13px', color: '#0F2137', outline: 'none', width: '180px',
            fontFamily: 'var(--font-body)',
          }}
        />
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: '5px 12px', background: pending ? '#8BAAC4' : '#1355C2', color: 'white',
            border: 'none', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600,
            cursor: pending ? 'not-allowed' : 'pointer',
          }}
        >
          {pending ? '...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{ padding: '5px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#8BAAC4', fontSize: '14px' }}
        >
          &#10005;
        </button>
      </form>
    </div>
  )
}
