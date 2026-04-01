const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

if (!process.env.SUPABASE_URL) {
  console.warn('⚠️  SUPABASE_URL not set. Add your keys to .env file.')
}

// Public client - for user-facing operations (respects RLS policies)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Admin client - for backend/admin operations (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

module.exports = { supabase, supabaseAdmin }
