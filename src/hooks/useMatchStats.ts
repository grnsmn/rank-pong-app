import { useMemo } from 'react'
import type { MatchWithSets } from '../services/db'

interface MatchStats {
	totalMatches: number
	wins: number
	losses: number
	winRate: number
	totalSetsWon: number
	totalSetsLost: number
	setRatio: number
	streak: number
}

export function useMatchStats(
	matches: MatchWithSets[],
	playerId: string | undefined
): MatchStats | null {
	return useMemo(() => {
		if (!playerId) return null

		const confirmed = matches.filter(
			m =>
				m.status === 'confirmed' &&
				(m.player_1_id === playerId || m.player_2_id === playerId)
		)

		const sorted = [...confirmed].sort(
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)

		let wins = 0
		let losses = 0
		let totalSetsWon = 0
		let totalSetsLost = 0
		let streak = 0
		let streakBroken = false

		sorted.forEach(match => {
			const isPlayer1 = match.player_1_id === playerId
			let setsWonP1 = 0
			let setsWonP2 = 0
			match.sets.forEach(set => {
				if (set.score_p1 > set.score_p2) setsWonP1++
				else setsWonP2++
			})

			const won = isPlayer1 ? setsWonP1 > setsWonP2 : setsWonP2 > setsWonP1
			if (won) {
				wins++
				if (!streakBroken) streak++
			} else {
				losses++
				streakBroken = true
			}

			totalSetsWon += isPlayer1 ? setsWonP1 : setsWonP2
			totalSetsLost += isPlayer1 ? setsWonP2 : setsWonP1
		})

		const totalMatches = confirmed.length
		const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
		const setRatio =
			totalSetsWon + totalSetsLost > 0
				? Math.round((totalSetsWon / (totalSetsWon + totalSetsLost)) * 100)
				: 0

		return {
			totalMatches,
			wins,
			losses,
			winRate,
			totalSetsWon,
			totalSetsLost,
			setRatio,
			streak,
		}
	}, [matches, playerId])
}
