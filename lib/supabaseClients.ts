import { createClient } from '@supabase/supabase-js'

export const supabaseA = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_A!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY_A!
)

export const supabaseB = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_B!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY_B!
)

export const supabaseC = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_C!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY_C!
)