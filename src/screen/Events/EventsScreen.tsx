import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Swords } from 'lucide-react'
import { dbService, type EventResult, type EventRow } from '../../services/db'
import { useAppStore } from '../../store/useAppStore'
import { useDataFetch } from '../../hooks/useDataFetch'
import { EventCard } from './EventCard'
import { EventDetailScreen } from './EventDetailScreen'
import { NewEventScreen } from './NewEventScreen'
import { EventFilterBar, type StatusFilter } from './EventFilterBar'

interface Props {
	onPlayerSelect?: (playerId: string) => void
}

// Lista unica: l'ordine mette in cima cio' su cui si puo' agire.
const STATUS_ORDER: Record<string, number> = {
	open: 0,
	in_progress: 1,
	completed: 2,
	cancelled: 3,
}

export const EventsScreen: React.FC<Props> = ({ onPlayerSelect }) => {
	const { t } = useTranslation()
	const { currentUser } = useAppStore()

	const [search, setSearch] = useState('')
	const [status, setStatus] = useState<StatusFilter>('all')
	const [onlyMine, setOnlyMine] = useState(false)
	const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
	const [creating, setCreating] = useState(false)

	const { data, isLoading, refetch } = useDataFetch(() => dbService.getEvents(), {
		refetchOnFocus: true,
	})
	const events = data ?? []

	// Per le card serve sapere chi ha vinto e quanti punti ha preso l'utente:
	// entrambi vivono in event_results, che è già lo storico dell'app.
	const { data: resultsData } = useDataFetch(() => dbService.getEventResultsSummary())
	const results = resultsData ?? []

	const { data: projectionData } = useDataFetch(() => dbService.getMyProjections(), {
		refetchOnFocus: true,
	})
	const projections = projectionData ?? {}

	if (creating) {
		return (
			<NewEventScreen
				onBack={() => setCreating(false)}
				onCreated={id => {
					setCreating(false)
					setSelectedEventId(id)
					refetch()
				}}
			/>
		)
	}

	if (selectedEventId) {
		return (
			<EventDetailScreen
				eventId={selectedEventId}
				onBack={() => {
					setSelectedEventId(null)
					refetch()
				}}
				onPlayerSelect={onPlayerSelect}
			/>
		)
	}

	const sorted = [...events].sort((a, b) => {
		const byStatus = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
		if (byStatus !== 0) return byStatus
		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	})

	const query = search.trim().toLowerCase()
	const visible = sorted.filter(ev => {
		if (status !== 'all' && ev.status !== status) return false
		if (onlyMine && !isMine(ev, results, currentUser?.id)) return false
		if (query !== '') {
			const haystack = `${ev.name} ${ev.series_name ?? ''}`.toLowerCase()
			if (!haystack.includes(query)) return false
		}
		return true
	})

	const clearFilters = () => {
		setSearch('')
		setStatus('all')
		setOnlyMine(false)
	}

	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			<div className="px-4 pt-6 pb-2">
				<h2 className="text-xl font-bold tracking-tight text-white mb-1">
					{t('events.title')}
				</h2>
				<p className="text-xs text-slate-400 leading-snug">{t('events.subtitle')}</p>
			</div>

			{/* Creare un evento e' l'azione principale della sezione, non un
			    accessorio dei filtri: sta sopra, a tutta larghezza. */}
			<div className="px-4 pt-2">
				<button
					onClick={() => setCreating(true)}
					className="btn w-full gap-2 font-bold rounded-2xl border-none text-white py-3 h-auto bg-indigo-500 hover:bg-indigo-400 shadow-lg shadow-indigo-500/25"
				>
					<Plus className="w-4 h-4" strokeWidth={2.5} />
					{t('events.createCta')}
				</button>
			</div>

			<div className="px-4 py-2">
				<EventFilterBar
					search={search}
					onSearchChange={setSearch}
					status={status}
					onStatusChange={setStatus}
					onlyMine={onlyMine}
					onOnlyMineChange={setOnlyMine}
					shown={visible.length}
					total={events.length}
					onClear={clearFilters}
				/>
			</div>

			{isLoading ? (
				<div className="flex-1 flex items-center justify-center">
					<span className="loading loading-spinner loading-md text-primary"></span>
				</div>
			) : visible.length === 0 ? (
				<div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
					<Swords className="w-8 h-8 text-slate-700 mb-3" />
					<p className="text-sm max-w-[16rem] leading-relaxed">
						{events.length === 0 ? t('events.emptyCta') : t('events.emptyFiltered')}
					</p>
				</div>
			) : (
				<div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-24 space-y-4">
					{visible.map(ev => (
						<EventCard
							key={ev.id}
							event={ev}
							projection={projections[ev.id] ?? null}
							winnerName={winnerOf(results, ev.id)}
							myPoints={
								myResult(results, ev.id, currentUser?.id)?.ranking_points ?? null
							}
							myFinalRank={
								myResult(results, ev.id, currentUser?.id)?.final_rank ?? null
							}
							onOpen={() => setSelectedEventId(ev.id)}
						/>
					))}
				</div>
			)}
		</div>
	)
}

/** "Miei" = li organizzo, sono iscritto, oppure ci ho gia' giocato. */
function isMine(ev: EventRow, results: EventResult[], userId: string | undefined): boolean {
	if (!userId) return false
	return !!ev.i_organize || !!ev.i_am_in || !!myResult(results, ev.id, userId)
}

function myResult(
	results: EventResult[],
	eventId: string,
	userId: string | undefined
): EventResult | undefined {
	if (!userId) return undefined
	return results.find(r => r.event_id === eventId && r.player_id === userId)
}

function winnerOf(results: EventResult[], eventId: string): string | undefined {
	return results.find(r => r.event_id === eventId && r.final_rank === 1)?.player_name
}
