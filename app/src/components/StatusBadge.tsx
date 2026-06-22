import type { OrderStatus } from '@/types'

const CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:               { label: 'Draft',           color: '#4D6B8A', bg: '#F4F8FF', border: '#8BAAC4' },
  submitted:           { label: 'Submitted',        color: '#1355C2', bg: '#E8F2FD', border: '#C8DFF8' },
  needs_changes:       { label: 'Needs Changes',    color: '#B85C00', bg: '#FFF3E6', border: '#f0c070' },
  approved_internally: { label: 'Approved',         color: '#0D7A4E', bg: '#E6F5EE', border: '#a7d7c1' },
  sent_to_client:      { label: 'Sent to Client',   color: '#6B21A8', bg: '#F5F0FF', border: '#c4a8e8' },
  client_approved:     { label: 'Client Approved',  color: '#0D7A4E', bg: '#D1FAE5', border: '#0D7A4E' },
  client_declined:     { label: 'Client Declined',  color: '#C0392B', bg: '#FDECEA', border: '#e8a09a' },
}

export function StatusBadge({ status, size = 'sm' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const c = CONFIG[status]
  const pad = size === 'md' ? '4px 12px' : '3px 8px'
  const fs = size === 'md' ? '12px' : '10.5px'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: pad, borderRadius: '4px', fontSize: fs,
      fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      color: c.color, background: c.bg,
      border: `1.5px solid ${c.border}`,
      fontFamily: 'var(--font-body)',
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}
