import type { EventDetail, EventRow, StandingRow } from '../../services/db'

/** Colore del numero di piazzamento: oro / argento / bronzo / neutro. */
export function rankColor(position: number): string {
	if (position === 1) return 'text-yellow-400'
	if (position === 2) return 'text-slate-300'
	if (position === 3) return 'text-amber-600'
	return 'text-slate-500'
}

/** Classe per un delta di punti: verde se guadagni, rosso se perdi. */
export function deltaColor(delta: number): string {
	if (delta > 0) return 'text-success'
	if (delta < 0) return 'text-error'
	return 'text-slate-600'
}

/** Formatta un delta con il segno esplicito. */
export function formatDelta(delta: number): string {
	if (delta > 0) return `+${delta}`
	if (delta < 0) return `−${Math.abs(delta)}`
	return '0'
}

/** Numero di partite di un girone all'italiana con n giocatori. */
export function roundRobinMatches(n: number): number {
	return (n * (n - 1)) / 2
}

/** Somma dei punti in palio di una tabella punti. */
export function totalPointsAtStake(points: Record<string, number>): number {
	return Object.values(points).reduce((sum, v) => sum + v, 0)
}

/** La riga di classifica del giocatore indicato, se presente. */
export function myStanding(
	standings: StandingRow[],
	playerId: string | undefined
): StandingRow | undefined {
	if (!playerId) return undefined
	return standings.find(row => row.player_id === playerId)
}

export function isOrganizer(event: EventRow, userId: string | undefined): boolean {
	return !!userId && event.created_by === userId
}

export function participantStatus(
	event: EventDetail,
	userId: string | undefined
): 'none' | 'pending' | 'accepted' | 'rejected' | 'withdrawn' {
	if (!userId) return 'none'
	const found = event.participants.find(p => p.player_id === userId)
	return found ? found.status : 'none'
}

/**
 * Valida il punteggio di un set con le stesse regole di NewMatchScreen:
 * niente pareggi, vincitore ad almeno 11, scarto di almeno 2.
 */
export function validateSet(
	score1: string,
	score2: string
): { isValid: boolean; winner: 1 | 2 | null } {
	const s1 = parseInt(score1, 10)
	const s2 = parseInt(score2, 10)
	if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return { isValid: false, winner: null }
	if (s1 === s2) return { isValid: false, winner: null }

	const winner = s1 > s2 ? 1 : 2
	const high = Math.max(s1, s2)
	const diff = Math.abs(s1 - s2)
	if (high < 11) return { isValid: false, winner: null }
	if (diff < 2) return { isValid: false, winner: null }

	return { isValid: true, winner }
}

/** Quanti set servono per vincere un best-of. */
export function setsToWin(bestOf: 3 | 5): number {
	return bestOf === 3 ? 2 : 3
}
