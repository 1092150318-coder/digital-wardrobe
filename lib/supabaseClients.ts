console.log('SUPA1_URL', process.env.NEXT_PUBLIC_SUPABASE_1_URL)
console.log('SUPA1_KEY', process.env.NEXT_PUBLIC_SUPABASE_1_ANON_KEY)
console.log('SUPA2_URL', process.env.NEXT_PUBLIC_SUPABASE_2_URL)
console.log('SUPA2_KEY', process.env.NEXT_PUBLIC_SUPABASE_2_ANON_KEY)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl1 = process.env.NEXT_PUBLIC_SUPABASE_1_URL!
const supabaseKey1 = process.env.NEXT_PUBLIC_SUPABASE_1_ANON_KEY!

const supabaseUrl2 = process.env.NEXT_PUBLIC_SUPABASE_2_URL!
const supabaseKey2 = process.env.NEXT_PUBLIC_SUPABASE_2_ANON_KEY!

export const supabaseA = createClient(supabaseUrl1, supabaseKey1)
export const supabaseB = createClient(supabaseUrl2, supabaseKey2)

// 如果你暂时没第三个，一定要这样👇
export const supabaseC = null as any