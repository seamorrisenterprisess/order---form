import { NextResponse } from 'next/server'
import { db } from '@/lib/supabase'

export async function GET() {
  let dbStatus: 'connected' | 'error' = 'error'

  try {
    const { error } = await db.rpc('exec_sql', { sql: 'SELECT 1' }).single()
    // If rpc doesn't exist, fall back to a simple query
    if (error) {
      const { error: queryError } = await db.from('users').select('id').limit(1)
      if (!queryError) dbStatus = 'connected'
    } else {
      dbStatus = 'connected'
    }
  } catch {
    dbStatus = 'error'
  }

  // If the above approach errors, try a direct simple query
  if (dbStatus === 'error') {
    try {
      const { error } = await db.from('users').select('id').limit(1)
      if (!error) dbStatus = 'connected'
    } catch {
      dbStatus = 'error'
    }
  }

  const env = {
    supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    jwt_secret: !!(process.env.JWT_SECRET),
    sendgrid: !!(process.env.SENDGRID_API_KEY),
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
  }

  const payload = {
    status: dbStatus === 'connected' ? 'ok' : 'error',
    db: dbStatus,
    timestamp: new Date().toISOString(),
    env,
  }

  return NextResponse.json(payload, {
    status: dbStatus === 'connected' ? 200 : 503,
  })
}
