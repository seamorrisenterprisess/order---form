import { NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { listOrders } from '@/lib/orders'
import type { OrderStatus } from '@/types'

function csvEscape(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  // Escape fields that contain commas, double quotes, or newlines
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvEscape).join(',')
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? undefined
  const status = searchParams.get('status') ?? undefined

  const orders = await listOrders({
    search: search || undefined,
    status: (status as OrderStatus) || undefined,
    limit: 1000,
  })

  const header = csvRow([
    'Order ID',
    'Job Name',
    'Client',
    'Client Phone',
    'Client Email',
    'Property Address',
    'Subcontractor',
    'Status',
    'Date Submitted',
    'Sub Cost',
    'Client Price',
    'Markup %',
  ])

  const rows = orders.map(o =>
    csvRow([
      o.id,
      o.job_name,
      o.client_name,
      o.client_phone ?? '',
      o.client_email,
      o.property_address ?? '',
      o.subcontractor_name,
      o.status,
      o.date_submitted ?? '',
      o.sub_cost,
      o.client_price,
      o.markup_pct,
    ])
  )

  const csv = [header, ...rows].join('\r\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="orders-export.csv"',
    },
  })
}
