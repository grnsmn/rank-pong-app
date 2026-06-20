import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Controlla se Supabase è configurato con chiavi valide
export const isSupabaseConfigured =
	supabaseUrl !== '' && supabaseAnonKey !== '' && supabaseUrl !== 'YOUR_SUPABASE_URL'

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
