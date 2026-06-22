import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { getSessionUser } from '@/lib/auth'
import { listOrders, statusCounts } from '@/lib/orders'
import { redirect } from 'next/navigation'
import type { Order, OrderStatus } from '@/types'

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

const STATUS_CONFIG: { key: OrderStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'needs_changes', label: 'Needs Changes' },
  { key: 'approved_internally', label: 'Approved' },
  { key: 'sent_to_client', label: 'Sent to Client' },
  { key: 'client_approved', label: 'Client Approved' },
]

function PriorityCard({ order }: { order: Order }) {
  const isChanges = order.status === 'needs_changes'
  return (
    <Link href={`/orders/${order.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'white', borderRadius: '12px', padding: '16px 18px',
        borderLeft: `4px solid ${isChanges ? '#B85C00' : '#1355C2'}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)', cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0B1829' }}>{order.job_name}</div>
          <StatusBadge status={order.status} />
        </div>
        <div style={{ fontSize: '12.5px', color: '#4D6B8A', marginBottom: '8px' }}>
          {order.client_name} · {order.subcontractor_name}
        </div>
        {order.work_description && (
          <div style={{ fontSize: '12.5px', color: '#4D6B8A', marginBottom: '4px' }}>
            {order.work_description.substring(0, 90)}…
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #D4E4F4' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: '#1355C2' }}>
            {fmt(order.sub_cost)} sub cost
          </div>
          <span style={{ fontSize: '12px', color: '#1355C2', fontWeight: 600 }}>Review →</span>
        </div>
      </div>
    </Link>
  )
}

function OrderRow({ order }: { order: Order }) {
  return (
    <Link href={`/orders/${order.id}`} style={{ textDecoration: 'none' }}>
      <tr style={{ borderBottom: '1px solid #F0F4F8', cursor: 'pointer' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E8F2FD' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: '13px', color: '#1355C2' }}>{order.id}</td>
        <td style={{ padding: '12px 14px', fontWeight: 500 }}>{order.job_name}</td>
        <td style={{ padding: '12px 14px' }}>{order.client_name}</td>
        <td style={{ padding: '12px 14px' }}>{order.subcontractor_name || '—'}</td>
        <td style={{ padding: '12px 14px' }}><StatusBadge status={order.status} /></td>
        <td style={{ padding: '12px 14px', color: '#4D6B8A', fontSize: '13px' }}>{order.date_submitted ?? '—'}</td>
        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{order.sub_cost ? fmt(order.sub_cost) : '—'}</td>
        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1355C2' }}>{order.client_price ? fmt(order.client_price) : '—'}</td>
      </tr>
    </Link>
  )
}

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const isAnalyst = user.role === 'operations_analyst'
  const isAM = user.role === 'account_manager' || user.role === 'admin'

  const [counts, orders, priorityOrders] = await Promise.all([
    statusCounts(isAnalyst ? user.id : undefined),
    listOrders({
      submittedById: isAnalyst ? user.id : undefined,
      limit: 50,
    }),
    isAM ? listOrders({ status: ['submitted', 'needs_changes'] as OrderStatus[], limit: 10 }) : Promise.resolve([]),
  ])

  const newOrderAction = isAnalyst || user.role === 'admin'
    ? <Link href="/orders/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#1355C2', color: 'white', borderRadius: '7px', textDecoration: 'none', fontSize: '13.5px', fontWeight: 600 }}>+ New Scope Order</Link>
    : null

  return (
    <AppShell title={isAM ? 'Account Manager Dashboard' : 'My Dashboard'} actions={newOrderAction}>
      <div className="dot-grid" style={{ padding: '28px', minHeight: '100%' }}>
        {/* Status cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '12px', marginBottom: '24px' }}>
          {STATUS_CONFIG.map(s => (
            <div key={s.key} style={{
              background: 'white', borderRadius: '10px', padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: '#0B1829', lineHeight: 1 }}>
                {counts[s.key] ?? 0}
              </div>
              <div style={{ fontSize: '11px', color: '#4D6B8A', marginTop: '4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* AM Priority section */}
        {isAM && priorityOrders.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#0B1829', marginBottom: '16px' }}>
              Needs Your Review
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '14px' }}>
              {priorityOrders.map(o => <PriorityCard key={o.id} order={o} />)}
            </div>
          </div>
        )}

        {/* Orders table */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>
              {isAM ? 'All Orders' : 'My Orders'} ({orders.length})
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr>
                  {['Order ID', 'Job Name', 'Client', 'Subcontractor', 'Status', 'Date', 'Sub Cost', 'Client Price'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #D4E4F4', background: '#F4F8FF', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#8BAAC4' }}>No orders yet. Create your first scope order to get started.</td></tr>
                ) : (
                  orders.map(o => <OrderRow key={o.id} order={o} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
