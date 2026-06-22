'use client'

import { useTransition } from 'react'
import { setUserActive } from '@/lib/actions'
import type { User } from '@/types'

export function UserRow({
  user,
  roleLabel,
  isLast,
  currentUserId,
}: {
  user: User & { created_at: string }
  roleLabel: string
  isLast: boolean
  currentUserId: string
}) {
  const [isPending, startTransition] = useTransition()
  const isSelf = user.id === currentUserId

  function toggle() {
    startTransition(async () => {
      await setUserActive(user.id, !user.is_active)
    })
  }

  const borderBottom = isLast ? 'none' : '1px solid #F4F7FA'

  return (
    <tr style={{ opacity: user.is_active ? 1 : 0.6 }}>
      <td style={{ padding: '12px 16px', borderBottom, fontSize: '13.5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%', background: '#1355C2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>{user.avatar_initials}</div>
          <span style={{ fontWeight: 500, color: '#0F2137' }}>{user.name}</span>
        </div>
      </td>
      <td style={{ padding: '12px 16px', borderBottom, fontSize: '13px', color: '#4D6B8A' }}>{user.email}</td>
      <td style={{ padding: '12px 16px', borderBottom }}>
        <span style={{
          fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
          background: user.role === 'admin' ? '#0B1829' : user.role === 'account_manager' ? '#E8F2FD' : '#F4F8FF',
          color: user.role === 'admin' ? 'white' : user.role === 'account_manager' ? '#1355C2' : '#4D6B8A',
        }}>{roleLabel}</span>
      </td>
      <td style={{ padding: '12px 16px', borderBottom, fontSize: '12.5px', color: '#8BAAC4' }}>
        {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </td>
      <td style={{ padding: '12px 16px', borderBottom }}>
        <span style={{
          fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
          background: user.is_active ? '#E6F7F0' : '#F4F7FA',
          color: user.is_active ? '#0D7A4E' : '#8BAAC4',
        }}>{user.is_active ? 'Active' : 'Inactive'}</span>
      </td>
      <td style={{ padding: '12px 16px', borderBottom }}>
        {!isSelf && (
          <button
            onClick={toggle}
            disabled={isPending}
            style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              background: 'transparent',
              border: `1.5px solid ${user.is_active ? '#C0392B' : '#0D7A4E'}`,
              color: user.is_active ? '#C0392B' : '#0D7A4E',
            }}>
            {isPending ? '…' : user.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        )}
      </td>
    </tr>
  )
}
