import { supabase, isSupabaseConfigured } from '../supabaseClient'

export interface Profile {
	id: string
	username: string
	display_name: string
	avatar_url: string | null
	age: number | null
	player_type: 'amateur' | 'competitive' | 'student'
	elo_rating: number
	created_at: string
}

export interface Match {
	id: string
	created_by: string
	player_1_id: string
	player_2_id: string
	best_of: 3 | 5
	status: 'pending' | 'confirmed' | 'disputed'
	elo_change_p1: number | null
	elo_change_p2: number | null
	correction_requested_by: string | null
	correction_sets: { set_number: number; score_p1: number; score_p2: number }[] | null
	correction_status: 'pending' | 'approved' | 'rejected' | null
	created_at: string
	player1?: Profile
	player2?: Profile
}

export interface SetScore {
	id: string
	match_id: string
	set_number: number
	score_p1: number
	score_p2: number
}

export interface MatchWithSets extends Match {
	sets: SetScore[]
}

// =========================================================================
// MOCK DATABASE DATA & LOGIC (LOCAL STORAGE FALLBACK)
// =========================================================================

const INITIAL_MOCK_PROFILES: Profile[] = [
	{
		id: 'user-1',
		username: 'marco_topspin',
		display_name: 'Marco Rossi',
		avatar_url:
			'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
		age: 28,
		player_type: 'competitive',
		elo_rating: 1150,
		created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: 'user-2',
		username: 'luca_block',
		display_name: 'Luca Bianchi',
		avatar_url:
			'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&h=150&q=80',
		age: 32,
		player_type: 'amateur',
		elo_rating: 1040,
		created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: 'user-3',
		username: 'chiara_slice',
		display_name: 'Chiara Verdi',
		avatar_url:
			'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
		age: 22,
		player_type: 'student',
		elo_rating: 980,
		created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: 'user-4',
		username: 'antonio_lob',
		display_name: 'Antonio Neri',
		avatar_url:
			'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
		age: 35,
		player_type: 'amateur',
		elo_rating: 1010,
		created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
	},
]

const INITIAL_MOCK_MATCHES: MatchWithSets[] = [
	{
		id: 'match-1',
		created_by: 'user-1',
		player_1_id: 'user-1',
		player_2_id: 'user-2',
		best_of: 3,
		status: 'confirmed',
		elo_change_p1: 15,
		elo_change_p2: -15,
		correction_requested_by: null,
		correction_sets: null,
		correction_status: null,
		created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		sets: [
			{ id: 'set-1-1', match_id: 'match-1', set_number: 1, score_p1: 11, score_p2: 8 },
			{ id: 'set-1-2', match_id: 'match-1', set_number: 2, score_p1: 9, score_p2: 11 },
			{ id: 'set-1-3', match_id: 'match-1', set_number: 3, score_p1: 11, score_p2: 5 },
		],
	},
]

function initializeMockData() {
	if (!localStorage.getItem('rp_profiles')) {
		localStorage.setItem('rp_profiles', JSON.stringify(INITIAL_MOCK_PROFILES))
	}
	if (!localStorage.getItem('rp_matches')) {
		localStorage.setItem('rp_matches', JSON.stringify(INITIAL_MOCK_MATCHES))
	}
}

initializeMockData()

// Utility per calcolare Elo in TS (replica della logica SQL per la demo offline/mock)
export function calculateEloTS(
	rA: number,
	rB: number,
	setsA: number,
	setsB: number,
	k: number = 32
) {
	const sA = setsA > setsB ? 1.0 : 0.0
	const sB = setsA > setsB ? 0.0 : 1.0

	const eA = 1.0 / (1.0 + Math.pow(10.0, (rB - rA) / 400.0))
	const eB = 1.0 / (1.0 + Math.pow(10.0, (rA - rB) / 400.0))

	const changeA = Math.round(k * (sA - eA))
	const changeB = Math.round(k * (sB - eB))

	return { changeA, changeB }
}

// =========================================================================
// INTERFACCIA E LOGICHE DEI SERVIZI
// =========================================================================

export const dbService = {
	// --- AUTH SERVICES ---
	async getCurrentUser(): Promise<{
		id: string
		email: string
		username: string
		display_name: string
	} | null> {
		if (isSupabaseConfigured && supabase) {
			const {
				data: { user },
			} = await supabase.auth.getUser()
			if (!user) return null

			const { data: profile } = await supabase
				.from('profiles')
				.select('username, display_name')
				.eq('id', user.id)
				.single()

			return {
				id: user.id,
				email: user.email || '',
				username: profile?.username || '',
				display_name: profile?.display_name || '',
			}
		} else {
			const activeSession = localStorage.getItem('rp_session')
			if (!activeSession) return null

			const profile = JSON.parse(activeSession) as Profile
			return {
				id: profile.id,
				email: `${profile.username}@rankpong.local`,
				username: profile.username,
				display_name: profile.display_name,
			}
		}
	},

	async signup(
		email: string,
		password: string,
		username: string,
		displayName: string,
		age: number,
		playerType: 'amateur' | 'competitive' | 'student'
	): Promise<Profile> {
		if (isSupabaseConfigured && supabase) {
			// 1. Registrazione utente Auth
			const { data: authData, error: authError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						username,
						display_name: displayName,
						age,
						player_type: playerType,
					},
				},
			})

			if (authError || !authData.user) {
				throw new Error(authError?.message || 'Registrazione fallita')
			}

			// Il trigger Supabase crea la riga in profiles automaticamente.
			// Eseguiamo una fetch per recuperarla ed essere certi sia creata
			const { data: profile, error: profError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', authData.user.id)
				.single()

			if (profError || !profile) {
				throw new Error(profError?.message || 'Profilo non creato dal trigger')
			}

			// Salviamo sessione locale
			localStorage.setItem('rp_session', JSON.stringify(profile))
			return profile as Profile
		} else {
			// Mock signup
			const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]
			if (profiles.some(p => p.username === username)) {
				throw new Error('Questo username è già registrato')
			}

			const newProfile: Profile = {
				id: 'user-' + Math.random().toString(36).substr(2, 9),
				username,
				display_name: displayName,
				avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
				age,
				player_type: playerType,
				elo_rating: 1000,
				created_at: new Date().toISOString(),
			}

			profiles.push(newProfile)
			localStorage.setItem('rp_profiles', JSON.stringify(profiles))
			localStorage.setItem('rp_session', JSON.stringify(newProfile))
			return newProfile
		}
	},

	async login(email: string, password: string): Promise<Profile> {
		if (isSupabaseConfigured && supabase) {
			const { data, error } = await supabase.auth.signInWithPassword({ email, password })
			if (error || !data.user) {
				throw new Error(error?.message || 'Login fallito')
			}

			const { data: profile, error: profError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', data.user.id)
				.single()

			if (profError || !profile) {
				throw new Error("Impossibile caricare il profilo dell'utente")
			}

			localStorage.setItem('rp_session', JSON.stringify(profile))
			return profile as Profile
		} else {
			// Mock login: usiamo email come username
			const username = email.split('@')[0]
			const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]
			const profile = profiles.find(p => p.username === username)

			if (!profile) {
				throw new Error(
					"Utente non trovato (inserisci l'email con l'username dei giocatori di prova, es: marco_topspin@rankpong.local)"
				)
			}

			localStorage.setItem('rp_session', JSON.stringify(profile))
			return profile
		}
	},

	async logout(): Promise<void> {
		if (isSupabaseConfigured && supabase) {
			await supabase.auth.signOut()
		}
		localStorage.removeItem('rp_session')
	},

	// --- PROFILES SERVICES ---
	async getProfiles(): Promise<Profile[]> {
		if (isSupabaseConfigured && supabase) {
			const { data, error } = await supabase
				.from('profiles')
				.select('*')
				.order('elo_rating', { ascending: false })
			if (error) throw error
			return data as Profile[]
		} else {
			const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]
			return profiles.sort((a, b) => b.elo_rating - a.elo_rating)
		}
	},

	async getProfile(id: string): Promise<Profile> {
		if (isSupabaseConfigured && supabase) {
			const { data, error } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', id)
				.single()
			if (error) throw error
			return data as Profile
		} else {
			const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]
			const profile = profiles.find(p => p.id === id)
			if (!profile) throw new Error('Profilo non trovato')
			return profile
		}
	},

	// --- MATCHES SERVICES ---
	async getMatches(): Promise<MatchWithSets[]> {
		if (isSupabaseConfigured && supabase) {
			// Fetch dei match e dei set relativi
			const { data: matchesData, error: matchesError } = await supabase
				.from('matches')
				.select(
					`
          *,
          player1:player_1_id(*),
          player2:player_2_id(*)
        `
				)
				.order('created_at', { ascending: false })

			if (matchesError) throw matchesError

			const { data: setsData, error: setsError } = await supabase.from('sets').select('*')

			if (setsError) throw setsError

			return matchesData.map((match: any) => ({
				...match,
				sets: setsData
					.filter((set: any) => set.match_id === match.id)
					.sort((a, b) => a.set_number - b.set_number),
			})) as MatchWithSets[]
		} else {
			const matches = JSON.parse(
				localStorage.getItem('rp_matches') || '[]'
			) as MatchWithSets[]
			const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]

			return matches
				.map(match => ({
					...match,
					correction_requested_by: match.correction_requested_by ?? null,
					correction_sets: match.correction_sets ?? null,
					correction_status: match.correction_status ?? null,
					player1: profiles.find(p => p.id === match.player_1_id),
					player2: profiles.find(p => p.id === match.player_2_id),
				}))
				.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		}
	},

	async createMatch(
		player1Id: string,
		player2Id: string,
		bestOf: 3 | 5,
		setScores: { set_number: number; score_p1: number; score_p2: number }[]
	): Promise<MatchWithSets> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato per registrare un match')

		if (isSupabaseConfigured && supabase) {
			// Inserisce il match
			const { data: match, error: matchError } = await supabase
				.from('matches')
				.insert({
					created_by: currentUser.id,
					player_1_id: player1Id,
					player_2_id: player2Id,
					best_of: bestOf,
					status: 'pending', // Doppia conferma attiva, parte pending
				})
				.select()
				.single()

			if (matchError) throw matchError

			// Inserisce i set
			const setsToInsert = setScores.map(set => ({
				match_id: match.id,
				set_number: set.set_number,
				score_p1: set.score_p1,
				score_p2: set.score_p2,
			}))

			const { data: sets, error: setsError } = await supabase
				.from('sets')
				.insert(setsToInsert)
				.select()

			if (setsError) throw setsError

			return {
				...match,
				sets: sets.sort((a, b) => a.set_number - b.set_number),
			} as MatchWithSets
		} else {
			// Mock create match
			const matches = JSON.parse(
				localStorage.getItem('rp_matches') || '[]'
			) as MatchWithSets[]

			const newMatch: MatchWithSets = {
				id: 'match-' + Math.random().toString(36).substr(2, 9),
				created_by: currentUser.id,
				player_1_id: player1Id,
				player_2_id: player2Id,
				best_of: bestOf,
				status: 'pending',
				elo_change_p1: null,
				elo_change_p2: null,
				created_at: new Date().toISOString(),
				correction_requested_by: null,
				correction_sets: null,
				correction_status: null,
				sets: setScores.map((set, index) => ({
					id: `set-mock-${index}-${Math.random()}`,
					match_id: '',
					set_number: set.set_number,
					score_p1: set.score_p1,
					score_p2: set.score_p2,
				})),
			}

			newMatch.sets.forEach(s => (s.match_id = newMatch.id))
			matches.push(newMatch)
			localStorage.setItem('rp_matches', JSON.stringify(matches))
			return newMatch
		}
	},

	async confirmMatch(matchId: string): Promise<MatchWithSets> {
		if (isSupabaseConfigured && supabase) {
			// L'aggiornamento dello stato scatena il trigger Postgres che calcola l'Elo
			const { data: match, error } = await supabase
				.from('matches')
				.update({ status: 'confirmed' })
				.eq('id', matchId)
				.select()
				.single()

			if (error) throw error

			// Recuperiamo i set per completare l'oggetto
			const { data: sets, error: setsError } = await supabase
				.from('sets')
				.select('*')
				.eq('match_id', matchId)
				.order('set_number')

			if (setsError) throw setsError

			return {
				...match,
				sets,
			} as MatchWithSets
		} else {
			// Mock confirm match con ricalcolo Elo in TypeScript
			const matches = JSON.parse(
				localStorage.getItem('rp_matches') || '[]'
			) as MatchWithSets[]
			const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]

			const matchIndex = matches.findIndex(m => m.id === matchId)
			if (matchIndex === -1) throw new Error('Match non trovato')

			const match = matches[matchIndex]
			if (match.status === 'confirmed') throw new Error('Match già confermato')

			// Calcola quanti set ha vinto ciascun giocatore
			let setsWonP1 = 0
			let setsWonP2 = 0
			match.sets.forEach(set => {
				if (set.score_p1 > set.score_p2) setsWonP1++
				else setsWonP2++
			})

			const profile1 = profiles.find(p => p.id === match.player_1_id)
			const profile2 = profiles.find(p => p.id === match.player_2_id)

			if (!profile1 || !profile2) throw new Error('Giocatori non trovati')

			// Formula Elo
			const { changeA, changeB } = calculateEloTS(
				profile1.elo_rating,
				profile2.elo_rating,
				setsWonP1,
				setsWonP2
			)

			// Aggiorna profili
			profile1.elo_rating = Math.max(0, profile1.elo_rating + changeA)
			profile2.elo_rating = Math.max(0, profile2.elo_rating + changeB)

			// Aggiorna match
			match.status = 'confirmed'
			match.elo_change_p1 = changeA
			match.elo_change_p2 = changeB

			localStorage.setItem('rp_profiles', JSON.stringify(profiles))
			localStorage.setItem('rp_matches', JSON.stringify(matches))

			return match
		}
	},

	async disputeMatch(matchId: string): Promise<MatchWithSets> {
		if (isSupabaseConfigured && supabase) {
			const { data: match, error } = await supabase
				.from('matches')
				.update({ status: 'disputed' })
				.eq('id', matchId)
				.select()
				.single()

			if (error) throw error

			const { data: sets, error: setsError } = await supabase
				.from('sets')
				.select('*')
				.eq('match_id', matchId)
				.order('set_number')

			if (setsError) throw setsError

			return {
				...match,
				sets,
			} as MatchWithSets
		} else {
			const matches = JSON.parse(
				localStorage.getItem('rp_matches') || '[]'
			) as MatchWithSets[]
			const matchIndex = matches.findIndex(m => m.id === matchId)
			if (matchIndex === -1) throw new Error('Match non trovato')

			matches[matchIndex].status = 'disputed'
			localStorage.setItem('rp_matches', JSON.stringify(matches))
			return matches[matchIndex]
		}
	},

	async requestCorrection(
		matchId: string,
		newSets: { set_number: number; score_p1: number; score_p2: number }[]
	): Promise<void> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('request_correction', {
				match_id_param: matchId,
				new_sets: newSets,
			})
			if (error) throw error
		} else {
			const matches = JSON.parse(
				localStorage.getItem('rp_matches') || '[]'
			) as MatchWithSets[]
			const idx = matches.findIndex(m => m.id === matchId)
			if (idx === -1) throw new Error('Match non trovato')
			const m = matches[idx]
			if (m.status !== 'confirmed')
				throw new Error('Solo i match confermati possono essere corretti')
			if (m.correction_status === 'pending') throw new Error('Correzione già in attesa')
			if (currentUser.id !== m.player_1_id && currentUser.id !== m.player_2_id)
				throw new Error('Non sei un giocatore di questo match')

			matches[idx].correction_requested_by = currentUser.id
			matches[idx].correction_sets = newSets
			matches[idx].correction_status = 'pending'
			localStorage.setItem('rp_matches', JSON.stringify(matches))
		}
	},

	async approveCorrection(matchId: string): Promise<void> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('approve_correction', {
				match_id_param: matchId,
			})
			if (error) throw error
		} else {
			const matches = JSON.parse(
				localStorage.getItem('rp_matches') || '[]'
			) as MatchWithSets[]
			const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]
			const idx = matches.findIndex(m => m.id === matchId)
			if (idx === -1) throw new Error('Match non trovato')
			const m = matches[idx]

			if (m.correction_status !== 'pending') throw new Error('Nessuna correzione in attesa')
			if (m.correction_requested_by === currentUser.id)
				throw new Error('Non puoi approvare la tua stessa richiesta')
			if (currentUser.id !== m.player_1_id && currentUser.id !== m.player_2_id)
				throw new Error('Non sei un giocatore di questo match')

			const profile1 = profiles.find(p => p.id === m.player_1_id)!
			const profile2 = profiles.find(p => p.id === m.player_2_id)!

			// Reversa Elo precedente
			profile1.elo_rating = Math.max(0, profile1.elo_rating - (m.elo_change_p1 ?? 0))
			profile2.elo_rating = Math.max(0, profile2.elo_rating - (m.elo_change_p2 ?? 0))

			// Aggiorna i set con i nuovi punteggi
			const newSets = m.correction_sets!
			newSets.forEach(ns => {
				const s = matches[idx].sets.find(s => s.set_number === ns.set_number)
				if (s) {
					s.score_p1 = ns.score_p1
					s.score_p2 = ns.score_p2
				}
			})

			// Ricalcola set vinti
			let setsP1 = 0,
				setsP2 = 0
			matches[idx].sets.forEach(s => {
				if (s.score_p1 > s.score_p2) setsP1++
				else setsP2++
			})

			// Ricalcola Elo
			const { changeA, changeB } = calculateEloTS(
				profile1.elo_rating,
				profile2.elo_rating,
				setsP1,
				setsP2
			)

			profile1.elo_rating = Math.max(0, profile1.elo_rating + changeA)
			profile2.elo_rating = Math.max(0, profile2.elo_rating + changeB)

			matches[idx].elo_change_p1 = changeA
			matches[idx].elo_change_p2 = changeB
			matches[idx].correction_status = 'approved'
			matches[idx].correction_requested_by = null
			matches[idx].correction_sets = null

			localStorage.setItem('rp_matches', JSON.stringify(matches))
			localStorage.setItem('rp_profiles', JSON.stringify(profiles))

			// Aggiorna sessione se il profilo corrente è coinvolto
			const session = JSON.parse(
				localStorage.getItem('rp_session') || 'null'
			) as Profile | null
			if (session) {
				if (session.id === profile1.id)
					localStorage.setItem('rp_session', JSON.stringify(profile1))
				else if (session.id === profile2.id)
					localStorage.setItem('rp_session', JSON.stringify(profile2))
			}
		}
	},

	async rejectCorrection(matchId: string): Promise<void> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('reject_correction', {
				match_id_param: matchId,
			})
			if (error) throw error
		} else {
			const matches = JSON.parse(
				localStorage.getItem('rp_matches') || '[]'
			) as MatchWithSets[]
			const idx = matches.findIndex(m => m.id === matchId)
			if (idx === -1) throw new Error('Match non trovato')

			matches[idx].correction_status = 'rejected'
			matches[idx].correction_requested_by = null
			matches[idx].correction_sets = null
			localStorage.setItem('rp_matches', JSON.stringify(matches))
		}
	},

	async updateProfile(
		id: string,
		updates: {
			display_name?: string
			age?: number | null
			player_type?: 'amateur' | 'competitive' | 'student'
		}
	): Promise<Profile> {
		if (isSupabaseConfigured && supabase) {
			const { data, error } = await supabase
				.from('profiles')
				.update(updates)
				.eq('id', id)
				.select('*')
				.single()

			if (error) throw error

			localStorage.setItem('rp_session', JSON.stringify(data))
			return data as Profile
		} else {
			const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]
			const index = profiles.findIndex(p => p.id === id)
			if (index === -1) throw new Error('Profilo non trovato')

			profiles[index] = { ...profiles[index], ...updates }
			localStorage.setItem('rp_profiles', JSON.stringify(profiles))
			localStorage.setItem('rp_session', JSON.stringify(profiles[index]))
			return profiles[index]
		}
	},
}
