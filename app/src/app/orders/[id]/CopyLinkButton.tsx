'use client'

import { useState } from 'react'

interface CopyLinkButtonProps {
  url: string
  clientName: string
}

export function CopyLinkButton({ url, clientName }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ background: '#F4F8FF', borderRadius: '10px', padding: '16px 18px', border: '1px solid #D4E4F4', marginBottom: '20px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#4D6B8A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
        Client Portal Link
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
        <code style={{ flex: 1, minWidth: '200px', background: 'white', border: '1px solid #D4E4F4', borderRadius: '6px', padding: '7px 10px', fontSize: '12.5px', color: '#1355C2', wordBreak: 'break-all' }}>
          {url}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            padding: '7px 14px',
            background: copied ? '#0D7A4E' : '#1355C2',
            color: 'white',
            border: 'none',
            borderRadius: '7px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.2s',
          }}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
      <div style={{ fontSize: '12px', color: '#4D6B8A' }}>
        Secure link — share only with <strong style={{ color: '#0F2137' }}>{clientName}</strong>
      </div>
    </div>
  )
}
