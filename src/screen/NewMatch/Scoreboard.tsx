import React from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import type { Profile } from '../../services/db'
import { PLAYER_COLORS } from './playerColors'

interface ScoreboardProps {
	player1: Profile | undefined
	player2: Profile | undefined
	setsWonP1: number
	setsWonP2: number
	targetWins: number
	matchFinished: boolean
	excessSets: boolean
}

const firstName = (p: Profile | undefined, fallback: string) =>
	p?.display_name.split(' ')[0] ?? fallback

const PlayerSide: React.FC<{
	player: Profile | undefined
	side: 1 | 2
	setsWon: number
	targetWins: number
}> = ({ player, side, setsWon, targetWins }) => {
	const colors = PLAYER_COLORS[side]
	return (
		<div className="flex flex-col items-center text-center min-w-0">
			<div
				className={`w-11 h-11 rounded-full overflow-hidden mb-1.5 flex items-center justify-center shrink-0 ${colors.avatar}`}
			>
				{player?.avatar_url ? (
					<img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
				) : (
					<span className="text-sm font-extrabold">
						{player?.display_name.substring(0, 2)}
					</span>
				)}
			</div>
			<span className={`text-xs font-bold truncate max-w-full ${colors.text}`}>
				{firstName(player, `P${side}`)}
			</span>
			<div className="flex gap-1 mt-1.5">
				{Array.from({ length: targetWins }, (_, i) => (
					<span
						key={i}
						className={`w-2 h-2 rounded-full ${i < setsWon ? colors.dot : 'bg-slate-700'}`}
					/>
				))}
			</div>
		</div>
	)
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
	player1,
	player2,
	setsWonP1,
	setsWonP2,
	targetWins,
	matchFinished,
	excessSets,
}) => {
	const { t } = useTranslation()

	const leaderSide: 1 | 2 | null = setsWonP1 > setsWonP2 ? 1 : setsWonP2 > setsWonP1 ? 2 : null
	const leader = leaderSide === 1 ? player1 : player2
	const leaderName = leaderSide ? firstName(leader, `P${leaderSide}`) : ''
	const leaderWins = Math.max(setsWonP1, setsWonP2)
	const trailerWins = Math.min(setsWonP1, setsWonP2)

	const renderStatus = () => {
		if (excessSets) {
			return <span className="text-error font-extrabold">{t('newMatch.statusExcess')}</span>
		}
		if (matchFinished && leaderSide) {
			return (
				<span
					className={`font-black flex items-center justify-center gap-1 ${PLAYER_COLORS[leaderSide].text}`}
				>
					<CheckCircle2 className="w-4 h-4" />
					{t('newMatch.arbiterWinner', {
						name: leaderName,
						score: `${leaderWins}–${trailerWins}`,
					})}
				</span>
			)
		}
		if (leaderSide) {
			const key =
				leaderWins === targetWins - 1
					? 'newMatch.arbiterMatchPoint'
					: 'newMatch.arbiterLeading'
			return (
				<span className={`font-bold ${PLAYER_COLORS[leaderSide].text}`}>
					{t(key, { name: leaderName })}
				</span>
			)
		}
		if (setsWonP1 === 0) {
			return (
				<span className="text-slate-400">
					{t('newMatch.arbiterFirstTo', { count: targetWins })}
				</span>
			)
		}
		return (
			<span className="text-slate-300 font-bold">
				{setsWonP1 === targetWins - 1
					? t('newMatch.arbiterDecider')
					: t('newMatch.arbiterTied')}
			</span>
		)
	}

	return (
		<div className="pb-3 border-b border-white/5">
			<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
				<PlayerSide player={player1} side={1} setsWon={setsWonP1} targetWins={targetWins} />
				<div className="text-3xl font-black tabular-nums text-white px-2">
					{setsWonP1}
					<span className="text-slate-600 mx-1.5">:</span>
					{setsWonP2}
				</div>
				<PlayerSide player={player2} side={2} setsWon={setsWonP2} targetWins={targetWins} />
			</div>
			<div className="mt-3 text-xs text-center">{renderStatus()}</div>
		</div>
	)
}
