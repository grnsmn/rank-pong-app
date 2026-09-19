import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Crown, LogOut, Trophy, Zap } from 'lucide-react'
import { dbService, type EventMatchSlot } from '../../services/db'
import { useAppStore } from '../../store/useAppStore'
import { useDataFetch } from '../../hooks/useDataFetch'
import { useModalState } from '../../hooks/useModalState'
import { PodiumSection } from '../Leaderboard/PodiumSection'
import { StandingsTable } from './StandingsTable'
import { DefenceTable } from './DefenceTable'
import { MatchGrid } from './MatchGrid'
import { RecordResultModal } from './RecordResultModal'
import { PointsPills } from './PointsPills'
import { deltaColor, formatDelta, isOrganizer, myStanding, participantStatus } from './eventHelpers'

interface Props {
	eventId: string
	onBack: () => void
	onPlayerSelect?: (playerId: string) => void
}

export const EventDetailScreen: React.FC<Props> = ({ eventId, onBack, onPlayerSelect }) => {
	const { t } = useTranslation()
	const { currentUser, refreshProfile } = useAppStore()

	const {
		data: event,
		isLoading,
		refetch,
	} = useDataFetch(() => dbService.getEvent(eventId), {
		refetchOnFocus: true,
	})

	const {
		modalData: recordSlot,
		modalError,
		isSubmitting,
		open: openRecord,
		close: closeRecord,
		setModalError,
		setIsSubmitting,
	} = useModalState<EventMatchSlot>()

	const [actionError, setActionError] = useState<string | null>(null)
	const [isActing, setIsActing] = useState(false)

	// Iscrizioni e risultati arrivano dagli altri giocatori: senza un
	// aggiornamento periodico la schermata resta ferma a quando l'hai aperta.
	useEffect(() => {
		const interval = setInterval(refetch, 15000)
		return () => clearInterval(interval)
	}, [refetch])

	if (!event) {
		if (!isLoading) return null
		return (
			<div className="flex flex-col h-full bg-base-100 text-white">
				<div className="flex-1 flex items-center justify-center">
					<span className="loading loading-spinner loading-md text-primary"></span>
				</div>
			</div>
		)
	}

	const organizer = isOrganizer(event, currentUser?.id)
	const myStatus = participantStatus(event, currentUser?.id)
	const mine = myStanding(event.standings, currentUser?.id)
	const accepted = event.participants.filter(p => p.status === 'accepted')
	const completed = event.status === 'completed'
	// Senza risultati la classifica non dice nulla: l'ordine e' solo spareggio ELO.
	const hasResults = (event.matches_played ?? 0) > 0

	const subtitle = completed
		? t('events.detailCompleted', { count: event.matches_total })
		: event.status === 'in_progress'
			? t('events.detailInProgress', {
					played: event.matches_played,
					total: event.matches_total,
				})
			: t('events.detailOpen', {
					accepted: accepted.length,
					total: event.participants_count,
				})

	const runAction = async (action: () => Promise<void>) => {
		setIsActing(true)
		setActionError(null)
		try {
			await action()
			await refetch()
		} catch (err: any) {
			setActionError(err.message ?? 'Errore')
		} finally {
			setIsActing(false)
		}
	}

	const handleRecord = async (
		sets: { set_number: number; score_p1: number; score_p2: number }[]
	) => {
		if (!recordSlot) return
		setIsSubmitting(true)
		setModalError(null)
		try {
			// Chi registra deve risultare gia' confermato, come in NewMatch: per
			// questo va passato come player_1. Se e' il secondo dello slot,
			// invertiamo anche i punteggi, che arrivano orientati sullo slot.
			const iAmSlotP2 = recordSlot.player_2_id === currentUser?.id
			const orientedSets = iAmSlotP2
				? sets.map(set => ({
						set_number: set.set_number,
						score_p1: set.score_p2,
						score_p2: set.score_p1,
					}))
				: sets

			await dbService.createMatch(
				iAmSlotP2 ? recordSlot.player_2_id : recordSlot.player_1_id,
				iAmSlotP2 ? recordSlot.player_1_id : recordSlot.player_2_id,
				event.best_of,
				orientedSets,
				true, // le partite d'evento sono sempre amichevoli
				recordSlot.id
			)
			closeRecord()
			await refetch()
			await refreshProfile()
		} catch (err: any) {
			setModalError(err.message ?? 'Errore')
		} finally {
			setIsSubmitting(false)
		}
	}

	const topThree = completed
		? event.standings
				.slice(0, 3)
				.map(row => row.player)
				.filter((p): p is NonNullable<typeof p> => !!p)
		: []

	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			<div className="flex items-center gap-3 px-4 pt-6 pb-4 shrink-0">
				<button
					onClick={onBack}
					className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-white"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>
				<div className="min-w-0">
					<h2 className="text-xl font-bold tracking-tight text-white truncate">
						{event.name}
					</h2>
					<p className="text-[13px] text-slate-400">{subtitle}</p>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-24 space-y-4">
				{actionError && (
					<div className="alert alert-error text-sm py-2 px-3 shadow-md">
						<span>{actionError}</span>
					</div>
				)}

				{/* Podio delle edizioni concluse */}
				{completed && topThree.length > 0 && (
					<PodiumSection topThree={topThree} onPlayerSelect={onPlayerSelect} />
				)}

				{/* Proiezione della difesa durante l'edizione */}
				{!completed && mine && hasResults && event.status === 'in_progress' && (
					<div className="rounded-2xl overflow-hidden bg-success/[0.08] border border-success/30">
						<div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-success/20">
							<Zap className="w-3 h-3 text-success" />
							<span className="text-[11px] font-bold uppercase tracking-wider text-success">
								{t('events.ifEndedNow')}
							</span>
						</div>
						<div className="grid grid-cols-3 items-center p-3.5">
							<div className="text-center">
								<div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
									{t('events.defending')}
								</div>
								<div className="text-xl font-black text-slate-500">
									{mine.defending_points ?? 0}
								</div>
							</div>
							<div className="text-center border-x border-slate-800">
								<div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
									{t('events.placement', { position: mine.position })}
								</div>
								<div className="text-xl font-black text-yellow-400">
									{mine.projected_points ?? 0}
								</div>
							</div>
							<div className="text-center">
								<div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
									{t('events.toRanking')}
								</div>
								<div
									className={`text-xl font-black ${deltaColor(
										mine.projected_delta ?? 0
									)}`}
								>
									{formatDelta(mine.projected_delta ?? 0)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Iscrizioni aperte: rosa e punti in palio */}
				{event.status === 'open' && (
					<>
						<div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
							<div className="px-3.5 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
								<span className="text-xs font-bold text-slate-300">
									{t('events.participantsTitle')}
								</span>
								<span className="text-[11px] font-bold text-slate-500">
									{accepted.length} / {event.participants_count}
								</span>
							</div>
							{accepted.map((p, index) => (
								<div
									key={p.id}
									className={`flex items-center justify-between px-3.5 py-2.5 ${
										index > 0 ? 'border-t border-slate-800/80' : ''
									}`}
								>
									<span className="text-[13px] font-semibold text-slate-200 truncate">
										{p.player_id === currentUser?.id
											? t('common.you')
											: (p.player?.display_name ?? '—')}
									</span>
									<span className="text-xs text-slate-500 shrink-0">
										{p.player?.elo_rating} {t('common.elo')}
									</span>
								</div>
							))}
						</div>

						<div className="p-3.5 rounded-2xl bg-slate-950/60">
							<div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
								{t('events.pointsAtStake')}
							</div>
							<PointsPills points={event.ranking_points} showPositions />
						</div>

						{(myStatus === 'none' || myStatus === 'withdrawn') &&
							(accepted.length >= event.participants_count ? (
								<div className="w-full py-3 text-center rounded-2xl bg-slate-800/40 text-slate-500 text-sm font-bold">
									{t('events.full')}
								</div>
							) : (
								<button
									onClick={() =>
										runAction(() => dbService.applyToEvent(event.id))
									}
									disabled={isActing}
									className="btn w-full font-bold rounded-2xl border-none text-white bg-indigo-500 hover:bg-indigo-400 shadow-lg shadow-indigo-500/25"
								>
									{t('events.join')}
								</button>
							))}
						{myStatus === 'accepted' && (
							<div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/40">
								<span className="flex items-center gap-1.5 text-[13px] text-success font-semibold">
									<Check className="w-3.5 h-3.5" />
									{t('events.alreadyIn')}
								</span>
								<button
									onClick={() => {
										if (window.confirm(t('events.leaveConfirm'))) {
											runAction(() => dbService.leaveEvent(event.id))
										}
									}}
									disabled={isActing}
									className="btn btn-ghost btn-xs h-7 px-2.5 rounded-xl text-xs font-bold text-error hover:bg-error/10"
								>
									<LogOut className="w-3.5 h-3.5" />
									{t('events.leave')}
								</button>
							</div>
						)}

						{organizer && (
							<button
								onClick={() => runAction(() => dbService.startEvent(event.id))}
								disabled={isActing || accepted.length < 4}
								className={`btn w-full font-bold uppercase tracking-wider rounded-2xl border-none text-white py-3.5 h-auto ${
									accepted.length >= 4 && !isActing
										? 'bg-orange-500 hover:bg-orange-400 shadow-lg shadow-orange-500/25'
										: 'bg-slate-700 text-slate-500 cursor-not-allowed'
								}`}
							>
								{t('events.startEvent')}
							</button>
						)}
					</>
				)}

				{/* Classifica */}
				{event.status !== 'open' &&
					(completed ? (
						<DefenceTable
							standings={event.standings}
							currentUserId={currentUser?.id}
							isFirstEdition={event.edition_number === 1}
						/>
					) : (
						<div>
							<div className="flex items-center gap-1.5 mb-2">
								<Trophy className="w-3 h-3 text-indigo-400" />
								<span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
									{t('events.standingsTitle')}
								</span>
							</div>
							<StandingsTable
								standings={event.standings}
								currentUserId={currentUser?.id}
								hasResults={hasResults}
								onPlayerSelect={onPlayerSelect}
							/>
						</div>
					))}

				{/* Calendario */}
				{event.status !== 'open' && (
					<MatchGrid
						slots={event.slots}
						currentUserId={currentUser?.id}
						bestOf={event.best_of}
						isActing={isActing}
						onRecord={completed ? undefined : slot => openRecord(slot)}
						onConfirm={slot =>
							runAction(async () => {
								await dbService.confirmMatchAsPlayer(slot.match_id!)
								await refreshProfile()
							})
						}
						onReject={slot => runAction(() => dbService.rejectEventMatch(slot.id))}
					/>
				)}

				{/* Campione in carica */}
				{completed && event.standings[0] && (
					<div className="flex items-center gap-3 p-3.5 rounded-2xl bg-yellow-400/[0.08] border border-yellow-400/30">
						<Crown className="w-5 h-5 text-yellow-400 fill-yellow-400/20 shrink-0" />
						<span className="text-xs leading-snug text-yellow-200">
							<strong className="text-yellow-400">
								{event.standings[0].player_id === currentUser?.id
									? t('common.you')
									: event.standings[0].player?.display_name}
							</strong>{' '}
							— {t('profile.reigningChampion').toLowerCase()} {event.series_name}
						</span>
					</div>
				)}

				{/* Regolamento */}
				<div className="rounded-2xl overflow-hidden bg-slate-900/60 border border-slate-800">
					<div className="px-3.5 py-2.5 border-b border-slate-800/60">
						<span className="text-xs font-bold text-slate-300">
							{t('events.rulesTitle')}
						</span>
					</div>
					<div className="flex justify-between items-center px-3.5 py-2.5">
						<span className="text-xs text-slate-400">{t('events.rulesFormat')}</span>
						<span className="text-xs font-bold text-slate-200">
							{t('events.rulesFormatValue', { bestOf: event.best_of })}
						</span>
					</div>
					<div className="flex justify-between items-center px-3.5 py-2.5 border-t border-slate-800/60">
						<span className="text-xs text-slate-400">{t('events.rulesPoints')}</span>
						<span className="text-xs font-bold text-slate-200">
							{Object.entries(event.ranking_points)
								.sort((a, b) => Number(a[0]) - Number(b[0]))
								.map(([, v]) => v)
								.join(' · ')}
						</span>
					</div>
				</div>
			</div>

			{recordSlot && (
				<RecordResultModal
					slot={recordSlot}
					bestOf={event.best_of}
					isSubmitting={isSubmitting}
					error={modalError}
					onCancel={closeRecord}
					onSubmit={handleRecord}
					onClearError={() => setModalError(null)}
				/>
			)}
		</div>
	)
}
