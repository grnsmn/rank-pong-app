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
	is_friendly: boolean
	elo_change_p1: number | null
	elo_change_p2: number | null
	player_1_confirmed: boolean
	player_2_confirmed: boolean
	correction_requested_by: string | null
	correction_sets: { set_number: number; score_p1: number; score_p2: number }[] | null
	correction_status: 'pending' | 'approved' | 'rejected' | null
	event_id: string | null
	created_at: string
	player1?: Profile
	player2?: Profile
	creator?: Profile
	/** Nome dell'edizione, quando la partita fa parte di un evento */
	event_name?: string
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

// --- EVENTI ---
// Una serie si ripete in edizioni; il piazzamento finale assegna punti al
// ranking globale, che si difendono all'edizione successiva della stessa serie.

export type EventStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type ParticipantStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

export interface EventSeries {
	id: string
	name: string
	format: 'round_robin'
	default_points: Record<string, number>
	created_by: string | null
	created_at: string
}

export interface EventRow {
	id: string
	series_id: string
	edition_number: number
	name: string
	status: EventStatus
	participants_count: number
	best_of: 3 | 5
	ranking_points: Record<string, number>
	registration_deadline: string | null
	started_at: string | null
	completed_at: string | null
	created_by: string | null
	created_at: string
	series_name?: string
	creator_name?: string
	accepted_count?: number
	matches_total?: number
	matches_played?: number
	/** L'utente corrente e' iscritto */
	i_am_in?: boolean
	/** L'utente corrente e' l'organizzatore */
	i_organize?: boolean
}

export interface EventParticipant {
	id: string
	event_id: string
	player_id: string
	status: ParticipantStatus
	joined_at: string
	player?: Profile
}

export interface EventMatchSlot {
	id: string
	event_id: string
	match_id: string | null
	player_1_id: string
	player_2_id: string
	position: number
	player1?: Profile
	player2?: Profile
	match?: MatchWithSets
}

export interface EventResult {
	id: string
	event_id: string
	series_id: string
	player_id: string
	final_rank: number
	ranking_points: number
	awarded_at: string
	event_name?: string
	edition_number?: number
	is_current?: boolean
	player_name?: string
}

export interface StandingRow {
	player_id: string
	position: number
	played: number
	wins: number
	losses: number
	sets_won: number
	sets_lost: number
	set_diff: number
	point_diff: number
	player?: Profile
	/** Punti che il giocatore sta difendendo in questa serie */
	defending_points?: number
	/** Punti che prenderebbe con questo piazzamento */
	projected_points?: number
	/** Differenza fra i due: la proiezione sul ranking */
	projected_delta?: number
}

export interface EventDetail extends EventRow {
	participants: EventParticipant[]
	slots: EventMatchSlot[]
	standings: StandingRow[]
}

export interface RankingRow extends Profile {
	event_points: number
	total_points: number
}

export interface Palmares {
	titles: number
	seconds: number
	thirds: number
	editions_played: number
	results: EventResult[]
	/** Serie di cui il giocatore e' campione in carica */
	reigning: string[]
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
		is_friendly: false,
		elo_change_p1: 15,
		elo_change_p2: -15,
		player_1_confirmed: true,
		player_2_confirmed: true,
		correction_requested_by: null,
		correction_sets: null,
		correction_status: null,
		event_id: null,
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

function kForType(type: string): number {
	if (type === 'competitive') return 24
	if (type === 'student') return 48
	return 32
}

export function calculateEloTS(
	rA: number,
	rB: number,
	setsA: number,
	setsB: number,
	typeA: string = 'amateur',
	typeB: string = 'amateur'
) {
	const kA = kForType(typeA)
	const kB = kForType(typeB)

	const sA = setsA > setsB ? 1.0 : 0.0
	const sB = setsA > setsB ? 0.0 : 1.0

	const eA = 1.0 / (1.0 + Math.pow(10.0, (rB - rA) / 400.0))
	const eB = 1.0 / (1.0 + Math.pow(10.0, (rA - rB) / 400.0))

	const changeA = Math.round(kA * (sA - eA))
	const changeB = Math.round(kB * (sB - eB))

	return { changeA, changeB }
}

// =========================================================================
// HELPER EVENTI (puri, usati da entrambi i rami del doppio binario)
// =========================================================================

/**
 * Preset punti per numero di giocatori: sempre esattamente n posizioni.
 * La curva decade fino all'ultimo posto, che prende comunque una quota
 * proporzionata (circa meta' del penultimo) invece di zero.
 * Replica di default_event_points in SQL.
 */
const POINTS_PRESETS: Record<number, number[]> = {
	4: [120, 70, 40, 20],
	5: [140, 90, 55, 32, 16],
	6: [180, 120, 80, 45, 20, 10],
	7: [200, 135, 90, 58, 35, 20, 10],
	8: [220, 150, 100, 66, 42, 26, 15, 8],
}

export function defaultEventPoints(n: number): Record<string, number> {
	const preset = POINTS_PRESETS[n] ?? POINTS_PRESETS[6]
	const out: Record<string, number> = {}
	preset.forEach((value, index) => (out[String(index + 1)] = value))
	return out
}

/** Tutte le coppie una sola volta, nello stesso ordine di start_event in SQL. */
export function generateRoundRobinPairings(
	playerIds: string[]
): { p1: string; p2: string; position: number }[] {
	const out: { p1: string; p2: string; position: number }[] = []
	let position = 1
	for (let i = 0; i < playerIds.length - 1; i++) {
		for (let j = i + 1; j < playerIds.length; j++) {
			out.push({ p1: playerIds[i], p2: playerIds[j], position: position++ })
		}
	}
	return out
}

/**
 * Classifica del girone. Replica di event_standings in SQL.
 * Tie-break: vittorie -> scontro diretto fra pari vittorie -> differenza set
 * -> differenza punti -> ELO.
 */
export function computeStandings(
	participantIds: string[],
	matches: MatchWithSets[],
	eloById: Record<string, number>
): StandingRow[] {
	const base: Record<
		string,
		{ played: number; wins: number; sw: number; sl: number; pf: number; pa: number }
	> = {}
	participantIds.forEach(id => {
		base[id] = { played: 0, wins: 0, sw: 0, sl: 0, pf: 0, pa: 0 }
	})

	const beaten: Record<string, string[]> = {}
	participantIds.forEach(id => (beaten[id] = []))

	matches
		.filter(m => m.status === 'confirmed')
		.forEach(m => {
			const a = m.player_1_id
			const b = m.player_2_id
			if (!base[a] || !base[b]) return

			let setsA = 0
			let setsB = 0
			let ptsA = 0
			let ptsB = 0
			m.sets.forEach(set => {
				if (set.score_p1 > set.score_p2) setsA++
				else if (set.score_p2 > set.score_p1) setsB++
				ptsA += set.score_p1
				ptsB += set.score_p2
			})

			base[a].played++
			base[b].played++
			base[a].sw += setsA
			base[a].sl += setsB
			base[b].sw += setsB
			base[b].sl += setsA
			base[a].pf += ptsA
			base[a].pa += ptsB
			base[b].pf += ptsB
			base[b].pa += ptsA

			if (setsA > setsB) {
				base[a].wins++
				beaten[a].push(b)
			} else {
				base[b].wins++
				beaten[b].push(a)
			}
		})

	// Scontro diretto: vittorie contro giocatori con lo stesso numero di vittorie
	const h2h: Record<string, number> = {}
	participantIds.forEach(id => {
		h2h[id] = beaten[id].filter(opp => base[opp] && base[opp].wins === base[id].wins).length
	})

	return participantIds
		.slice()
		.sort((x, y) => {
			const bx = base[x]
			const by = base[y]
			if (by.wins !== bx.wins) return by.wins - bx.wins
			if (h2h[y] !== h2h[x]) return h2h[y] - h2h[x]
			const dx = bx.sw - bx.sl
			const dy = by.sw - by.sl
			if (dy !== dx) return dy - dx
			const px = bx.pf - bx.pa
			const py = by.pf - by.pa
			if (py !== px) return py - px
			return (eloById[y] ?? 0) - (eloById[x] ?? 0)
		})
		.map((id, index) => ({
			player_id: id,
			position: index + 1,
			played: base[id].played,
			wins: base[id].wins,
			losses: base[id].played - base[id].wins,
			sets_won: base[id].sw,
			sets_lost: base[id].sl,
			set_diff: base[id].sw - base[id].sl,
			point_diff: base[id].pf - base[id].pa,
		}))
}

// --- Storage mock e builder condivisi dai due rami ---

const EV = {
	series: 'rp_event_series',
	events: 'rp_events',
	participants: 'rp_event_participants',
	slots: 'rp_event_matches',
	results: 'rp_event_results',
} as const

function readMock<T>(key: string): T[] {
	return JSON.parse(localStorage.getItem(key) || '[]') as T[]
}

function writeMock<T>(key: string, rows: T[]): void {
	localStorage.setItem(key, JSON.stringify(rows))
}

function mockId(prefix: string): string {
	return prefix + '-' + Math.random().toString(36).slice(2, 11)
}

type EditionRef = { id: string; edition_number: number; status: string }
type ResultRef = { player_id: string; event_id: string; ranking_points: number }

/**
 * Punti che ogni giocatore sta difendendo in una serie: quelli della sua
 * edizione conclusa piu' recente *precedente* a quella indicata.
 */
export function defendingPointsFor(
	seriesEvents: EditionRef[],
	seriesResults: ResultRef[],
	beforeEdition: number
): Record<string, number> {
	const eligible = new Map<string, number>()
	seriesEvents
		.filter(e => e.status === 'completed' && e.edition_number < beforeEdition)
		.forEach(e => eligible.set(e.id, e.edition_number))

	const best: Record<string, { edition: number; points: number }> = {}
	seriesResults.forEach(r => {
		const edition = eligible.get(r.event_id)
		if (edition === undefined) return
		const cur = best[r.player_id]
		if (!cur || edition > cur.edition) {
			best[r.player_id] = { edition, points: r.ranking_points }
		}
	})

	const out: Record<string, number> = {}
	Object.entries(best).forEach(([playerId, v]) => (out[playerId] = v.points))
	return out
}

/** Arricchisce la classifica con la proiezione della difesa. */
function withProjection(
	standings: StandingRow[],
	rankingPoints: Record<string, number>,
	defending: Record<string, number>
): StandingRow[] {
	return standings.map(row => {
		const projected = rankingPoints[String(row.position)] ?? 0
		const defend = defending[row.player_id] ?? 0
		return {
			...row,
			defending_points: defend,
			projected_points: projected,
			projected_delta: projected - defend,
		}
	})
}

/** Palmares e campionati in carica a partire dai risultati grezzi. */
export function buildPalmares(
	playerId: string,
	results: EventResult[],
	events: (EditionRef & { name: string; series_id: string })[]
): Palmares {
	const byId = new Map(events.map(e => [e.id, e]))
	const mine = results
		.filter(r => r.player_id === playerId && byId.get(r.event_id)?.status === 'completed')
		.map(r => {
			const ev = byId.get(r.event_id)!
			return { ...r, event_name: ev.name, edition_number: ev.edition_number }
		})
		.sort((a, b) => (b.edition_number ?? 0) - (a.edition_number ?? 0))

	// Per ogni serie, l'edizione conclusa piu' recente decide chi e' in carica
	// e quale risultato del giocatore conta ancora nel ranking.
	const latestBySeries: Record<string, number> = {}
	events
		.filter(e => e.status === 'completed')
		.forEach(e => {
			if (
				!(e.series_id in latestBySeries) ||
				e.edition_number > latestBySeries[e.series_id]
			) {
				latestBySeries[e.series_id] = e.edition_number
			}
		})

	const reigning: string[] = []
	const withCurrent = mine.map(r => {
		const ev = byId.get(r.event_id)!
		const isCurrent = latestBySeries[ev.series_id] === ev.edition_number
		if (isCurrent && r.final_rank === 1) reigning.push(ev.name)
		return { ...r, is_current: isCurrent }
	})

	return {
		titles: mine.filter(r => r.final_rank === 1).length,
		seconds: mine.filter(r => r.final_rank === 2).length,
		thirds: mine.filter(r => r.final_rank === 3).length,
		editions_played: mine.length,
		results: withCurrent,
		reigning,
	}
}

/**
 * true quando l'errore dice che la sezione 9 dello schema non e' ancora
 * applicata al database. Serve a far degradare l'app invece di svuotarla:
 * finche' la migration non gira, il ranking e' semplicemente l'ELO.
 */
let missingSchemaWarned = false
function isMissingEventSchema(error: { code?: string; message?: string } | null): boolean {
	if (!error) return false
	// 42P01 = undefined_table, PGRST205 = tabella assente dalla schema cache
	const missing =
		error.code === '42P01' ||
		error.code === 'PGRST205' ||
		/does not exist|could not find the (table|relation)/i.test(error.message ?? '')
	if (missing && !missingSchemaWarned) {
		missingSchemaWarned = true
		console.warn(
			'[RankPong] Schema eventi assente: applica la sezione 9 di supabase-schema.sql. ' +
				'Fino ad allora la sezione Eventi resta vuota e il ranking mostra il solo ELO.'
		)
	}
	return missing
}

/**
 * Ramo mock di begin_event: chiude le iscrizioni e genera il girone.
 * Restituisce true se l'edizione e' stata avviata.
 */
function mockBeginEvent(eventId: string): boolean {
	const events = readMock<EventRow>(EV.events)
	const ev = events.find(e => e.id === eventId)
	if (!ev || ev.status !== 'open') return false

	const roster = readMock<EventParticipant>(EV.participants)
		.filter(x => x.event_id === eventId && x.status === 'accepted')
		.sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
		.map(x => x.player_id)
	if (roster.length < 4) return false

	const slots = readMock<EventMatchSlot>(EV.slots)
	generateRoundRobinPairings(roster).forEach(pair => {
		slots.push({
			id: mockId('slot'),
			event_id: eventId,
			match_id: null,
			player_1_id: pair.p1,
			player_2_id: pair.p2,
			position: pair.position,
		})
	})
	writeMock(EV.slots, slots)

	ev.status = 'in_progress'
	ev.participants_count = roster.length
	ev.started_at = new Date().toISOString()
	writeMock(EV.events, events)
	return true
}

/**
 * Ramo mock del trigger auto_finalize_event: quando tutte le partite del
 * girone sono confermate l'edizione si chiude e i punti vengono assegnati.
 */
function mockFinalizeEventIfComplete(eventId: string): void {
	const events = readMock<EventRow>(EV.events)
	const ev = events.find(e => e.id === eventId)
	if (!ev || ev.status !== 'in_progress') return

	const slots = readMock<EventMatchSlot>(EV.slots).filter(x => x.event_id === eventId)
	const matches = readMock<MatchWithSets>('rp_matches')
	const played = slots.filter(
		sl => matches.find(m => m.id === sl.match_id)?.status === 'confirmed'
	).length
	if (slots.length === 0 || played < slots.length) return

	const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]
	const eloById: Record<string, number> = {}
	profiles.forEach(p => (eloById[p.id] = p.elo_rating))

	const roster = readMock<EventParticipant>(EV.participants)
		.filter(x => x.event_id === eventId && x.status === 'accepted')
		.map(x => x.player_id)

	const standings = computeStandings(
		roster,
		matches.filter(m => slots.some(sl => sl.match_id === m.id)),
		eloById
	)

	const results = readMock<EventResult>(EV.results).filter(r => r.event_id !== eventId)
	standings.forEach(row => {
		results.push({
			id: mockId('res'),
			event_id: eventId,
			series_id: ev.series_id,
			player_id: row.player_id,
			final_rank: row.position,
			ranking_points: ev.ranking_points[String(row.position)] ?? 0,
			awarded_at: new Date().toISOString(),
		})
	})
	writeMock(EV.results, results)

	ev.status = 'completed'
	ev.completed_at = new Date().toISOString()
	writeMock(EV.events, events)
}

/** Punti evento correnti per giocatore (ramo mock della view ranking). */
function mockCurrentSeriesPoints(): Record<string, number> {
	const events = readMock<EventRow>(EV.events)
	const results = readMock<EventResult>(EV.results)
	const bySeries = new Map<string, EditionRef[]>()
	events.forEach(e => {
		const list = bySeries.get(e.series_id) ?? []
		list.push({ id: e.id, edition_number: e.edition_number, status: e.status })
		bySeries.set(e.series_id, list)
	})

	const out: Record<string, number> = {}
	bySeries.forEach((editions, seriesId) => {
		const maxEdition = Math.max(
			0,
			...editions.filter(e => e.status === 'completed').map(e => e.edition_number)
		)
		const current = defendingPointsFor(
			editions,
			results.filter(r => r.series_id === seriesId),
			maxEdition + 1
		)
		Object.entries(current).forEach(([pid, pts]) => (out[pid] = (out[pid] ?? 0) + pts))
	})
	return out
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

	async requestPasswordReset(email: string): Promise<void> {
		if (isSupabaseConfigured && supabase) {
			// Il link di reset riporta l'utente alla SPA: detectSessionInUrl
			// gestisce il fragment e fa scattare l'evento PASSWORD_RECOVERY
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: window.location.origin,
			})
			if (error) throw new Error(error.message)
		} else {
			// Mock: nessun invio email possibile in modalità demo
			throw new Error('Il recupero password non è disponibile in modalità demo')
		}
	},

	async updatePassword(newPassword: string): Promise<void> {
		if (isSupabaseConfigured && supabase) {
			// Richiede una sessione attiva (creata dal link di recovery)
			const { error } = await supabase.auth.updateUser({ password: newPassword })
			if (error) throw new Error(error.message)
		} else {
			throw new Error('Il recupero password non è disponibile in modalità demo')
		}
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
          player2:player_2_id(*),
          creator:created_by(*)
        `
				)
				.order('created_at', { ascending: false })

			if (matchesError) throw matchesError

			const { data: setsData, error: setsError } = await supabase.from('sets').select('*')

			if (setsError) throw setsError

			// Il nome dell'evento serve al badge sulle card. Query separata e non
			// un embed, cosi' se la sezione 9 non e' applicata le partite si
			// caricano comunque.
			const eventNames = await this.eventNamesFor(matchesData as any[])

			return matchesData.map((match: any) => ({
				...match,
				event_name: match.event_id ? eventNames.get(match.event_id) : undefined,
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
					is_friendly: match.is_friendly ?? false,
					correction_requested_by: match.correction_requested_by ?? null,
					correction_sets: match.correction_sets ?? null,
					correction_status: match.correction_status ?? null,
					event_id: match.event_id ?? null,
					event_name: match.event_id
						? readMock<EventRow>(EV.events).find(e => e.id === match.event_id)?.name
						: undefined,
					player1: profiles.find(p => p.id === match.player_1_id),
					player2: profiles.find(p => p.id === match.player_2_id),
					creator: profiles.find(p => p.id === match.created_by),
				}))
				.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		}
	},

	/** Nomi delle edizioni citate dalle partite, vuoto se lo schema eventi manca. */
	async eventNamesFor(matches: { event_id?: string | null }[]): Promise<Map<string, string>> {
		const ids = [...new Set(matches.map(m => m.event_id).filter(Boolean))] as string[]
		if (ids.length === 0 || !isSupabaseConfigured || !supabase) return new Map()

		const { data, error } = await supabase.from('events').select('id, name').in('id', ids)
		if (error) {
			if (isMissingEventSchema(error)) return new Map()
			throw error
		}
		return new Map((data as any[]).map(e => [e.id, e.name]))
	},

	async createMatch(
		player1Id: string,
		player2Id: string,
		bestOf: 3 | 5,
		setScores: { set_number: number; score_p1: number; score_p2: number }[],
		isFriendly: boolean = false,
		eventMatchId?: string
	): Promise<MatchWithSets> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato per registrare un match')

		const isArbitrated = player1Id !== currentUser.id

		if (isSupabaseConfigured && supabase) {
			// Inserisce il match
			const { data: match, error: matchError } = await supabase
				.from('matches')
				.insert({
					created_by: currentUser.id,
					player_1_id: player1Id,
					player_2_id: player2Id,
					best_of: bestOf,
					status: 'pending',
					is_friendly: isFriendly,
					player_1_confirmed: !isArbitrated,
					player_2_confirmed: false,
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

			if (eventMatchId) {
				await this.linkEventMatch(eventMatchId, match.id)
				match.event_id = match.event_id ?? null
			}

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
				is_friendly: isFriendly,
				elo_change_p1: null,
				elo_change_p2: null,
				player_1_confirmed: !isArbitrated,
				player_2_confirmed: false,
				created_at: new Date().toISOString(),
				correction_requested_by: null,
				correction_sets: null,
				correction_status: null,
				event_id: null,
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

			if (eventMatchId) {
				await this.linkEventMatch(eventMatchId, newMatch.id)
				newMatch.event_id =
					readMock<EventMatchSlot>(EV.slots).find(x => x.id === eventMatchId)?.event_id ??
					null
			}

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

			if (match.is_friendly) {
				match.status = 'confirmed'
				match.elo_change_p1 = null
				match.elo_change_p2 = null
				localStorage.setItem('rp_matches', JSON.stringify(matches))
				return match
			}

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
				setsWonP2,
				profile1.player_type,
				profile2.player_type
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

	async confirmMatchAsPlayer(matchId: string): Promise<void> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('confirm_match_player', {
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

			const match = matches[idx]
			if (match.status !== 'pending') throw new Error('Il match non è in stato pending')

			if (currentUser.id === match.player_1_id) {
				matches[idx].player_1_confirmed = true
			} else if (currentUser.id === match.player_2_id) {
				matches[idx].player_2_confirmed = true
			} else {
				throw new Error('Non sei un giocatore di questo match')
			}

			if (matches[idx].player_1_confirmed && matches[idx].player_2_confirmed) {
				if (match.is_friendly) {
					matches[idx].status = 'confirmed'
					matches[idx].elo_change_p1 = null
					matches[idx].elo_change_p2 = null
				} else {
					let setsWonP1 = 0
					let setsWonP2 = 0
					match.sets.forEach(s => {
						if (s.score_p1 > s.score_p2) setsWonP1++
						else setsWonP2++
					})

					const profile1 = profiles.find(p => p.id === match.player_1_id)
					const profile2 = profiles.find(p => p.id === match.player_2_id)
					if (!profile1 || !profile2) throw new Error('Giocatori non trovati')

					const { changeA, changeB } = calculateEloTS(
						profile1.elo_rating,
						profile2.elo_rating,
						setsWonP1,
						setsWonP2,
						profile1.player_type,
						profile2.player_type
					)

					profile1.elo_rating = Math.max(0, profile1.elo_rating + changeA)
					profile2.elo_rating = Math.max(0, profile2.elo_rating + changeB)
					matches[idx].status = 'confirmed'
					matches[idx].elo_change_p1 = changeA
					matches[idx].elo_change_p2 = changeB

					localStorage.setItem('rp_profiles', JSON.stringify(profiles))
				}
			}

			localStorage.setItem('rp_matches', JSON.stringify(matches))

			// Equivalente del trigger auto_finalize_event lato Supabase.
			if (matches[idx].status === 'confirmed' && matches[idx].event_id) {
				mockFinalizeEventIfComplete(matches[idx].event_id)
			}
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

			if (m.is_friendly) {
				// Amichevole: aggiorna solo i punteggi, nessun impatto sull'Elo
				const newSets = m.correction_sets!
				newSets.forEach(ns => {
					const s = matches[idx].sets.find(s => s.set_number === ns.set_number)
					if (s) {
						s.score_p1 = ns.score_p1
						s.score_p2 = ns.score_p2
					}
				})

				matches[idx].correction_status = 'approved'
				matches[idx].correction_requested_by = null
				matches[idx].correction_sets = null

				localStorage.setItem('rp_matches', JSON.stringify(matches))
				return
			}

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
				setsP2,
				profile1.player_type,
				profile2.player_type
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
	// =====================================================================
	// EVENTI
	// =====================================================================

	async getEvents(): Promise<EventRow[]> {
		if (isSupabaseConfigured && supabase) {
			const { data: events, error } = await supabase
				.from('events')
				.select('*, series:series_id(name), creator:created_by(display_name)')
				.order('created_at', { ascending: false })
			if (error) {
				if (isMissingEventSchema(error)) return []
				throw error
			}

			const { data: parts, error: partsError } = await supabase
				.from('event_participants')
				.select('event_id, player_id, status')
			if (partsError) throw partsError

			const { data: slots, error: slotsError } = await supabase
				.from('event_matches')
				.select('event_id, match_id, match:match_id(status)')
			if (slotsError) throw slotsError

			const me = (await this.getCurrentUser())?.id

			return (events as any[]).map(ev => ({
				...ev,
				series_name: ev.series?.name,
				creator_name: ev.creator?.display_name,
				i_organize: !!me && ev.created_by === me,
				i_am_in: (parts as any[]).some(
					x => x.event_id === ev.id && x.player_id === me && x.status === 'accepted'
				),
				accepted_count: (parts as any[]).filter(
					x => x.event_id === ev.id && x.status === 'accepted'
				).length,
				matches_total: (slots as any[]).filter(x => x.event_id === ev.id).length,
				matches_played: (slots as any[]).filter(
					x => x.event_id === ev.id && x.match?.status === 'confirmed'
				).length,
			})) as EventRow[]
		} else {
			const events = readMock<EventRow>(EV.events)
			const series = readMock<EventSeries>(EV.series)
			const parts = readMock<EventParticipant>(EV.participants)
			const slots = readMock<EventMatchSlot>(EV.slots)
			const matches = readMock<MatchWithSets>('rp_matches')
			const profiles = JSON.parse(localStorage.getItem('rp_profiles') || '[]') as Profile[]

			const me = (await this.getCurrentUser())?.id

			return events
				.map(ev => ({
					...ev,
					series_name: series.find(x => x.id === ev.series_id)?.name,
					creator_name: profiles.find(x => x.id === ev.created_by)?.display_name,
					i_organize: !!me && ev.created_by === me,
					i_am_in: parts.some(
						x => x.event_id === ev.id && x.player_id === me && x.status === 'accepted'
					),
					accepted_count: parts.filter(
						x => x.event_id === ev.id && x.status === 'accepted'
					).length,
					matches_total: slots.filter(x => x.event_id === ev.id).length,
					matches_played: slots.filter(
						x =>
							x.event_id === ev.id &&
							matches.find(m => m.id === x.match_id)?.status === 'confirmed'
					).length,
				}))
				.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		}
	},

	async getEvent(eventId: string): Promise<EventDetail> {
		const profiles = await this.getProfiles()
		const eloById: Record<string, number> = {}
		profiles.forEach(p => (eloById[p.id] = p.elo_rating))
		const allMatches = await this.getMatches()

		let event: EventRow
		let participants: EventParticipant[]
		let slots: EventMatchSlot[]
		let standings: StandingRow[]
		let seriesEvents: { id: string; edition_number: number; status: string }[]
		let seriesResults: EventResult[]

		if (isSupabaseConfigured && supabase) {
			const { data: ev, error } = await supabase
				.from('events')
				.select('*, series:series_id(name)')
				.eq('id', eventId)
				.single()
			if (error) throw error
			event = { ...(ev as any), series_name: (ev as any).series?.name }

			const { data: parts, error: pErr } = await supabase
				.from('event_participants')
				.select('*')
				.eq('event_id', eventId)
			if (pErr) throw pErr
			participants = parts as EventParticipant[]

			const { data: rawSlots, error: sErr } = await supabase
				.from('event_matches')
				.select('*')
				.eq('event_id', eventId)
				.order('position', { ascending: true })
			if (sErr) throw sErr
			slots = rawSlots as EventMatchSlot[]

			const { data: rawStandings, error: stErr } = await supabase.rpc('event_standings', {
				event_id_param: eventId,
			})
			if (stErr) throw stErr
			standings = (rawStandings as any[])
				.map(r => ({
					player_id: r.player_id,
					position: r.rank_position,
					played: r.played,
					wins: r.wins,
					losses: r.losses,
					sets_won: r.sets_won,
					sets_lost: r.sets_lost,
					set_diff: r.set_diff,
					point_diff: r.point_diff,
				}))
				.sort((a, b) => a.position - b.position)

			const { data: sEvents, error: seErr } = await supabase
				.from('events')
				.select('id, edition_number, status')
				.eq('series_id', event.series_id)
			if (seErr) throw seErr
			seriesEvents = sEvents as any[]

			const { data: sResults, error: srErr } = await supabase
				.from('event_results')
				.select('*')
				.eq('series_id', event.series_id)
			if (srErr) throw srErr
			seriesResults = sResults as EventResult[]
		} else {
			const events = readMock<EventRow>(EV.events)
			const found = events.find(e => e.id === eventId)
			if (!found) throw new Error('Evento non trovato')
			const series = readMock<EventSeries>(EV.series)
			event = { ...found, series_name: series.find(x => x.id === found.series_id)?.name }

			participants = readMock<EventParticipant>(EV.participants).filter(
				x => x.event_id === eventId
			)
			slots = readMock<EventMatchSlot>(EV.slots)
				.filter(x => x.event_id === eventId)
				.sort((a, b) => a.position - b.position)

			standings = computeStandings(
				participants.filter(x => x.status === 'accepted').map(x => x.player_id),
				allMatches.filter(m => slots.some(sl => sl.match_id === m.id)),
				eloById
			)

			seriesEvents = events
				.filter(e => e.series_id === event.series_id)
				.map(e => ({ id: e.id, edition_number: e.edition_number, status: e.status }))
			seriesResults = readMock<EventResult>(EV.results).filter(
				r => r.series_id === event.series_id
			)
		}

		const defending = defendingPointsFor(seriesEvents, seriesResults, event.edition_number)
		const profileById = new Map(profiles.map(p => [p.id, p]))

		return {
			...event,
			accepted_count: participants.filter(x => x.status === 'accepted').length,
			matches_total: slots.length,
			matches_played: slots.filter(
				sl => allMatches.find(m => m.id === sl.match_id)?.status === 'confirmed'
			).length,
			participants: participants.map(x => ({ ...x, player: profileById.get(x.player_id) })),
			slots: slots.map(sl => ({
				...sl,
				player1: profileById.get(sl.player_1_id),
				player2: profileById.get(sl.player_2_id),
				match: allMatches.find(m => m.id === sl.match_id),
			})),
			standings: withProjection(
				standings.map(r => ({ ...r, player: profileById.get(r.player_id) })),
				event.ranking_points,
				defending
			),
		}
	},

	async createEvent(params: {
		seriesName: string
		eventName: string
		participantsCount: number
		bestOf: 3 | 5
		points?: Record<string, number>
		deadline?: string | null
	}): Promise<string> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		const points = params.points ?? defaultEventPoints(params.participantsCount)

		if (isSupabaseConfigured && supabase) {
			const { data, error } = await supabase.rpc('create_event', {
				series_name: params.seriesName,
				event_name: params.eventName,
				participants_count_param: params.participantsCount,
				best_of_param: params.bestOf,
				points_param: points,
				deadline_param: params.deadline ?? null,
			})
			if (error) throw error
			return data as string
		} else {
			const series = readMock<EventSeries>(EV.series)
			let seriesRow = series.find(x => x.name === params.seriesName)
			if (!seriesRow) {
				seriesRow = {
					id: mockId('series'),
					name: params.seriesName,
					format: 'round_robin',
					default_points: points,
					created_by: currentUser.id,
					created_at: new Date().toISOString(),
				}
				series.push(seriesRow)
				writeMock(EV.series, series)
			}

			const events = readMock<EventRow>(EV.events)
			const nextEdition =
				Math.max(
					0,
					...events.filter(e => e.series_id === seriesRow.id).map(e => e.edition_number)
				) + 1

			const newEvent: EventRow = {
				id: mockId('event'),
				series_id: seriesRow.id,
				edition_number: nextEdition,
				name: params.eventName,
				status: 'open',
				participants_count: params.participantsCount,
				best_of: params.bestOf,
				ranking_points: points,
				registration_deadline: params.deadline ?? null,
				started_at: null,
				completed_at: null,
				created_by: currentUser.id,
				created_at: new Date().toISOString(),
			}
			events.push(newEvent)
			writeMock(EV.events, events)

			const parts = readMock<EventParticipant>(EV.participants)
			parts.push({
				id: mockId('part'),
				event_id: newEvent.id,
				player_id: currentUser.id,
				status: 'accepted',
				joined_at: new Date().toISOString(),
			})
			writeMock(EV.participants, parts)

			return newEvent.id
		}
	},

	/** Iscrizione diretta: nessuna approvazione, si entra subito. */
	async applyToEvent(eventId: string): Promise<void> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('apply_to_event', { event_id_param: eventId })
			if (error) throw error
		} else {
			const events = readMock<EventRow>(EV.events)
			const ev = events.find(e => e.id === eventId)
			if (!ev) throw new Error('Evento non trovato')
			if (ev.status !== 'open') throw new Error('Le iscrizioni sono chiuse')

			const parts = readMock<EventParticipant>(EV.participants)
			const accepted = parts.filter(
				x => x.event_id === eventId && x.status === 'accepted'
			).length
			if (accepted >= ev.participants_count) {
				throw new Error('Non ci sono più posti disponibili')
			}

			const existing = parts.find(
				x => x.event_id === eventId && x.player_id === currentUser.id
			)
			if (existing) {
				existing.status = 'accepted'
			} else {
				parts.push({
					id: mockId('part'),
					event_id: eventId,
					player_id: currentUser.id,
					status: 'accepted',
					joined_at: new Date().toISOString(),
				})
			}
			writeMock(EV.participants, parts)
		}
	},

	/** Disiscrizione, possibile solo finche' le iscrizioni sono aperte. */
	async leaveEvent(eventId: string): Promise<void> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('leave_event', { event_id_param: eventId })
			if (error) throw error
		} else {
			const events = readMock<EventRow>(EV.events)
			const ev = events.find(e => e.id === eventId)
			if (!ev) throw new Error('Evento non trovato')
			if (ev.status !== 'open') {
				throw new Error("L'evento è già partito: non puoi più uscire")
			}

			const parts = readMock<EventParticipant>(EV.participants)
			const mine = parts.find(
				x =>
					x.event_id === eventId &&
					x.player_id === currentUser.id &&
					x.status === 'accepted'
			)
			if (!mine) throw new Error('Non sei iscritto a questo evento')

			mine.status = 'withdrawn'
			writeMock(EV.participants, parts)
		}
	},

	async cancelEvent(eventId: string): Promise<void> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('cancel_event', { event_id_param: eventId })
			if (error) throw error
		} else {
			const events = readMock<EventRow>(EV.events)
			const ev = events.find(e => e.id === eventId)
			if (!ev) throw new Error('Evento non trovato')
			if (ev.created_by !== currentUser.id) {
				throw new Error("Solo l'organizzatore può annullare l'evento")
			}
			if (ev.status === 'cancelled') return
			if (ev.status === 'completed') {
				throw new Error(
					"Un'edizione conclusa non si può annullare: i punti sono già assegnati"
				)
			}

			ev.status = 'cancelled'
			writeMock(EV.events, events)
		}
	},

	async startEvent(eventId: string): Promise<void> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('start_event', { event_id_param: eventId })
			if (error) throw error
		} else {
			const events = readMock<EventRow>(EV.events)
			const ev = events.find(e => e.id === eventId)
			if (!ev) throw new Error('Evento non trovato')
			if (ev.created_by !== currentUser.id) {
				throw new Error("Solo l'organizzatore può avviare l'evento")
			}
			if (ev.status !== 'open') throw new Error("L'evento è già stato avviato")

			const accepted = readMock<EventParticipant>(EV.participants).filter(
				x => x.event_id === eventId && x.status === 'accepted'
			).length
			if (accepted < 4) {
				throw new Error("Servono almeno 4 giocatori per avviare l'evento")
			}

			mockBeginEvent(eventId)
		}
	},

	async linkEventMatch(eventMatchId: string, matchId: string): Promise<void> {
		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('link_event_match', {
				event_match_id_param: eventMatchId,
				match_id_param: matchId,
			})
			if (error) throw error
		} else {
			const slots = readMock<EventMatchSlot>(EV.slots)
			const slot = slots.find(x => x.id === eventMatchId)
			if (!slot) throw new Error('Slot non trovato')
			if (slot.match_id) throw new Error('Questa partita è già stata registrata')

			const ev = readMock<EventRow>(EV.events).find(x => x.id === slot.event_id)
			if (!ev) throw new Error('Evento non trovato')
			if (ev.status !== 'in_progress') {
				throw new Error('Questa edizione non accetta risultati')
			}

			const matches = readMock<MatchWithSets>('rp_matches')
			const m = matches.find(x => x.id === matchId)
			if (!m) throw new Error('Match non trovato')

			const ok =
				(m.player_1_id === slot.player_1_id && m.player_2_id === slot.player_2_id) ||
				(m.player_1_id === slot.player_2_id && m.player_2_id === slot.player_1_id)
			if (!ok) throw new Error('I giocatori non corrispondono allo slot')

			slot.match_id = matchId
			writeMock(EV.slots, slots)

			m.event_id = slot.event_id
			writeMock('rp_matches', matches)
		}
	},

	/**
	 * Rifiuta una registrazione dentro un evento: annulla la partita e libera
	 * lo slot. Dentro un girone "contestato" bloccherebbe la chiusura.
	 */
	async rejectEventMatch(eventMatchId: string): Promise<void> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) throw new Error('Devi essere autenticato')

		if (isSupabaseConfigured && supabase) {
			const { error } = await supabase.rpc('reject_event_match', {
				event_match_id_param: eventMatchId,
			})
			if (error) throw error
		} else {
			const slots = readMock<EventMatchSlot>(EV.slots)
			const slot = slots.find(x => x.id === eventMatchId)
			if (!slot) throw new Error('Slot non trovato')
			if (!slot.match_id) throw new Error("Non c'è nessun risultato da rifiutare")

			const matches = readMock<MatchWithSets>('rp_matches')
			const m = matches.find(x => x.id === slot.match_id)
			if (!m) throw new Error('Match non trovato')
			if (m.status !== 'pending') throw new Error('Il risultato è già stato confermato')
			if (currentUser.id !== m.player_1_id && currentUser.id !== m.player_2_id) {
				throw new Error('Non sei un giocatore di questa partita')
			}

			slot.match_id = null
			writeMock(EV.slots, slots)
			writeMock(
				'rp_matches',
				matches.filter(x => x.id !== m.id)
			)
		}
	},

	/** Il ranking unico: ELO delle partite + punti evento correnti. */
	async getRanking(): Promise<RankingRow[]> {
		if (isSupabaseConfigured && supabase) {
			const { data, error } = await supabase
				.from('ranking')
				.select('*')
				.order('total_points', { ascending: false })

			if (error) {
				if (!isMissingEventSchema(error)) throw error
				// Sezione 9 non ancora applicata: il ranking e' il solo ELO.
				const profiles = await this.getProfiles()
				return profiles.map(p => ({
					...p,
					event_points: 0,
					total_points: p.elo_rating,
				}))
			}

			return data as RankingRow[]
		} else {
			const profiles = await this.getProfiles()
			const eventPoints = mockCurrentSeriesPoints()
			return profiles
				.map(p => ({
					...p,
					event_points: eventPoints[p.id] ?? 0,
					total_points: p.elo_rating + (eventPoints[p.id] ?? 0),
				}))
				.sort((a, b) => b.total_points - a.total_points)
		}
	},

	async getPalmares(playerId: string): Promise<Palmares> {
		if (isSupabaseConfigured && supabase) {
			const { data: results, error } = await supabase
				.from('event_results')
				.select('*')
				.eq('player_id', playerId)
			if (error) {
				if (isMissingEventSchema(error)) {
					return {
						titles: 0,
						seconds: 0,
						thirds: 0,
						editions_played: 0,
						results: [],
						reigning: [],
					}
				}
				throw error
			}

			const { data: events, error: evError } = await supabase
				.from('events')
				.select('id, name, edition_number, status, series_id')
			if (evError) throw evError

			return buildPalmares(playerId, results as EventResult[], events as any[])
		} else {
			const results = readMock<EventResult>(EV.results)
			const events = readMock<EventRow>(EV.events).map(e => ({
				id: e.id,
				name: e.name,
				edition_number: e.edition_number,
				status: e.status,
				series_id: e.series_id,
			}))
			return buildPalmares(playerId, results, events)
		}
	},

	/** Tutti i risultati d'evento con il nome del giocatore, per le card della lista. */
	async getEventResultsSummary(): Promise<EventResult[]> {
		const profiles = await this.getProfiles()
		const nameById = new Map(profiles.map(p => [p.id, p.display_name]))

		let results: EventResult[]
		if (isSupabaseConfigured && supabase) {
			const { data, error } = await supabase.from('event_results').select('*')
			if (error) {
				if (isMissingEventSchema(error)) return []
				throw error
			}
			results = data as EventResult[]
		} else {
			results = readMock<EventResult>(EV.results)
		}

		return results.map(r => ({ ...r, player_name: nameById.get(r.player_id) }))
	},

	/**
	 * Proiezione della difesa per l'utente corrente sulle edizioni in corso:
	 * serve alla striscia in fondo alle card della lista.
	 */
	async getMyProjections(): Promise<
		Record<string, { position: number; defending: number; projected: number }>
	> {
		const currentUser = await this.getCurrentUser()
		if (!currentUser) return {}

		const events = await this.getEvents()
		const inProgress = events.filter(e => e.status === 'in_progress')
		const out: Record<string, { position: number; defending: number; projected: number }> = {}

		for (const ev of inProgress) {
			// A zero partite giocate la classifica e' solo spareggio ELO:
			// una proiezione su quell'ordine sarebbe inventata.
			if ((ev.matches_played ?? 0) === 0) continue

			const detail = await this.getEvent(ev.id)
			const mine = detail.standings.find(r => r.player_id === currentUser.id)
			if (!mine) continue
			out[ev.id] = {
				position: mine.position,
				defending: mine.defending_points ?? 0,
				projected: mine.projected_points ?? 0,
			}
		}

		return out
	},
}
