import { AppShell } from '@/components/AppShell'
import { getSessionUser } from '@/lib/auth'
import { reportMetrics } from '@/lib/orders'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const RANGE_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
]

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  needs_changes: 'Needs Changes',
  approved_internally: 'Approved Internally',
  sent_to_client: 'Sent to Client',
  client_approved: 'Client Approved',
  client_declined: 'Client Declined',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#8BAAC4',
  submitted: '#1355C2',
  needs_changes: '#B85C00',
  approved_internally: '#0D7A4E',
  sent_to_client: '#2990FF',
  client_approved: '#0D7A4E',
  client_declined: '#C0392B',
}

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (user.role !== 'account_manager' && user.role !== 'admin') redirect('/dashboard')

  const { range: rawRange } = await searchParams
  const range = RANGE_OPTIONS.find(o => o.value === rawRange) ? (rawRange as string) : 'this_month'
  const rangeLabel = RANGE_OPTIONS.find(o => o.value === range)?.label ?? 'This Month'

  const metrics = await reportMetrics(range)

  const maxStatusValue = Math.max(...Object.values(metrics.byStatus).map(v => v.value), 1)

  return (
    <AppShell title="Reports">
      <div className="dot-grid" style={{ padding: '28px', minHeight: '100%' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: '#0B1829', letterSpacing: '-0.02em' }}>Reports</div>
              <div style={{ fontSize: '14px', color: '#4D6B8A', marginTop: '4px' }}>{rangeLabel}</div>
            </div>
            {/* Date range selector */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {RANGE_OPTIONS.map(opt => (
                <Link
                  key={opt.value}
                  href={`/reports?range=${opt.value}`}
                  style={{
                    padding: '7px 14px', borderRadius: '7px', textDecoration: 'none',
                    fontSize: '13px', fontWeight: 500,
                    background: range === opt.value ? '#1355C2' : 'white',
                    color: range === opt.value ? 'white' : '#4D6B8A',
                    border: range === opt.value ? '1.5px solid #1355C2' : '1.5px solid #D4E4F4',
                  }}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total Orders', value: String(metrics.totalOrders), color: '#1355C2' },
              { label: 'Value Sent to Client', value: fmt(metrics.totalValueSent), color: '#2990FF' },
              { label: 'Value Client-Approved', value: fmt(metrics.totalValueApproved), color: '#0D7A4E' },
              { label: 'Approval Rate', value: `${metrics.approvalRate}%`, color: metrics.approvalRate >= 50 ? '#0D7A4E' : '#B85C00' },
            ].map(card => (
              <div key={card.label} style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{card.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: card.color, letterSpacing: '-0.01em' }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Orders by Status bar chart */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '24px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Orders by Status</div>
            {Object.keys(STATUS_LABELS).map(st => {
              const bucket = metrics.byStatus[st] ?? { count: 0, value: 0 }
              const barPct = maxStatusValue > 0 ? (bucket.value / maxStatusValue) * 100 : 0
              const color = STATUS_COLORS[st] ?? '#8BAAC4'
              if (bucket.count === 0) return null
              return (
                <div key={st} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                    <span style={{ color: '#0F2137', fontWeight: 500 }}>{STATUS_LABELS[st] ?? st}</span>
                    <span style={{ color: '#4D6B8A' }}>{bucket.count} order{bucket.count !== 1 ? 's' : ''} &middot; {fmt(bucket.value)}</span>
                  </div>
                  <div style={{ height: '8px', background: '#F4F8FF', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${barPct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(metrics.byStatus).length === 0 && (
              <div style={{ color: '#8BAAC4', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No orders in this period.</div>
            )}
          </div>

          {/* Tables row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Top Subcontractors */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Top Subcontractors</div>
              {metrics.topSubcontractors.length === 0 ? (
                <div style={{ color: '#8BAAC4', fontSize: '13px' }}>No data.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ color: '#4D6B8A', textAlign: 'left' }}>
                      <th style={{ padding: '6px 0', fontWeight: 600, borderBottom: '1px solid #E8EFF7' }}>Name</th>
                      <th style={{ padding: '6px 4px', fontWeight: 600, borderBottom: '1px solid #E8EFF7', textAlign: 'right' }}>#</th>
                      <th style={{ padding: '6px 4px', fontWeight: 600, borderBottom: '1px solid #E8EFF7', textAlign: 'right' }}>Sub Cost</th>
                      <th style={{ padding: '6px 0 6px 4px', fontWeight: 600, borderBottom: '1px solid #E8EFF7', textAlign: 'right' }}>Client Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.topSubcontractors.map(row => (
                      <tr key={row.name}>
                        <td style={{ padding: '7px 0', color: '#0F2137', borderBottom: '1px solid #F4F7FA', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</td>
                        <td style={{ padding: '7px 4px', color: '#0F2137', borderBottom: '1px solid #F4F7FA', textAlign: 'right' }}>{row.orderCount}</td>
                        <td style={{ padding: '7px 4px', color: '#4D6B8A', borderBottom: '1px solid #F4F7FA', textAlign: 'right' }}>{fmt(row.totalSubCost)}</td>
                        <td style={{ padding: '7px 0 7px 4px', color: '#1355C2', fontWeight: 600, borderBottom: '1px solid #F4F7FA', textAlign: 'right' }}>{fmt(row.totalClientPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Submitted By */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Submitted By</div>
              {metrics.submittedBy.length === 0 ? (
                <div style={{ color: '#8BAAC4', fontSize: '13px' }}>No data.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ color: '#4D6B8A', textAlign: 'left' }}>
                      <th style={{ padding: '6px 0', fontWeight: 600, borderBottom: '1px solid #E8EFF7' }}>Name</th>
                      <th style={{ padding: '6px 4px', fontWeight: 600, borderBottom: '1px solid #E8EFF7', textAlign: 'right' }}>Orders</th>
                      <th style={{ padding: '6px 0 6px 4px', fontWeight: 600, borderBottom: '1px solid #E8EFF7', textAlign: 'right' }}>Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.submittedBy.map(row => (
                      <tr key={row.name}>
                        <td style={{ padding: '7px 0', color: '#0F2137', borderBottom: '1px solid #F4F7FA' }}>{row.name}</td>
                        <td style={{ padding: '7px 4px', color: '#0F2137', borderBottom: '1px solid #F4F7FA', textAlign: 'right' }}>{row.orderCount}</td>
                        <td style={{ padding: '7px 0 7px 4px', color: '#1355C2', fontWeight: 600, borderBottom: '1px solid #F4F7FA', textAlign: 'right' }}>{fmt(row.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
