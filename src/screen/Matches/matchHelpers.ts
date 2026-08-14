import type { MatchWithSets } from '../../services/db'

export const getSetsScore = (sets: { score_p1: number; score_p2: number }[]) => {
	let p1 = 0,
		p2 = 0
	sets.forEach(s => {
		if (s.score_p1 > s.score_p2) p1++
		else p2++
	})
	return { p1, p2 }
}

export const isMyMatch = (match: MatchWithSets, currentUserId: string | undefined) =>
	currentUserId === match.player_1_id || currentUserId === match.player_2_id

export const canRequestCorrection = (match: MatchWithSets, currentUserId: string | undefined) =>
	isMyMatch(match, currentUserId) && match.correction_status !== 'pending'
