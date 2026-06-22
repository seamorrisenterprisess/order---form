'use client'

import { useTransition } from 'react'
import { duplicateOrder } from '@/lib/actions'

export function DuplicateButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await duplicateOrder(orderId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title="Duplicate this order as a new draft"
      style={{
        padding: '7px 14px',
        border: '1.5px solid #D4E4F4',
        borderRadius: '7px',
        background: 'white',
        color: '#4D6B8A',
        fontSize: '13px',
        fontWeight: 500,
        cursor: pending ? 'default' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        opacity: pending ? 0.6 : 1,
      }}>
      {pending ? '…' : '⧉ Duplicate'}
    </button>
  )
}
