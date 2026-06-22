'use client'

import { useTransition } from 'react'
import { setSubcontractorActive } from '@/lib/actions'
import type { Subcontractor } from '@/types'

export function SubcontractorRow({ sub, isLast }: { sub: Subcontractor; isLast: boolean }) {
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      await setSubcontractorActive(sub.id, !sub.active)
    })
  }

  const cellStyle = {
    padding: '12px 16px',
    borderBottom: isLast ? 'none' : '1px solid #F0F4F8',
    color: '#0F2137',
    verticalAlign: 'middle' as const,
  }

  return (
    <tr style={{ opacity: sub.active ? 1 : 0.5 }}>
      <td style={{ ...cellStyle, fontWeight: 600 }}>{sub.name}</td>
      <td style={{ ...cellStyle, color: '#4D6B8A' }}>{sub.contact_name || '—'}</td>
      <td style={{ ...cellStyle, color: '#4D6B8A' }}>{sub.phone || '—'}</td>
      <td style={{ ...cellStyle, color: '#4D6B8A' }}>{sub.email || '—'}</td>
      <td style={cellStyle}>
        {sub.specialty ? (
          <span style={{ background: '#F4F8FF', color: '#1355C2', borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: 500 }}>
            {sub.specialty}
          </span>
        ) : '—'}
      </td>
      <td style={cellStyle}>
        <button
          onClick={toggle}
          disabled={pending}
          style={{
            padding: '4px 12px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            background: sub.active ? '#E6F7F0' : '#F4F8FF',
            color: sub.active ? '#0D7A4E' : '#8BAAC4',
          }}>
          {pending ? '…' : sub.active ? 'Active' : 'Inactive'}
        </button>
      </td>
    </tr>
  )
}
