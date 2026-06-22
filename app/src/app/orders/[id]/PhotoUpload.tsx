'use client'

import { useState, useRef } from 'react'
import type { OrderPhoto } from '@/types'

interface UploadingPhoto {
  previewUrl: string
  caption: string
  uploading: boolean
  error: string | null
  done: boolean
  result?: OrderPhoto
}

export function PhotoUpload({ orderId, existingPhotos }: { orderId: string; existingPhotos: OrderPhoto[] }) {
  const [photos, setPhotos] = useState<OrderPhoto[]>(existingPhotos)
  const [slots, setSlots] = useState<UploadingPhoto[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function handleFiles(files: FileList) {
    const available = 4 - photos.length - slots.filter(s => !s.error).length
    const toProcess = Array.from(files).slice(0, available)
    if (toProcess.length === 0) return

    const newSlots: UploadingPhoto[] = toProcess.map(f => ({
      previewUrl: URL.createObjectURL(f),
      caption: '',
      uploading: true,
      error: null,
      done: false,
    }))

    setSlots(prev => [...prev, ...newSlots])
    const baseIndex = slots.length

    await Promise.all(toProcess.map(async (file, i) => {
      const slotIndex = baseIndex + i
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('orderId', orderId)
        fd.append('sortOrder', String(photos.length + slotIndex))

        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const json = await res.json()

        if (!res.ok || json.error) {
          setSlots(prev => {
            const next = [...prev]
            next[slotIndex] = { ...next[slotIndex], uploading: false, error: json.error ?? 'Upload failed' }
            return next
          })
        } else {
          const photo: OrderPhoto = { ...json.data, public_url: json.data.public_url }
          setPhotos(prev => [...prev, photo])
          setSlots(prev => {
            const next = [...prev]
            next[slotIndex] = { ...next[slotIndex], uploading: false, done: true, result: photo }
            return next
          })
        }
      } catch {
        setSlots(prev => {
          const next = [...prev]
          next[slotIndex] = { ...next[slotIndex], uploading: false, error: 'Upload failed' }
          return next
        })
      }
    }))
  }

  const totalShown = photos.length + slots.filter(s => !s.done).length
  const canAddMore = totalShown < 4

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {/* Uploaded photos */}
        {photos.map((photo, i) => (
          <div key={photo.id ?? i}>
            <div style={{ borderRadius: '8px', aspectRatio: '4/3', overflow: 'hidden', background: '#F0F4F8' }}>
              {photo.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.public_url} alt={photo.caption ?? `Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>&#x1F5BC;</div>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#4D6B8A', marginTop: '5px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {photo.caption || `Photo ${i + 1}`}
            </div>
          </div>
        ))}

        {/* In-progress slots */}
        {slots.filter(s => !s.done).map((slot, i) => (
          <div key={`slot-${i}`}>
            <div style={{ borderRadius: '8px', aspectRatio: '4/3', overflow: 'hidden', background: '#F0F4F8', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slot.previewUrl} alt="Uploading…" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: slot.uploading ? 0.5 : 1 }} />
              {slot.uploading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,24,41,0.35)' }}>
                  <div style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>Uploading…</div>
                </div>
              )}
              {slot.error && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(192,57,43,0.7)' }}>
                  <div style={{ color: 'white', fontSize: '11px', fontWeight: 600, padding: '4px 8px', textAlign: 'center' }}>{slot.error}</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: '11px', color: slot.error ? '#C0392B' : '#8BAAC4', marginTop: '5px', fontWeight: 500 }}>
              {slot.error ? 'Failed' : 'Uploading…'}
            </div>
          </div>
        ))}

        {/* Add more slot */}
        {canAddMore && (
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                borderRadius: '8px', aspectRatio: '4/3', background: '#F4F8FF',
                border: '2px dashed #D4E4F4', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#8BAAC4'; (e.currentTarget as HTMLElement).style.background = '#EBF2FC' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D4E4F4'; (e.currentTarget as HTMLElement).style.background = '#F4F8FF' }}
            >
              <div style={{ fontSize: '24px', color: '#8BAAC4', marginBottom: '4px' }}>&#43;</div>
              <div style={{ fontSize: '11px', color: '#4D6B8A', fontWeight: 500 }}>Add Photo</div>
            </div>
            <div style={{ fontSize: '11px', color: '#D4E4F4', marginTop: '5px' }}>—</div>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileRef}
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }}
            />
          </div>
        )}

        {/* Empty slots to fill grid */}
        {Array.from({ length: Math.max(0, 4 - totalShown - (canAddMore ? 1 : 0)) }).map((_, i) => (
          <div key={`empty-${i}`}>
            <div style={{ borderRadius: '8px', aspectRatio: '4/3', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#D4E4F4' }}>
              &#128247;
            </div>
            <div style={{ fontSize: '11px', color: '#D4E4F4', marginTop: '5px', fontWeight: 500 }}>—</div>
          </div>
        ))}
      </div>
      {photos.length >= 4 && (
        <p style={{ fontSize: '12px', color: '#8BAAC4', marginTop: '10px' }}>Maximum of 4 photos per order.</p>
      )}
    </div>
  )
}
