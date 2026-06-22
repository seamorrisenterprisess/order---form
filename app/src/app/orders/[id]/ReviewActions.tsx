'use client'

import { useState, useTransition } from 'react'
import { transitionStatus, updatePricing, sendToClient } from '@/lib/actions'
import type { Order } from '@/types'

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

export function ReviewActions({ order }: { order: Order }) {
  const [editMode, setEditMode] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showChangesModal, setShowChangesModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [markup, setMarkup] = useState(order.markup_pct)
  const [subCost, setSubCost] = useState(order.sub_cost)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const livePrice = Math.round(subCost * (1 + markup / 100))
  const liveMarkupAmt = livePrice - subCost

  const canEdit = ['submitted', 'needs_changes', 'approved_internally'].includes(order.status)
  const canApprove = ['submitted', 'needs_changes'].includes(order.status)
  const canSend = order.status === 'approved_internally' || order.status === 'sent_to_client'

  if (!canEdit && !canApprove && !canSend) return null

  function doApprove() {
    startTransition(async () => {
      const r = await transitionStatus(order.id, 'approved_internally')
      if (r?.error) setError(r.error)
      else setShowApproveModal(false)
    })
  }

  function doRequestChanges(note: string) {
    startTransition(async () => {
      const r = await transitionStatus(order.id, 'needs_changes', note)
      if (r?.error) setError(r.error)
      else setShowChangesModal(false)
    })
  }

  function doSend(channel: 'email' | 'sms') {
    startTransition(async () => {
      const r = await sendToClient(order.id, channel)
      if (r?.error) setError(r.error)
      else setShowSendModal(false)
    })
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      {error && (
        <div style={{ background: '#FDECEA', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13.5px', color: '#C0392B' }}>
          {error}
        </div>
      )}

      {/* Edit mode banner */}
      {editMode && (
        <div style={{ background: '#FFF3E6', border: '1px solid #f0c070', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#B85C00', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✏️ Editing mode — changes save when you click Save.
        </div>
      )}

      {/* Pricing editor */}
      {editMode && (
        <form action={async (fd: FormData) => {
          fd.append('order_id', order.id)
          const r = await updatePricing(null, fd)
          if (r?.error) setError(r.error as string)
          else setEditMode(false)
        }} style={{ background: '#E8F2FD', borderRadius: '10px', padding: '16px', marginBottom: '16px', border: '1px solid #C8DFF8' }}>
          <input type="hidden" name="order_id" value={order.id} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0F2137', marginBottom: '5px' }}>Subcontractor Cost</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4D6B8A', pointerEvents: 'none' }}>$</span>
                <input
                  type="number" name="sub_cost" min="0" step="0.01"
                  value={subCost}
                  onChange={e => setSubCost(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '9px 12px 9px 22px', border: '1.5px solid #C8DFF8', borderRadius: '7px', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0F2137', marginBottom: '8px' }}>
              Markup: <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#1355C2' }}>{markup}%</span>
            </label>
            <input
              type="range" name="markup_pct" min="0" max="50" step="1"
              value={markup} onChange={e => setMarkup(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#1355C2' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13.5px' }}>
              <span style={{ color: '#4D6B8A' }}>Final Client Price</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#1355C2' }}>{fmt(livePrice)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: '#0D7A4E', marginTop: '2px' }}>+{fmt(liveMarkupAmt)} markup</div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0F2137', marginBottom: '5px' }}>Client-Facing Message</label>
            <textarea
              name="client_message" rows={4}
              defaultValue={order.client_message ?? ''}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #C8DFF8', borderRadius: '7px', fontSize: '13.5px', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#0F2137', marginBottom: '5px' }}>Internal Notes</label>
            <textarea
              name="internal_notes" rows={2}
              defaultValue={order.internal_notes ?? ''}
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #C8DFF8', borderRadius: '7px', fontSize: '13.5px', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => setEditMode(false)} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={isPending} style={{ padding: '8px 16px', background: '#1355C2', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Action buttons */}
      {!editMode && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {canEdit && (
            <button onClick={() => setEditMode(true)} style={{ padding: '9px 16px', background: 'white', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', color: '#4D6B8A' }}>
              ✏ Edit Pricing &amp; Message
            </button>
          )}
          {canApprove && (
            <>
              <button onClick={() => setShowChangesModal(true)} style={{ padding: '9px 16px', background: 'white', border: '1.5px solid #f0c070', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', color: '#B85C00' }}>
                ⚠ Request Changes
              </button>
              <button onClick={() => setShowApproveModal(true)} style={{ padding: '9px 16px', background: '#0D7A4E', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                ✓ Approve
              </button>
            </>
          )}
          {canSend && (
            <button onClick={() => setShowSendModal(true)} style={{ padding: '9px 16px', background: '#1355C2', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
              ✉ Send to Client
            </button>
          )}
        </div>
      )}

      {/* Approve modal */}
      {showApproveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,24,41,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }} onClick={() => setShowApproveModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '400px', boxShadow: '0 40px 100px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: '#0B1829', marginBottom: '6px' }}>Approve this order?</div>
            <div style={{ color: '#4D6B8A', marginBottom: '4px', fontSize: '14px' }}>{order.job_name}</div>
            <div style={{ color: '#4D6B8A', marginBottom: '20px', fontSize: '14px' }}>{order.client_name}</div>
            <div style={{ background: '#E6F5EE', borderRadius: '10px', padding: '14px', border: '1.5px solid #a7d7c1', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client Price</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: '#0D7A4E' }}>{fmt(order.client_price)}</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setShowApproveModal(false)} style={{ padding: '9px 18px', background: 'white', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13.5px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={doApprove} disabled={isPending} style={{ padding: '9px 18px', background: '#0D7A4E', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                {isPending ? 'Approving…' : 'Confirm Approval ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request changes modal */}
      {showChangesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,24,41,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }} onClick={() => setShowChangesModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '500px', boxShadow: '0 40px 100px rgba(0,0,0,0.3)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: '#0B1829', marginBottom: '8px' }}>Request Changes</div>
            <p style={{ fontSize: '13.5px', color: '#4D6B8A', marginBottom: '16px' }}>The Operations Analyst will be notified to update the order.</p>
            <textarea
              id="change-note"
              rows={4}
              placeholder="What needs to change?"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #D4E4F4', borderRadius: '8px', fontSize: '13.5px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'var(--font-body)' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setShowChangesModal(false)} style={{ padding: '9px 18px', background: 'white', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13.5px', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={() => doRequestChanges((document.getElementById('change-note') as HTMLTextAreaElement)?.value ?? '')}
                disabled={isPending}
                style={{ padding: '9px 18px', background: '#B85C00', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                {isPending ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send modal */}
      {showSendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,24,41,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }} onClick={() => setShowSendModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '480px', boxShadow: '0 40px 100px rgba(0,0,0,0.3)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: '#0B1829', marginBottom: '6px' }}>Send to Client</div>
            <p style={{ fontSize: '13.5px', color: '#4D6B8A', marginBottom: '20px' }}>
              Sending to <strong>{order.client_name}</strong> at {order.client_email}
            </p>
            <div style={{ background: '#F4F8FF', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#4D6B8A', marginBottom: '8px' }}>Order summary for client:</div>
              <div style={{ fontWeight: 600, color: '#0F2137', marginBottom: '4px' }}>{order.job_name}</div>
              <div style={{ fontSize: '13px', color: '#4D6B8A', marginBottom: '8px' }}>{order.client_message ? order.client_message.substring(0, 100) + '…' : order.work_description.substring(0, 100) + '…'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #D4E4F4' }}>
                <span style={{ fontSize: '13px', color: '#4D6B8A' }}>Client price</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#1355C2' }}>{fmt(order.client_price)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSendModal(false)} style={{ padding: '9px 18px', background: 'white', border: '1.5px solid #D4E4F4', borderRadius: '7px', fontSize: '13.5px', cursor: 'pointer' }}>Cancel</button>
              {order.client_phone && (
                <button onClick={() => doSend('sms')} disabled={isPending} style={{ padding: '9px 18px', background: 'white', border: '1.5px solid #1355C2', color: '#1355C2', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                  {isPending ? '…' : '💬 Send SMS'}
                </button>
              )}
              <button onClick={() => doSend('email')} disabled={isPending} style={{ padding: '9px 18px', background: '#1355C2', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                {isPending ? 'Sending…' : '✉ Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
