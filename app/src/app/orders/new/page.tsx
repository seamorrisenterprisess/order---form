'use client'

import { useActionState, useState } from 'react'
import { createOrder } from '@/lib/actions'
import Link from 'next/link'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F2137' }}>
        {label}{required && <span style={{ color: '#C0392B' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '9px 12px', border: '1.5px solid #D4E4F4', borderRadius: '7px',
  fontSize: '13.5px', color: '#0F2137', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  fontFamily: 'var(--font-body)',
}

export default function NewOrderPage() {
  const [state, action, pending] = useActionState(createOrder, null)
  const [photos, setPhotos] = useState([false, false, false, false])
  const [summary, setSummary] = useState({ job: '', client: '', sub: '', cost: '0' })

  function togglePhoto(i: number) {
    setPhotos(prev => { const n = [...prev]; n[i] = !n[i]; return n })
  }

  function updateSummary(field: string, value: string) {
    setSummary(prev => ({ ...prev, [field]: value }))
  }

  const clientPrice = Math.round(parseFloat(summary.cost || '0') * 1.20)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Simplified header for form page */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #D4E4F4', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#0B1829' }}>New Scope Order</div>
          <Link href="/dashboard" style={{ display: 'inline-flex', padding: '7px 14px', border: '1.5px solid #D4E4F4', borderRadius: '7px', textDecoration: 'none', fontSize: '13px', color: '#4D6B8A' }}>← Back</Link>
        </div>
        <div className="dot-grid" style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          {state?.error && (
            <div style={{ background: '#FDECEA', border: '1px solid #e8a09a', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#C0392B', fontSize: '13.5px' }}>
              {state.error}
            </div>
          )}
          <form action={action}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', maxWidth: '1000px', margin: '0 auto', alignItems: 'start' }}>
              <div>
                {/* Job Info */}
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '20px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>Job Information</div>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <Field label="Job Name" required>
                        <input style={inputStyle} type="text" name="job_name" placeholder="e.g. Riverside Commons – Unit 4B" onChange={e => updateSummary('job', e.target.value)} />
                      </Field>
                      <Field label="Client Name" required>
                        <input style={inputStyle} type="text" name="client_name" placeholder="Full name" onChange={e => updateSummary('client', e.target.value)} />
                      </Field>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <Field label="Client Email" required>
                        <input style={inputStyle} type="email" name="client_email" placeholder="client@email.com" />
                      </Field>
                      <Field label="Client Phone">
                        <input style={inputStyle} type="tel" name="client_phone" placeholder="(512) 000-0000" />
                      </Field>
                    </div>
                    <Field label="Property Address">
                      <input style={inputStyle} type="text" name="property_address" placeholder="Street address, city, state ZIP" />
                    </Field>
                    <Field label="Account Manager">
                      <select style={inputStyle} name="account_manager_id">
                        <option value="">Select account manager</option>
                        <option value="">Claire Okafor</option>
                        <option value="">Jordan Rivera</option>
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Scope */}
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '20px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>Scope Details</div>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <Field label="Subcontractor Name" required>
                      <input style={inputStyle} type="text" name="subcontractor_name" placeholder="Company name" onChange={e => updateSummary('sub', e.target.value)} />
                    </Field>
                    <Field label="Description of Additional Work" required>
                      <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} name="work_description" placeholder="Describe the additional work in detail…" rows={4} />
                    </Field>
                    <Field label="Reason for Additional Scope">
                      <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} name="scope_reason" placeholder="Why is this additional scope needed?" rows={2} />
                    </Field>
                  </div>
                </div>

                {/* Photos */}
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '20px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>Photos</div>
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {photos.map((has, i) => (
                        <div key={i}>
                          <div
                            onClick={() => togglePhoto(i)}
                            style={{
                              border: `2px ${has ? 'solid #C8DFF8' : 'dashed #D4E4F4'}`,
                              borderRadius: '10px', padding: '20px 14px', textAlign: 'center',
                              cursor: 'pointer', background: has ? 'white' : '#F4F8FF',
                              transition: 'all 0.15s',
                            }}>
                            {has ? (
                              <div style={{ height: '70px', background: 'linear-gradient(135deg,#C8DFF8,#E8F2FD)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '6px' }}>🖼</div>
                            ) : (
                              <div style={{ fontSize: '22px', color: '#8BAAC4', marginBottom: '4px' }}>📷</div>
                            )}
                            <div style={{ fontSize: '12px', color: '#4D6B8A', fontWeight: 500 }}>
                              {has ? 'Photo added ✓' : 'Click to add photo'}
                            </div>
                          </div>
                          <input
                            type="text" placeholder="Caption…"
                            style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', marginTop: '6px' }}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '12px', color: '#8BAAC4', marginTop: '10px' }}>
                      Photos will be uploaded after saving the order.
                    </p>
                  </div>
                </div>

                {/* Costs */}
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: '24px' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>Costs &amp; Notes</div>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <Field label="Subcontractor Cost" required>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4D6B8A', pointerEvents: 'none' }}>$</span>
                        <input style={{ ...inputStyle, paddingLeft: '22px' }} type="number" name="sub_cost" placeholder="0.00" min="0" step="0.01" onChange={e => updateSummary('cost', e.target.value)} />
                      </div>
                    </Field>
                    <Field label="Internal Notes">
                      <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} name="internal_notes" placeholder="Notes for the Account Manager (not shown to client)…" rows={3} />
                    </Field>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="submit" name="submit" value="false" disabled={pending}
                    style={{ padding: '9px 18px', background: 'white', border: '1.5px solid #1355C2', color: '#1355C2', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                    Save as Draft
                  </button>
                  <button
                    type="submit" name="submit" value="true" disabled={pending}
                    style={{ padding: '9px 18px', background: pending ? '#8BAAC4' : '#1355C2', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                    {pending ? 'Submitting…' : 'Submit to Account Manager →'}
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div style={{ position: 'sticky', top: '16px' }}>
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>Order Summary</div>
                  <div style={{ padding: '16px 20px' }}>
                    {[
                      ['Job', summary.job || '—'],
                      ['Client', summary.client || '—'],
                      ['Subcontractor', summary.sub || '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #D4E4F4', fontSize: '13.5px' }}>
                        <span style={{ color: '#4D6B8A' }}>{k}</span>
                        <span style={{ fontWeight: 600, color: '#0F2137', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', marginTop: '6px', borderTop: '2px solid #D4E4F4' }}>
                      <span style={{ fontSize: '13.5px', color: '#4D6B8A' }}>Sub Cost</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: '#1355C2' }}>
                        ${parseFloat(summary.cost || '0').toLocaleString('en-US')}
                      </span>
                    </div>
                    <div style={{ marginTop: '12px', padding: '10px', background: '#F4F8FF', borderRadius: '8px', fontSize: '12px', color: '#4D6B8A' }}>
                      Markup and client price set by Account Manager after review.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
