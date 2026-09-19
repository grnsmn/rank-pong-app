import React from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import type { StandingRow } from '../../services/db'
import { deltaColor, formatDelta, rankColor } from './eventHelpers'

interface Props {
	standings: StandingRow[]
	currentUserId?: string
	/** Nelle edizioni concluse la colonna Rank mostra il delta reale, non una proiezione */
	showProjection?: boolean
	/**
	 * Con zero partite giocate l'ordine lo decide solo l'ultimo spareggio (l'ELO):
	 * mostrare posizioni e proiezioni darebbe un'informazione inventata.
	 */
	hasResults?: boolean
	onPlayerSelect?: (playerId: string) => void
}

const GRID = 'grid grid-cols-[22px_1fr_38px_40px_52px] gap-1.5 items-center'

export const StandingsTable: React.FC<Props> = ({
	standings,
	currentUserId,
	showProjection = true,
	hasResults = true,
	onPlayerSelect,
}) => {
	const { t } = useTranslation()

	return (
		<div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
			<div className={`${GRID} px-3 py-2 bg-slate-950/60`}>
				<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
					#
				</span>
				<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
					{t('events.colPlayer')}
				</span>
				<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 text-center">
					{t('events.colRecord')}
				</span>
				<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 text-right">
					{t('events.colSetDiff')}
				</span>
				<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 text-right">
					{t('events.colRank')}
				</span>
			</div>

			{standings.map(row => {
				const isMe = row.player_id === currentUserId
				const delta = row.projected_delta ?? 0
				return (
					<div
						key={row.player_id}
						onClick={() => onPlayerSelect?.(row.player_id)}
						className={`${GRID} px-3 py-2.5 border-t border-slate-800/80 cursor-pointer ${
							isMe ? 'bg-indigo-500/[0.07]' : ''
						}`}
					>
						{hasResults ? (
							<span className={`text-sm font-black ${rankColor(row.position)}`}>
								{row.position}
							</span>
						) : (
							<span className="text-sm font-black text-slate-700">–</span>
						)}
						<span
							className={`text-[13px] truncate ${
								isMe ? 'font-bold text-indigo-400' : 'font-semibold text-slate-200'
							}`}
						>
							{isMe ? t('common.you') : (row.player?.display_name ?? '—')}
						</span>
						<span className="text-xs font-extrabold text-slate-300 text-center">
							{row.wins}-{row.losses}
						</span>
						<span
							className={`text-xs font-extrabold text-right ${deltaColor(
								row.set_diff
							)}`}
						>
							{formatDelta(row.set_diff)}
						</span>
						{hasResults ? (
							<span
								className={`text-[13px] font-black text-right ${deltaColor(delta)}`}
								title={`${row.defending_points ?? 0} → ${row.projected_points ?? 0}`}
							>
								{formatDelta(delta)}
							</span>
						) : (
							<span className="text-[13px] font-black text-right text-slate-700">
								–
							</span>
						)}
					</div>
				)
			})}

			{showProjection && (
				<div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-950/60 border-t border-slate-800/80">
					<Info className="w-3 h-3 text-slate-600 shrink-0" />
					<span className="text-[11px] text-slate-500 leading-snug">
						{hasResults ? t('events.standingsInfo') : t('events.standingsBeforeStart')}
					</span>
				</div>
			)}
		</div>
	)
}
