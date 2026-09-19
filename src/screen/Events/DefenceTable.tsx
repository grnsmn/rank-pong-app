import React from 'react'
import { useTranslation } from 'react-i18next'
import { Shield } from 'lucide-react'
import type { StandingRow } from '../../services/db'
import { deltaColor, formatDelta, rankColor } from './eventHelpers'

interface Props {
	standings: StandingRow[]
	currentUserId?: string
	/** Nessuno difendeva nulla: i punti di questa edizione entrano nuovi */
	isFirstEdition?: boolean
}

const GRID = 'grid grid-cols-[1fr_56px_56px_54px] gap-1.5 items-center'

/**
 * Cosa ha fatto la difesa a fine edizione: aveva → ora → Δ.
 * Con rosa invariata la somma dei delta è zero: i punti si ridistribuiscono.
 */
export const DefenceTable: React.FC<Props> = ({ standings, currentUserId, isFirstEdition }) => {
	const { t } = useTranslation()
	const sum = standings.reduce((acc, row) => acc + (row.projected_delta ?? 0), 0)

	// La somma zero vale solo a rosa invariata: sulla prima edizione i punti
	// entrano nuovi, e se la rosa cambia il bilancio non torna.
	const footnote = isFirstEdition
		? t('events.defenceFirstEdition')
		: sum === 0
			? t('events.defenceZeroSum')
			: t('events.defenceRosterChanged')

	return (
		<div>
			<div className="flex items-center gap-1.5 mb-2">
				<Shield className="w-3 h-3 text-indigo-400" />
				<span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
					{t('events.defenceTitle')}
				</span>
			</div>

			<div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
				<div className={`${GRID} px-3 py-2 bg-slate-950/60`}>
					<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
						{t('events.colPlayer')}
					</span>
					<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 text-right">
						{t('events.colHad')}
					</span>
					<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 text-right">
						{t('events.colNow')}
					</span>
					<span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 text-right">
						Δ
					</span>
				</div>

				{standings.map(row => {
					const isMe = row.player_id === currentUserId
					return (
						<div
							key={row.player_id}
							className={`${GRID} px-3 py-2.5 border-t border-slate-800/80 ${
								isMe ? 'bg-indigo-500/[0.07]' : ''
							}`}
						>
							<span
								className={`text-[13px] truncate ${
									isMe
										? 'font-bold text-indigo-400'
										: 'font-semibold text-slate-200'
								}`}
							>
								<span className={`mr-1.5 font-black ${rankColor(row.position)}`}>
									{row.position}°
								</span>
								{isMe ? t('common.you') : (row.player?.display_name ?? '—')}
							</span>
							<span className="text-[13px] font-bold text-slate-500 text-right">
								{row.defending_points ?? 0}
							</span>
							<span className="text-[13px] font-extrabold text-slate-200 text-right">
								{row.projected_points ?? 0}
							</span>
							<span
								className={`text-sm font-black text-right ${deltaColor(
									row.projected_delta ?? 0
								)}`}
							>
								{formatDelta(row.projected_delta ?? 0)}
							</span>
						</div>
					)
				})}

				<div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-950/60 border-t border-slate-800/80">
					<span className="text-[11px] text-slate-500 leading-snug">{footnote}</span>
					<span className="text-xs font-extrabold text-slate-400 shrink-0">
						Σ {formatDelta(sum)}
					</span>
				</div>
			</div>
		</div>
	)
}
