import { AppShell } from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { getSessionUser } from '@/lib/auth'
import { listOrders } from '@/lib/orders'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

export default async function AllOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const search = sp.search ?? ''
  const status = sp.status ?? ''

  const orders = await listOrders({ search: search || undefined, status: (status as any) || undefined, limit: 100 })

  const isAnalyst = user.role === 'operations_analyst'
  const exportParams = new URLSearchParams()
  if (search) exportParams.set('search', search)
  if (status) exportParams.set('status', status)
  const exportHref = `/api/orders/export${exportParams.toString() ? '?' + exportParams.toString() : ''}`

  const newBtn = (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <a
        href={exportHref}
        download
        style={{ display: 'inline-flex', padding: '8px 14px', border: '1.5px solid #D4E4F4', borderRadius: '7px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, color: '#4D6B8A', background: 'white' }}
      >
        Export CSV
      </a>
      {(!isAnalyst || user.role === 'admin') && (
        <Link href="/orders/new" style={{ display: 'inline-flex', padding: '8px 16px', background: '#1355C2', color: 'white', borderRadius: '7px', textDecoration: 'none', fontSize: '13.5px', fontWeight: 600 }}>+ New Scope Order</Link>
      )}
    </div>
  )

  return (
    <AppShell title="All Orders" actions={newBtn}>
      <div className="dot-grid" style={{ padding: '28px', minHeight: '100%' }}>
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          <div className="orders-filter-row" style={{ padding: '14px 16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <form method="get" style={{ display: 'contents' }}>
              <input
                type="text" name="search" defaultValue={search}
                placeholder="Search jobs, clients, subcontractors…"
                style={{ flex: 1, minWidth: '200px', padding: '8px 12px 8px 34px', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13.5px', outline: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='%238BAAC4' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.44 1.146a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: '10px center' }}
              />
              <select
                name="status" defaultValue={status}
                style={{ padding: '8px 12px', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13.5px', color: '#0F2137', background: 'white', outline: 'none' }}>
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="needs_changes">Needs Changes</option>
                <option value="approved_internally">Approved</option>
                <option value="sent_to_client">Sent to Client</option>
                <option value="client_approved">Client Approved</option>
                <option value="client_declined">Client Declined</option>
              </select>
              <button type="submit" style={{ padding: '8px 14px', background: '#1355C2', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Filter</button>
              {(search || status) && (
                <Link href="/orders" style={{ padding: '8px 14px', background: 'white', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13px', textDecoration: 'none', color: '#4D6B8A' }}>✕ Clear</Link>
              )}
            </form>
          </div>
          <div className="table-scroll-wrap" style={{ overflowX: 'auto', marginTop: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr>
                  {['Order ID', 'Job Name', 'Client', 'Subcontractor', 'Submitted By', 'Status', 'Date', 'Sub Cost', 'Client Price'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #D4E4F4', background: '#F4F8FF', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#8BAAC4' }}>No orders match your filters.</td></tr>
                ) : orders.map(o => (
                  <Link key={o.id} href={`/orders/${o.id}`} style={{ display: 'contents', textDecoration: 'none' }}>
                    <tr style={{ borderBottom: '1px solid #F0F4F8', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E8F2FD' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-display)', fontSize: '13px', color: '#1355C2' }}>{o.id}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 500 }}>{o.job_name}</td>
                      <td style={{ padding: '12px 14px' }}>{o.client_name}</td>
                      <td style={{ padding: '12px 14px' }}>{o.subcontractor_name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: '#4D6B8A' }}>{(o.submitted_by as any)?.name ?? '—'}</td>
                      <td style={{ padding: '12px 14px' }}><StatusBadge status={o.status} /></td>
                      <td style={{ padding: '12px 14px', color: '#4D6B8A', fontSize: '13px' }}>{o.date_submitted ?? '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{o.sub_cost ? fmt(o.sub_cost) : '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1355C2' }}>{o.client_price ? fmt(o.client_price) : '—'}</td>
                    </tr>
                  </Link>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
