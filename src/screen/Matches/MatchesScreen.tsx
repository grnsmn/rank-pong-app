import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { dbService, type MatchWithSets } from '../../services/db'
import { useAppStore } from '../../store/useAppStore'
import { useDataFetch } from '../../hooks/useDataFetch'
import { useModalState } from '../../hooks/useModalState'
import { Pencil } from 'lucide-react'
import { getSetsScore } from './matchHelpers'
import { CorrectionRequestCard } from './CorrectionRequestCard'
import { PendingConfirmCard } from './PendingConfirmCard'
import { MatchCard } from './MatchCard'
import { FilterBar } from './FilterBar'
import { CorrectionModal } from './CorrectionModal'

interface CorrectionModalData {
	match: MatchWithSets
	sets: { score_p1: string; score_p2: string }[]
}

interface Props {
	onPlayerSelect?: (playerId: string) => void
}

export const MatchesScreen: React.FC<Props> = ({ onPlayerSelect }) => {
	const { t } = useTranslation()
	const { currentUser, refreshProfile } = useAppStore()

	const {
		data,
		isLoading,
		refetch: fetchMatches,
	} = useDataFetch(() => dbService.getMatches(), { refetchOnFocus: true })
	const matches = data ?? []

	const {
		modalData: correctionModal,
		modalError: correctionError,
		isSubmitting: isSubmittingCorrection,
		open: openCorrectionModal_,
		close: closeCorrectionModal,
		setModalData: setCorrectionModal,
		setModalError: setCorrectionError,
		setIsSubmitting: setIsSubmittingCorrection,
	} = useModalState<CorrectionModalData>()

	const [searchQuery, setSearchQuery] = useState('')
	const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all')
	const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'wins' | 'losses'>('all')
	const [typeFilter, setTypeFilter] = useState<'all' | 'ranked' | 'friendly'>('all')
	const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'threeMonths'>('all')
	const [formatFilter, setFormatFilter] = useState<'all' | '3' | '5'>('all')
	const [includeDisputed, setIncludeDisputed] = useState(true)
	const [includeWaiting, setIncludeWaiting] = useState(true)
	const [showAdvanced, setShowAdvanced] = useState(false)
	const [visibleLimit, setVisibleLimit] = useState(10)

	const handleConfirm = async (matchId: string) => {
		try {
			await dbService.confirmMatchAsPlayer(matchId)
			await fetchMatches()
			await refreshProfile()
		} catch (err) {
			alert(t('matches.errorConfirm') + ' ' + (err as Error).message)
		}
	}

	const handleDispute = async (matchId: string) => {
		if (confirm(t('matches.disputeConfirm'))) {
			try {
				await dbService.disputeMatch(matchId)
				await fetchMatches()
			} catch (err) {
				alert(t('matches.errorDispute') + ' ' + (err as Error).message)
			}
		}
	}

	const openCorrectionModal = (match: MatchWithSets) => {
		openCorrectionModal_({
			match,
			sets: match.sets.map(s => ({
				score_p1: String(s.score_p1),
				score_p2: String(s.score_p2),
			})),
		})
	}

	const validateCorrectionSets = (sets: { score_p1: string; score_p2: string }[]) => {
		for (let i = 0; i < sets.length; i++) {
			const p1 = parseInt(sets[i].score_p1)
			const p2 = parseInt(sets[i].score_p2)
			const label = `Set ${i + 1}:`
			if (isNaN(p1) || isNaN(p2) || p1 < 0 || p2 < 0)
				return `${label} ${t('matches.correctionValidInvalid')}`
			if (p1 === p2) return `${label} ${t('matches.correctionValidEqual')}`
			const max = Math.max(p1, p2)
			const min = Math.min(p1, p2)
			if (max < 11) return `${label} ${t('matches.correctionValidMin11')}`
			if (max - min < 2) return `${label} ${t('matches.correctionValidMargin')}`
		}
		return null
	}

	const handleSubmitCorrection = async () => {
		if (!correctionModal) return
		const err = validateCorrectionSets(correctionModal.sets)
		if (err) {
			setCorrectionError(err)
			return
		}

		setIsSubmittingCorrection(true)
		try {
			const newSets = correctionModal.match.sets.map((s, i) => ({
				set_number: s.set_number,
				score_p1: parseInt(correctionModal.sets[i].score_p1),
				score_p2: parseInt(correctionModal.sets[i].score_p2),
			}))
			await dbService.requestCorrection(correctionModal.match.id, newSets)
			closeCorrectionModal()
			await fetchMatches()
		} catch (e) {
			setCorrectionError((e as Error).message)
		} finally {
			setIsSubmittingCorrection(false)
		}
	}

	const handleApproveCorrection = async (matchId: string) => {
		try {
			await dbService.approveCorrection(matchId)
			await fetchMatches()
			await refreshProfile()
		} catch (err) {
			alert(t('matches.correctionErrorApprove') + (err as Error).message)
		}
	}

	const handleRejectCorrection = async (matchId: string) => {
		if (confirm(t('matches.correctionRejectConfirm'))) {
			try {
				await dbService.rejectCorrection(matchId)
				await fetchMatches()
			} catch (err) {
				alert(t('matches.correctionErrorReject') + (err as Error).message)
			}
		}
	}

	const pendingRequests = matches.filter(
		m =>
			m.status === 'pending' &&
			((m.player_1_id === currentUser?.id && !m.player_1_confirmed) ||
				(m.player_2_id === currentUser?.id && !m.player_2_confirmed))
	)
	const pendingRequestIds = new Set(pendingRequests.map(m => m.id))
	const pendingSent = matches.filter(
		m =>
			m.status === 'pending' &&
			!pendingRequestIds.has(m.id) &&
			(m.created_by === currentUser?.id ||
				m.player_1_id === currentUser?.id ||
				m.player_2_id === currentUser?.id)
	)
	const pendingSentIds = new Set(pendingSent.map(m => m.id))

	const pendingCorrections = matches.filter(
		m =>
			m.status === 'confirmed' &&
			m.correction_status === 'pending' &&
			m.correction_requested_by !== currentUser?.id &&
			(m.player_1_id === currentUser?.id || m.player_2_id === currentUser?.id)
	)

	// Tutto ciò che può comparire nello storico: confermate + contestate + in attesa (le mie)
	const historyPool = matches.filter(
		m => m.status === 'confirmed' || m.status === 'disputed' || pendingSentIds.has(m.id)
	)
	const totalHistoryCount = historyPool.length

	const filteredMatches = historyPool.filter(match => {
		if (match.status === 'disputed' && !includeDisputed) return false
		if (match.status === 'pending' && !includeWaiting) return false

		// 1. Search Query filter (player name/username)
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim()
			const p1Name = match.player1?.display_name?.toLowerCase() || ''
			const p1User = match.player1?.username?.toLowerCase() || ''
			const p2Name = match.player2?.display_name?.toLowerCase() || ''
			const p2User = match.player2?.username?.toLowerCase() || ''

			const matchesP1 = p1Name.includes(query) || p1User.includes(query)
			const matchesP2 = p2Name.includes(query) || p2User.includes(query)

			if (!matchesP1 && !matchesP2) return false
		}

		// 2. Scope Filter (All vs Mine)
		const isCurrentUserP1 = match.player_1_id === currentUser?.id
		const isCurrentUserP2 = match.player_2_id === currentUser?.id
		const isMine = isCurrentUserP1 || isCurrentUserP2

		if (scopeFilter === 'mine' && !isMine) {
			return false
		}

		// 3. Outcome Filter — ha senso solo per partite confermate (non per contestate/in attesa)
		if (match.status === 'confirmed' && scopeFilter === 'mine' && outcomeFilter !== 'all') {
			const { p1, p2 } = getSetsScore(match.sets)
			const isP1Winner = p1 > p2
			const iAmP1 = isCurrentUserP1
			const iWon = (iAmP1 && isP1Winner) || (!iAmP1 && !isP1Winner)

			if (outcomeFilter === 'wins' && !iWon) return false
			if (outcomeFilter === 'losses' && iWon) return false
		}

		// 4. Timeframe Filter
		if (timeFilter !== 'all') {
			const matchDate = new Date(match.created_at)
			const now = new Date()
			const diffMs = now.getTime() - matchDate.getTime()
			const diffDays = diffMs / (1000 * 60 * 60 * 24)

			if (timeFilter === 'week' && diffDays > 7) return false
			if (timeFilter === 'month' && diffDays > 30) return false
			if (timeFilter === 'threeMonths' && diffDays > 90) return false
		}

		// 5. Format Filter
		if (formatFilter !== 'all') {
			const formatVal = parseInt(formatFilter)
			if (match.best_of !== formatVal) return false
		}

		// 6. Match Type Filter (Ranked vs Amichevole)
		if (typeFilter === 'ranked' && match.is_friendly) return false
		if (typeFilter === 'friendly' && !match.is_friendly) return false

		return true
	})

	const slicedMatches = filteredMatches.slice(0, visibleLimit)

	const hasActiveFilters =
		searchQuery !== '' ||
		scopeFilter !== 'all' ||
		outcomeFilter !== 'all' ||
		typeFilter !== 'all' ||
		timeFilter !== 'all' ||
		formatFilter !== 'all' ||
		!includeDisputed ||
		!includeWaiting

	const clearAllFilters = () => {
		setSearchQuery('')
		setScopeFilter('all')
		setOutcomeFilter('all')
		setTypeFilter('all')
		setTimeFilter('all')
		setFormatFilter('all')
		setIncludeDisputed(true)
		setIncludeWaiting(true)
		setVisibleLimit(10)
	}

	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			<div className="px-4 pt-6 pb-2">
				<h2 className="text-xl font-bold tracking-tight text-white">
					{t('matches.title')}
				</h2>
			</div>

			{isLoading ? (
				<div className="flex-1 flex items-center justify-center">
					<span className="loading loading-spinner loading-md text-primary"></span>
				</div>
			) : (
				<div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-24 space-y-6">
					{/* Correzioni da approvare */}
					{pendingCorrections.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
								<Pencil className="w-3 h-3" />
								{t('matches.correctionSectionTitle')} ({pendingCorrections.length})
							</h3>
							<div className="space-y-3">
								{pendingCorrections.map(match => (
									<CorrectionRequestCard
										key={match.id}
										match={match}
										onApprove={handleApproveCorrection}
										onReject={handleRejectCorrection}
										onPlayerSelect={onPlayerSelect}
									/>
								))}
							</div>
						</div>
					)}

					{/* Richieste di conferma in arrivo */}
					{pendingRequests.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-xs font-bold uppercase tracking-wider text-primary">
								{t('matches.pendingTitle')} ({pendingRequests.length})
							</h3>
							<div className="space-y-3">
								{pendingRequests.map(match => (
									<PendingConfirmCard
										key={match.id}
										match={match}
										currentUserId={currentUser?.id}
										onConfirm={handleConfirm}
										onDispute={handleDispute}
										onPlayerSelect={onPlayerSelect}
									/>
								))}
							</div>
						</div>
					)}

					{/* Storico partite (confermate + contestate + in attesa, secondo i filtri) */}
					<div className="space-y-3">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
							<span>
								{t('matches.confirmedTitle')} ({totalHistoryCount})
							</span>
							{filteredMatches.length !== totalHistoryCount && (
								<span className="text-[10px] text-primary normal-case font-medium">
									{t('matches.showingMatchesCount', {
										count: filteredMatches.length,
										total: totalHistoryCount,
									})}
								</span>
							)}
						</h3>

						{totalHistoryCount > 0 && (
							<FilterBar
								searchQuery={searchQuery}
								onSearchChange={v => {
									setSearchQuery(v)
									setVisibleLimit(10)
								}}
								scopeFilter={scopeFilter}
								onScopeChange={v => {
									setScopeFilter(v)
									if (v === 'all') setOutcomeFilter('all')
									setVisibleLimit(10)
								}}
								outcomeFilter={outcomeFilter}
								onOutcomeChange={v => {
									setOutcomeFilter(v)
									setVisibleLimit(10)
								}}
								typeFilter={typeFilter}
								onTypeChange={v => {
									setTypeFilter(v)
									setVisibleLimit(10)
								}}
								timeFilter={timeFilter}
								onTimeChange={v => {
									setTimeFilter(v)
									setVisibleLimit(10)
								}}
								formatFilter={formatFilter}
								onFormatChange={v => {
									setFormatFilter(v)
									setVisibleLimit(10)
								}}
								includeDisputed={includeDisputed}
								onIncludeDisputedChange={v => {
									setIncludeDisputed(v)
									setVisibleLimit(10)
								}}
								includeWaiting={includeWaiting}
								onIncludeWaitingChange={v => {
									setIncludeWaiting(v)
									setVisibleLimit(10)
								}}
								showAdvanced={showAdvanced}
								onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
								hasActiveFilters={hasActiveFilters}
								onClearAll={clearAllFilters}
							/>
						)}

						{totalHistoryCount === 0 ? (
							<div className="p-8 text-center bg-slate-900/10 rounded-2xl shadow-sm shadow-black/20 text-slate-500 text-sm">
								{t('matches.confirmedEmpty')}
							</div>
						) : filteredMatches.length === 0 ? (
							<div className="p-8 text-center bg-slate-900/10 rounded-2xl shadow-sm shadow-black/20 text-slate-500 text-sm">
								{t('matches.noMatchesFiltered')}
							</div>
						) : (
							<div className="space-y-3.5">
								<div className="space-y-3">
									{slicedMatches.map(match => (
										<MatchCard
											key={match.id}
											match={match}
											currentUserId={currentUser?.id}
											onRequestCorrection={openCorrectionModal}
											onPlayerSelect={onPlayerSelect}
										/>
									))}
								</div>

								{filteredMatches.length > visibleLimit && (
									<div className="flex justify-center pt-2">
										<button
											onClick={() => setVisibleLimit(prev => prev + 10)}
											className="btn btn-sm rounded-xl text-xs font-bold px-6 cursor-pointer border-none bg-slate-800/50 text-slate-300 hover:bg-slate-800"
										>
											{t('matches.loadMore')}
										</button>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Modale correzione punteggi */}
			{correctionModal && (
				<CorrectionModal
					match={correctionModal.match}
					sets={correctionModal.sets}
					error={correctionError}
					isSubmitting={isSubmittingCorrection}
					onSetsChange={sets => setCorrectionModal({ ...correctionModal, sets })}
					onClearError={() => setCorrectionError(null)}
					onCancel={closeCorrectionModal}
					onSubmit={handleSubmitCorrection}
				/>
			)}
		</div>
	)
}
