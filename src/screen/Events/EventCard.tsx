import React from 'react'
import { useTranslation } from 'react-i18next'
import { Swords, Clock, Calendar, Trophy, UserRound, Zap } from 'lucide-react'
import type { EventRow } from '../../services/db'
import { PointsPills } from './PointsPills'
import { deltaColor, formatDelta } from './eventHelpers'

interface Props {
	event: EventRow
	/** Proiezione sul ranking per l'utente corrente, se in gara */
	projection?: { position: number; defending: number; projected: number } | null
	/** Vincitore, per le edizioni concluse */
	winnerName?: string
	/** Punti presi dall'utente corrente in questa edizione conclusa */
	myPoints?: number | null
	myFinalRank?: number | null
	onOpen: () => void
}

export const EventCard: React.FC<Props> = ({
	event,
	projection,
	winnerName,
	myPoints,
	myFinalRank,
	onOpen,
}) => {
	const { t } = useTranslation()

	const borderClass =
		event.status === 'in_progress'
			? 'border-indigo-500/60 shadow-lg shadow-indigo-500/20'
			: event.status === 'open'
				? 'border-dashed border-warning/45'
				: 'border-slate-800/90'

	const statusBadge = {
		open: 'bg-warning/20 text-warning',
		in_progress: 'bg-success/15 text-success',
		completed: 'bg-slate-500/20 text-slate-400',
		cancelled: 'bg-error/15 text-error',
	}[event.status]

	const statusLabel = {
		open: t('events.badgeOpen'),
		in_progress: t('events.badgeInProgress'),
		completed: t('events.badgeCompleted'),
		cancelled: t('events.badgeCancelled'),
	}[event.status]

	const total = event.matches_total ?? 0
	const played = event.matches_played ?? 0
	const progress = total > 0 ? Math.round((played / total) * 100) : 0

	return (
		<div
			onClick={onOpen}
			className={`rounded-2xl bg-neutral/85 overflow-hidden border-2 cursor-pointer ${borderClass}`}
		>
			<div className="px-4 pt-3.5 pb-3">
				<div className="flex justify-between items-center gap-2 pb-2 mb-2.5 border-b border-slate-800">
					<span className="flex items-center gap-1.5 flex-wrap">
						<span
							className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
								event.status === 'in_progress'
									? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
									: 'bg-indigo-500/15 text-indigo-400'
							}`}
						>
							<Swords className="w-2.5 h-2.5" />
							{event.series_name}
						</span>
						<span
							className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusBadge}`}
						>
							{statusLabel}
						</span>
					</span>

					<span className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
						{event.status === 'in_progress' ? (
							<>
								{played} / {total}
							</>
						) : event.status === 'open' ? (
							<>
								<Clock className="w-3 h-3" />
								{event.registration_deadline
									? new Date(event.registration_deadline).toLocaleDateString()
									: '—'}
							</>
						) : (
							<>
								<Calendar className="w-3 h-3" />
								{new Date(
									event.completed_at ?? event.created_at
								).toLocaleDateString()}
							</>
						)}
					</span>
				</div>

				<div className="text-base font-bold text-white mb-0.5">{event.name}</div>
				<div className="text-xs text-slate-400">
					{t('events.playersLine', {
						count: event.participants_count,
						bestOf: event.best_of,
					})}
				</div>
				<div className="flex items-center gap-1 mt-1 mb-3">
					<UserRound className="w-3 h-3 text-slate-600 shrink-0" />
					<span
						className={`text-[11px] truncate ${
							event.i_organize ? 'text-indigo-400 font-bold' : 'text-slate-500'
						}`}
					>
						{event.i_organize
							? t('events.createdByYou')
							: t('events.createdBy', { name: event.creator_name ?? '—' })}
					</span>
				</div>

				{event.status === 'open' && (
					<>
						<div className="flex justify-between items-baseline mb-1">
							<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
								{t('events.seats')}
							</span>
							<span className="text-xs font-extrabold text-slate-300">
								{event.accepted_count} / {event.participants_count}
							</span>
						</div>
						<div className="h-1.5 rounded-full bg-slate-950 overflow-hidden mb-3">
							<div
								className="h-full rounded-full bg-indigo-500"
								style={{
									width: `${Math.round(
										((event.accepted_count ?? 0) / event.participants_count) *
											100
									)}%`,
								}}
							/>
						</div>
						<div className="p-2.5 rounded-xl bg-slate-950/60">
							<div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
								{t('events.pointsAtStake')}
							</div>
							<PointsPills points={event.ranking_points} />
						</div>
					</>
				)}

				{event.status === 'in_progress' && (
					<>
						<div className="flex justify-between items-baseline mb-1">
							<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
								{t('events.matchesPlayed')}
							</span>
							<span className="text-xs font-extrabold text-slate-300">
								{played} / {total}
							</span>
						</div>
						<div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
							<div
								className="h-full rounded-full bg-success"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</>
				)}

				{event.status === 'completed' && winnerName && (
					<div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-950/60">
						<Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400/20 shrink-0" />
						<span className="flex-1 text-[13px] font-bold text-yellow-400 truncate">
							{winnerName}
						</span>
						{myFinalRank != null && (
							<span className="text-xs text-slate-500 shrink-0">
								{t('common.you').toLowerCase()} {myFinalRank}°
							</span>
						)}
						{myPoints != null && (
							<span className="text-[13px] font-extrabold text-slate-300 shrink-0">
								+{myPoints}
							</span>
						)}
					</div>
				)}
			</div>

			{projection && (
				<div className="flex items-center gap-2.5 px-4 py-2.5 bg-success/10 border-t border-slate-800/60">
					<Zap className="w-4 h-4 text-indigo-400 shrink-0" />
					<div className="flex-1 min-w-0">
						<div className="text-xs font-bold text-white">
							{projection.position === 1
								? t('events.projectionFirst')
								: t('events.projectionOther', { position: projection.position })}
						</div>
						<div className="text-[11px] text-slate-400">
							{t('events.projectionDetail', {
								defending: projection.defending,
								projected: projection.projected,
							})}
						</div>
					</div>
					<span
						className={`text-base font-black shrink-0 ${deltaColor(
							projection.projected - projection.defending
						)}`}
					>
						{formatDelta(projection.projected - projection.defending)}
					</span>
				</div>
			)}
		</div>
	)
}
