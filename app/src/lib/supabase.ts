import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Storage bucket name for order photos
export const PHOTOS_BUCKET = 'order-photos'

// Server-side only — uses service role to bypass RLS.
// Never import this in client components.
// Lazy singleton so the build succeeds without env vars present.
let _db: SupabaseClient | null = null
export function getDb(): SupabaseClient {
  if (!_db) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    _db = createClient(url, key, { auth: { persistSession: false } })
  }
  return _db
}

// Backwards-compat named export used throughout the codebase
export const db = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    return (getDb() as any)[prop]
  },
})
