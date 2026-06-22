'use client'

import { useState, useTransition } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import type { Order } from '@/types'

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

const PRINT_STYLES = `
@media print {
  .client-portal-actions { display: none !important; }
  .client-portal-print-btn { display: none !important; }
  body { background: white !important; }
  .client-portal-wrapper { box-shadow: none !important; padding: 0 !important; }
}
`

export function ClientPortal({ order, token, initialAction }: {
  order: Order
  token: string
  initialAction?: string
}) {
  const [responded, setResponded] = useState<'approved' | 'declined' | null>(
    order.status === 'client_approved' ? 'approved' :
    order.status === 'client_declined' ? 'declined' : null
  )
  const [showDeclineForm, setShowDeclineForm] = useState(initialAction === 'decline')
  const [declineReason, setDeclineReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canAct = order.status === 'sent_to_client'

  async function respond(approved: boolean, note?: string) {
    startTransition(async () => {
      const res = await fetch(`/api/orders/${order.id}/client-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, approved, note }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong. Please try again.'); return }
      setResponded(approved ? 'approved' : 'declined')
    })
  }

  const markupAmt = (order.client_price ?? 0) - (order.sub_cost ?? 0)

  return (
    <>
      <style>{PRINT_STYLES}</style>
      {/* Print button */}
      <div className="client-portal-print-btn" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          onClick={() => window.print()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'white', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13px', color: '#4D6B8A', cursor: 'pointer', fontWeight: 500 }}>
          🖨 Print / Save as PDF
        </button>
      </div>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '28px', paddingTop: '8px' }}>
        <div style={{ fontSize: '12px', color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Order {order.id}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: '#0B1829', marginBottom: '10px' }}>{order.job_name}</div>
        <div style={{ marginBottom: '8px' }}>
          {canAct && !responded ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#B85C00', background: '#FFF3E6', border: '1.5px solid #f0c070' }}>⏳ Awaiting Your Response</span>
          ) : responded === 'approved' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0D7A4E', background: '#D1FAE5', border: '1.5px solid #0D7A4E' }}>✓ Approved</span>
          ) : responded === 'declined' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#C0392B', background: '#FDECEA', border: '1.5px solid #e8a09a' }}>Declined</span>
          ) : (
            <StatusBadge status={order.status} size="md" />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '13px', color: '#4D6B8A', flexWrap: 'wrap' }}>
          <span>👤 {order.client_name}</span>
          {order.property_address && <span>📍 {order.property_address}</span>}
          {order.date_submitted && <span>📅 {order.date_submitted}</span>}
        </div>
      </div>

      {/* Success state */}
      {responded === 'approved' && (
        <div style={{ background: '#E6F5EE', border: '1.5px solid #a7d7c1', borderRadius: '12px', padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: '#0D7A4E', marginBottom: '8px' }}>Scope Approved!</div>
          <p style={{ color: '#4D6B8A', fontSize: '14px' }}>Thank you, {order.client_name}. The Sea Morris team will be in touch shortly to schedule the work.</p>
        </div>
      )}

      {responded === 'declined' && (
        <div style={{ background: '#FDECEA', border: '1.5px solid #e8a09a', borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#C0392B', marginBottom: '8px' }}>Scope Declined</div>
          <p style={{ color: '#4D6B8A', fontSize: '14px' }}>A Sea Morris team member will follow up with you. If you have any questions, call us at (512) 555-0100.</p>
        </div>
      )}

      {/* Scope description */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Scope of Work</div>
        <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#0F2137' }}>
          {order.client_message || order.work_description}
        </div>
      </div>

      {/* Photos */}
      {order.photos && order.photos.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Scope Photos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
            {order.photos.slice(0, 4).map((photo) => (
              <div key={photo.id} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #D4E4F4' }}>
                {photo.public_url ? (
                  <img
                    src={photo.public_url}
                    alt={photo.caption ?? 'Scope photo'}
                    style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ height: '160px', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🖼</div>
                )}
                {photo.caption && (
                  <div style={{ padding: '6px 10px', fontSize: '12px', color: '#4D6B8A', fontWeight: 500, background: 'white' }}>{photo.caption}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why additional scope */}
      {order.scope_reason && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Why This Work Is Needed</div>
          <div style={{ background: '#E8F2FD', borderRadius: '10px', padding: '14px 18px', borderLeft: '3px solid #B85C00', fontSize: '14px', lineHeight: 1.6, color: '#0F2137' }}>
            {order.scope_reason}
          </div>
        </div>
      )}

      {/* Investment summary */}
      <div style={{ border: '2px solid #0B1829', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Investment Summary</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', fontSize: '13px', color: '#4D6B8A', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span>Labor & Materials: {fmt(order.sub_cost)}</span>
          <span>Project Coordination: +{fmt(markupAmt)}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', color: '#0B1829', marginBottom: '4px' }}>{fmt(order.client_price)}</div>
        <div style={{ fontSize: '12px', color: '#4D6B8A' }}>Total investment including labor, materials &amp; project coordination</div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FDECEA', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13.5px', color: '#C0392B' }}>{error}</div>
      )}

      {/* CTA */}
      {canAct && !responded && (
        <div className="client-portal-actions">
          {!showDeclineForm ? (
            <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
              <button
                onClick={() => respond(true)}
                disabled={isPending}
                style={{ flex: 1, padding: '16px', background: '#0D7A4E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                {isPending ? 'Processing…' : '✓ Approve Scope'}
              </button>
              <button
                onClick={() => setShowDeclineForm(true)}
                disabled={isPending}
                style={{ flex: 1, padding: '15px', background: 'white', color: '#C0392B', border: '2px solid #C0392B', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                Decline
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0F2137', marginBottom: '5px' }}>Reason for declining (optional)</label>
                <textarea
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  rows={3}
                  placeholder="Let us know if you have concerns or questions…"
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #D4E4F4', borderRadius: '8px', fontSize: '13.5px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => respond(false, declineReason)}
                  disabled={isPending}
                  style={{ padding: '11px 20px', background: '#C0392B', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                  {isPending ? 'Processing…' : 'Confirm — Decline Scope'}
                </button>
                <button
                  onClick={() => setShowDeclineForm(false)}
                  style={{ padding: '11px 16px', background: 'white', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13.5px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: '#8BAAC4', paddingTop: '20px', borderTop: '1px solid #D4E4F4', marginTop: '24px' }}>
        Prepared by Sea Morris · Secure link for {order.client_name} only<br />
        Questions: (512) 555-0100 · claire@seamorris.com
      </div>
    </>
  )
}
