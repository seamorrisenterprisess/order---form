'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import type { User } from '@/types'

export function MobileNav({ user }: { user: User }) {
  const [open, setOpen] = useState(false)

  // Close on route change (click inside sidebar navigates away)
  useEffect(() => {
    if (open) {
      const handler = () => setOpen(false)
      window.addEventListener('popstate', handler)
      return () => window.removeEventListener('popstate', handler)
    }
  }, [open])

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button
        className="mobile-hamburger"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        style={{
          display: 'none', // shown via CSS media query
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          color: '#0B1829',
          fontSize: '20px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ☰
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11,24,41,0.5)',
            zIndex: 99,
          }}
        />
      )}

      {/* Slide-in sidebar overlay */}
      <div
        className="mobile-nav-drawer"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 100,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          // On desktop this element is hidden entirely via CSS
        }}
      >
        <Sidebar user={user} onNavigate={() => setOpen(false)} />
      </div>
    </>
  )
}
