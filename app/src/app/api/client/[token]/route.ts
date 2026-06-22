import { NextRequest, NextResponse } from 'next/server'
import { getOrderByToken } from '@/lib/orders'

// Public endpoint — no auth required. Returns safe subset of order data for client portal.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const order = await getOrderByToken(token)

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Strip internal fields before sending to client
  const {
    internal_notes: _,
    change_request_note: __,
    submitted_by_id: ___,
    account_manager_id: ____,
    ...clientSafe
  } = order

  return NextResponse.json({ data: clientSafe })
}
