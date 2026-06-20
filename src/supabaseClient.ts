import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
// Supabase ha rinominato "anon key" in "publishable key" — supportiamo entrambi
const supabaseAnonKey =
	import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

// Controlla se Supabase è configurato con chiavi valide
export const isSupabaseConfigured =
	supabaseUrl !== '' && supabaseAnonKey !== '' && supabaseUrl !== 'YOUR_SUPABASE_URL'

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
