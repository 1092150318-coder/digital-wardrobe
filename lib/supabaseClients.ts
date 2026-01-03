 import { createClient, SupabaseClient } from '@supabase/supabase-js'

function safeCreateClient(
  url?: string,
  key?: string
): SupabaseClient | null {
  if (!url || !key) return null
  return createClient(url, key)
}

export const supabaseA = safeCreateClient(
  process.env.NEXT_PUBLIC_SUPABASE_1_URL,
  process.env.NEXT_PUBLIC_SUPABASE_1_ANON_KEY
)

export const supabaseB = safeCreateClient(
  process.env.NEXT_PUBLIC_SUPABASE_2_URL,
  process.env.NEXT_PUBLIC_SUPABASE_2_ANON_KEY
)

export const supabaseC = safeCreateClient(
  process.env.NEXT_PUBLIC_SUPABASE_3_URL,
  process.env.NEXT_PUBLIC_SUPABASE_3_ANON_KEY
)

export const supabaseD = safeCreateClient(
  process.env.NEXT_PUBLIC_SUPABASE_4_URL,
  process.env.NEXT_PUBLIC_SUPABASE_4_ANON_KEY
)

export const SUPABASE_SOURCES = [
  { client: supabaseA, buckets: ['wardrobe'] },
  { client: supabaseB, buckets: ['1', '2', '3'] },
  { client: supabaseC, buckets: ['1', '2', '3'] },
  { client: supabaseD, buckets: ['1', '2', '3'] },
]

console.log(
  'ENV CHECK',
  !!process.env.NEXT_PUBLIC_SUPABASE_1_URL,
  !!process.env.NEXT_PUBLIC_SUPABASE_2_URL,
  !!process.env.NEXT_PUBLIC_SUPABASE_3_URL,
  !!process.env.NEXT_PUBLIC_SUPABASE_4_URL
)