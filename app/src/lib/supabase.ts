import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side only — uses service role to bypass RLS.
// Never import this in client components.
export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

// Storage bucket name for order photos
export const PHOTOS_BUCKET = 'order-photos'
