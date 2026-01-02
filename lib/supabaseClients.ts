import { createClient } from '@supabase/supabase-js'

export const supabaseA = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_1_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_1_ANON_KEY!
)

export const supabaseB = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_2_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_2_ANON_KEY!
)