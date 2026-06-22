import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/supabase'
import { signToken, setSessionCookie } from '@/lib/auth'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { token } = await searchParams
  const tokenStr = Array.isArray(token) ? token[0] : token

  if (tokenStr) {
    // Look up the magic link
    const { data: magicLink } = await db
      .from('magic_links')
      .select('id, user_id, used, expires_at')
      .eq('token', tokenStr)
      .single()

    if (magicLink && !magicLink.used && new Date(magicLink.expires_at) > new Date()) {
      // Mark as used
      await db
        .from('magic_links')
        .update({ used: true })
        .eq('id', magicLink.id)

      // Sign JWT and set session cookie
      const jwt = await signToken(magicLink.user_id)
      const cookieConfig = setSessionCookie(jwt)
      const jar = await cookies()
      jar.set(cookieConfig)

      redirect('/dashboard')
    }
  }

  // Invalid or expired token — show error page
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0B1829 0%, #0F2D4A 50%, #0B1829 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '40px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '56px', height: '56px', background: '#FDECEA', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: '24px',
        }}>
          &#x26A0;
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: '#0B1829', marginBottom: '10px' }}>
          Link Expired or Invalid
        </div>
        <p style={{ fontSize: '14px', color: '#4D6B8A', lineHeight: 1.6, marginBottom: '28px' }}>
          This magic link has already been used, has expired, or is not valid.
          Magic links expire after 15 minutes.
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-block', background: '#1355C2', color: 'white',
            textDecoration: 'none', padding: '11px 28px', borderRadius: '7px',
            fontSize: '14px', fontWeight: 600,
          }}
        >
          Back to Login
        </a>
      </div>
    </div>
  )
}
