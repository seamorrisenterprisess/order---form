'use client'

import { useActionState, useState, useRef } from 'react'
import { createOrder } from '@/lib/actions'
import Link from 'next/link'
import type { Subcontractor } from '@/types'

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

interface PhotoSlot {
  file: File | null
  previewUrl: string | null
  uploadedUrl: string | null
  uploadedKey: string | null
  caption: string
  uploading: boolean
  error: string | null
}

function emptySlot(): PhotoSlot {
  return { file: null, previewUrl: null, uploadedUrl: null, uploadedKey: null, caption: '', uploading: false, error: null }
}

export default function NewOrderForm({ subcontractors }: { subcontractors: Subcontractor[] }) {
  const [state, action, pending] = useActionState(createOrder, null)
  const [photos, setPhotos] = useState<PhotoSlot[]>([emptySlot(), emptySlot(), emptySlot(), emptySlot()])
  const [summary, setSummary] = useState({ job: '', client: '', sub: '', cost: '0' })
  const [subOther, setSubOther] = useState(false)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null])

  function updateSummary(field: string, value: string) {
    setSummary(prev => ({ ...prev, [field]: value }))
  }

  function handleSlotClick(i: number) {
    fileInputRefs.current[i]?.click()
  }

  async function handleFileChange(i: number, file: File | null) {
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setPhotos(prev => {
      const next = [...prev]
      next[i] = { ...next[i], file, previewUrl, uploading: true, error: null, uploadedUrl: null, uploadedKey: null }
      return next
    })

    try {
      setPhotos(prev => {
        const next = [...prev]
        next[i] = { ...next[i], uploading: false }
        return next
      })
    } catch {
      setPhotos(prev => {
        const next = [...prev]
        next[i] = { ...next[i], uploading: false, error: 'Upload failed' }
        return next
      })
    }
  }

  function updateCaption(i: number, caption: string) {
    setPhotos(prev => {
      const next = [...prev]
      next[i] = { ...next[i], caption }
      return next
    })
  }

  const hasAnyPhoto = photos.some(p => p.file !== null)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #D4E4F4', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#0B1829' }}>New Scope Order</div>
          <Link href="/dashboard" style={{ display: 'inline-flex', padding: '7px 14px', border: '1.5px solid #D4E4F4', borderRadius: '7px', textDecoration: 'none', fontSize: '13px', color: '#4D6B8A' }}>&#8592; Back</Link>
        </div>
        <div className="dot-grid" style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          {state?.error && (
            <div style={{ background: '#FDECEA', border: '1px solid #e8a09a', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#C0392B', fontSize: '13.5px' }}>
              {state.error}
            </div>
          )}
          <form action={action} encType="multipart/form-data">
            {photos.map((slot, i) =>
              slot.caption ? (
                <input key={`photo-cap-${i}`} type="hidden" name={`photo_caption_${i}`} value={slot.caption} />
              ) : null
            )}

            <div className="new-order-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', maxWidth: '1000px', margin: '0 auto', alignItems: 'start' }}>
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
                    <Field label="Subcontractor" required>
                      <select
                        style={inputStyle}
                        name={subOther ? '_subcontractor_select_ignored' : 'subcontractor_name'}
                        onChange={e => {
                          const val = e.target.value
                          if (val === '__other__') {
                            setSubOther(true)
                            updateSummary('sub', '')
                          } else {
                            setSubOther(false)
                            updateSummary('sub', val)
                          }
                        }}
                      >
                        <option value="">Select subcontractor…</option>
                        {subcontractors.map(s => (
                          <option key={s.id} value={s.name}>{s.name}{s.specialty ? ` — ${s.specialty}` : ''}</option>
                        ))}
                        <option value="__other__">Other / Not listed</option>
                      </select>
                      {subOther && (
                        <input
                          style={{ ...inputStyle, marginTop: '8px' }}
                          type="text"
                          name="subcontractor_name"
                          placeholder="Enter subcontractor name"
                          onChange={e => updateSummary('sub', e.target.value)}
                          autoFocus
                        />
                      )}
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
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137' }}>
                    Photos
                    {hasAnyPhoto && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 500, color: '#0D7A4E', background: '#E6F7F0', padding: '2px 8px', borderRadius: '20px' }}>
                        {photos.filter(p => p.file).length} selected
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {photos.map((slot, i) => (
                        <div key={i}>
                          <input
                            type="file"
                            accept="image/*"
                            name={`photo_file_${i}`}
                            style={{ display: 'none' }}
                            ref={el => { fileInputRefs.current[i] = el }}
                            onChange={e => handleFileChange(i, e.target.files?.[0] ?? null)}
                          />
                          <div
                            onClick={() => handleSlotClick(i)}
                            style={{
                              border: `2px ${slot.file ? 'solid #C8DFF8' : 'dashed #D4E4F4'}`,
                              borderRadius: '10px',
                              padding: slot.previewUrl ? '0' : '20px 14px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              background: slot.file ? 'white' : '#F4F8FF',
                              transition: 'all 0.15s',
                              overflow: 'hidden',
                              position: 'relative',
                            }}>
                            {slot.previewUrl ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={slot.previewUrl}
                                  alt={`Photo ${i + 1} preview`}
                                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', borderRadius: '8px' }}
                                />
                                <div style={{
                                  position: 'absolute', bottom: 0, left: 0, right: 0,
                                  background: 'rgba(11,24,41,0.55)', color: 'white',
                                  fontSize: '11px', fontWeight: 500, padding: '5px 8px',
                                }}>
                                  Click to replace
                                </div>
                              </>
                            ) : slot.uploading ? (
                              <>
                                <div style={{ fontSize: '22px', color: '#8BAAC4', marginBottom: '4px' }}>&#x23F3;</div>
                                <div style={{ fontSize: '12px', color: '#4D6B8A', fontWeight: 500 }}>Preparing…</div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontSize: '22px', color: '#8BAAC4', marginBottom: '4px' }}>&#128247;</div>
                                <div style={{ fontSize: '12px', color: '#4D6B8A', fontWeight: 500 }}>Click to add photo</div>
                              </>
                            )}
                          </div>
                          {slot.error && (
                            <div style={{ fontSize: '11px', color: '#C0392B', marginTop: '4px' }}>{slot.error}</div>
                          )}
                          <input
                            type="text"
                            name={`photo_caption_${i}`}
                            placeholder="Caption…"
                            value={slot.caption}
                            onChange={e => updateCaption(i, e.target.value)}
                            style={{ ...inputStyle, fontSize: '12px', padding: '6px 10px', marginTop: '6px' }}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '12px', color: '#8BAAC4', marginTop: '10px' }}>
                      Photos are uploaded automatically when you save the order.
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
              <div className="new-order-summary-sticky" style={{ position: 'sticky', top: '16px' }}>
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
                    {hasAnyPhoto && (
                      <div style={{ marginTop: '12px', padding: '10px', background: '#E6F7F0', borderRadius: '8px', fontSize: '12px', color: '#0D7A4E', fontWeight: 500 }}>
                        {photos.filter(p => p.file).length} photo{photos.filter(p => p.file).length !== 1 ? 's' : ''} ready to upload
                      </div>
                    )}
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
