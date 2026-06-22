import { AppShell } from '@/components/AppShell'
import { getSessionUser } from '@/lib/auth'
import { listOrders } from '@/lib/orders'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { OrdersTable } from './OrdersTable'

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
          <OrdersTable orders={orders} />
        </div>
      </div>
    </AppShell>
  )
}
