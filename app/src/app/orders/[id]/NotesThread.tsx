'use client'

import { useActionState, useRef, useEffect } from 'react'
import { addNote } from '@/lib/actions'
import type { OrderNote } from '@/types'

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export function NotesThread({
  notes,
  orderId,
  currentUserId,
}: {
  notes: OrderNote[]
  orderId: string
  currentUserId: string
}) {
  const [state, action, pending] = useActionState(addNote, null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      if (textareaRef.current) textareaRef.current.value = ''
    }
  }, [state])

  return (
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #D4E4F4', fontWeight: 600, fontSize: '14px', color: '#0F2137', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '15px' }}>&#128274;</span>
        Internal Notes
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#4D6B8A', background: '#F4F8FF', padding: '2px 8px', borderRadius: '20px', marginLeft: '4px' }}>
          Team only
        </span>
      </div>

      {/* Thread */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notes.length === 0 && (
          <div style={{ color: '#8BAAC4', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
            No notes yet. Add the first one below.
          </div>
        )}

        {notes.map(note => {
          const isMe = note.author_id === currentUserId
          const initials = note.author?.avatar_initials ?? (note.author?.name?.slice(0, 2).toUpperCase() ?? '??')
          const name = note.author?.name ?? 'Team Member'

          return (
            <div
              key={note.id}
              style={{
                display: 'flex',
                flexDirection: isMe ? 'row-reverse' : 'row',
                gap: '10px',
                alignItems: 'flex-end',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: isMe ? '#1355C2' : '#8BAAC4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: 'white',
              }}>
                {initials}
              </div>

              {/* Bubble */}
              <div style={{ maxWidth: '70%' }}>
                <div style={{
                  fontSize: '11px', color: '#8BAAC4', marginBottom: '4px',
                  textAlign: isMe ? 'right' : 'left',
                }}>
                  {isMe ? 'You' : name} &middot; {formatTime(note.created_at)}
                </div>
                <div style={{
                  background: isMe ? '#1355C2' : '#F4F8FF',
                  color: isMe ? 'white' : '#0F2137',
                  padding: '10px 14px',
                  borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  fontSize: '13.5px', lineHeight: 1.6,
                  border: isMe ? 'none' : '1px solid #E8EFF7',
                }}>
                  {note.body}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Compose */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ borderTop: '1px solid #E8EFF7', paddingTop: '16px' }}>
          {state?.error && (
            <div style={{ background: '#FDECEA', border: '1px solid #e8a09a', borderRadius: '7px', padding: '8px 12px', marginBottom: '10px', color: '#C0392B', fontSize: '12.5px' }}>
              {state.error}
            </div>
          )}
          <form ref={formRef} action={action} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <input type="hidden" name="order_id" value={orderId} />
            <textarea
              ref={textareaRef}
              name="body"
              placeholder="Add an internal note…"
              rows={2}
              style={{
                flex: 1, padding: '9px 12px', border: '1.5px solid #D4E4F4', borderRadius: '8px',
                fontSize: '13.5px', color: '#0F2137', outline: 'none', resize: 'vertical',
                fontFamily: 'var(--font-body)', minHeight: '60px',
              }}
            />
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: '9px 16px', background: pending ? '#8BAAC4' : '#1355C2', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
                cursor: pending ? 'not-allowed' : 'pointer', flexShrink: 0, height: '40px',
                alignSelf: 'flex-end',
              }}
            >
              {pending ? '...' : 'Add Note'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
