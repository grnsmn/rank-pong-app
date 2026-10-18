import React from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy, Medal, User } from 'lucide-react'
import type { PublicRankingRow } from '../../services/db'
import { TruncatedName } from './TruncatedName'

interface Props {
	/** Senza display_name (classifica pubblica) mostra solo lo username */
	player: PublicRankingRow & { display_name?: string }
	/** Posizione 1-based mostrata a sinistra */
	position: number
	/** Assente nella classifica pubblica: la riga non e' cliccabile */
	onSelect?: (playerId: string) => void
}

const PLAYER_TYPE_STYLE: Record<PublicRankingRow['player_type'], string> = {
	competitive: 'text-violet-400',
	student: 'text-info',
	amateur: 'text-sky-400',
}

const PositionIcon: React.FC<{ position: number }> = ({ position }) => {
	switch (position) {
		case 1:
			return <Trophy className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
		case 2:
			return <Medal className="w-5 h-5 text-slate-300 fill-slate-300/20" />
		case 3:
			return <Medal className="w-5 h-5 text-amber-600 fill-amber-600/20" />
		default:
			return (
				<span className="text-slate-400 text-xs font-semibold w-5 text-center">
					{position}
				</span>
			)
	}
}

export const RankingListItem: React.FC<Props> = ({ player, position, onSelect }) => {
	const { t } = useTranslation()
	const type = PLAYER_TYPE_STYLE[player.player_type] ? player.player_type : 'amateur'

	return (
		<div
			className={`flex items-center justify-between p-3.5 transition-colors ${
				onSelect ? 'hover:bg-slate-800/30 cursor-pointer' : ''
			}`}
			onClick={onSelect ? () => onSelect(player.id) : undefined}
		>
			<div className="flex items-center gap-3 min-w-0">
				<div className="flex items-center justify-center w-6">
					<PositionIcon position={position} />
				</div>
				<div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
					{player.avatar_url ? (
						<img
							src={player.avatar_url}
							alt=""
							className="w-full h-full object-cover"
						/>
					) : (
						<User className="w-5 h-5 text-slate-400" />
					)}
				</div>
				<div className="min-w-0">
					<TruncatedName
						text={player.display_name ?? `@${player.username}`}
						className="text-sm font-bold text-slate-200"
						block
					/>
					{player.display_name && (
						<TruncatedName
							text={`@${player.username}`}
							className="text-[10px] text-slate-400"
							block
						/>
					)}
				</div>
			</div>
			<div className="flex flex-col items-end shrink-0">
				<span
					className={`text-[9px] uppercase font-bold tracking-wide ${PLAYER_TYPE_STYLE[type]}`}
				>
					{t(`playerType.${type}`)}
				</span>
				<span className="text-sm font-extrabold text-slate-100">{player.total_points}</span>
				<span className="text-[9px] text-slate-500">
					{player.elo_rating}
					{' + '}
					<span
						className={player.event_points > 0 ? 'text-indigo-400' : 'text-slate-600'}
					>
						{player.event_points}
					</span>
				</span>
			</div>
		</div>
	)
}
