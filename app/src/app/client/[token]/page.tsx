import { notFound } from 'next/navigation'
import { getOrderByToken } from '@/lib/orders'
import { ClientPortal } from './ClientPortal'

export default async function ClientPage({ params, searchParams }: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { token } = await params
  const { action } = await searchParams

  const order = await getOrderByToken(token)
  if (!order) notFound()

  return (
    <>
      {/* Header */}
      <div style={{ background: '#0B1829', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
          <div style={{ width: '32px', height: '32px', background: '#1355C2', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '13px', color: 'white' }}>SM</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>Sea Morris</span>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>🔒 Secure Order Review</div>
      </div>

      {/* Client portal */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px 60px' }}>
        <ClientPortal order={order} token={token} initialAction={action} />
      </div>
    </>
  )
}
