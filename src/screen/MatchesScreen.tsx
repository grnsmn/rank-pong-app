import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { dbService, type MatchWithSets } from '../services/db'
import { useAppStore } from '../store/useAppStore'
import {
	Calendar,
	ShieldAlert,
	Pencil,
	Clock,
	CheckCircle,
	XCircle,
	Search,
	SlidersHorizontal,
	X,
	Trophy,
} from 'lucide-react'

interface CorrectionModal {
	match: MatchWithSets
	sets: { score_p1: string; score_p2: string }[]
}

export const MatchesScreen: React.FC = () => {
	const { t } = useTranslation()
	const { currentUser, refreshProfile } = useAppStore()
	const [matches, setMatches] = useState<MatchWithSets[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [correctionModal, setCorrectionModal] = useState<CorrectionModal | null>(null)
	const [correctionError, setCorrectionError] = useState<string | null>(null)
	const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false)

	const [searchQuery, setSearchQuery] = useState('')
	const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>('all')
	const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'wins' | 'losses'>('all')
	const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'threeMonths'>('all')
	const [formatFilter, setFormatFilter] = useState<'all' | '3' | '5'>('all')
	const [showAdvanced, setShowAdvanced] = useState(false)
	const [visibleLimit, setVisibleLimit] = useState(10)

	const fetchMatches = async () => {
		setIsLoading(true)
		try {
			const data = await dbService.getMatches()
			setMatches(data)
		} catch (err) {
			console.error('Errore caricamento match:', err)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchMatches()
		const handleFocus = () => fetchMatches()
		window.addEventListener('focus', handleFocus)
		return () => window.removeEventListener('focus', handleFocus)
	}, [])

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
		setCorrectionError(null)
		setCorrectionModal({
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
			setCorrectionModal(null)
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

	const getSetsScore = (sets: any[]) => {
		let p1 = 0,
			p2 = 0
		sets.forEach(s => {
			if (s.score_p1 > s.score_p2) p1++
			else p2++
		})
		return { p1, p2 }
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
	const totalConfirmedCount = matches.filter(m => m.status === 'confirmed').length
	const filteredConfirmedMatches = matches.filter(match => {
		if (match.status !== 'confirmed') return false

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

		// 3. Outcome Filter (only when scopeFilter is 'mine')
		if (scopeFilter === 'mine' && outcomeFilter !== 'all') {
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

		return true
	})

	const slicedConfirmedMatches = filteredConfirmedMatches.slice(0, visibleLimit)
	const disputedMatches = matches.filter(m => m.status === 'disputed')

	const pendingCorrections = matches.filter(
		m =>
			m.status === 'confirmed' &&
			m.correction_status === 'pending' &&
			m.correction_requested_by !== currentUser?.id &&
			(m.player_1_id === currentUser?.id || m.player_2_id === currentUser?.id)
	)

	const isMyMatch = (match: MatchWithSets) =>
		currentUser?.id === match.player_1_id || currentUser?.id === match.player_2_id

	const canRequestCorrection = (match: MatchWithSets) =>
		isMyMatch(match) && match.correction_status !== 'pending'

	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			<div className="px-4 pt-6 pb-2">
				<h2 className="text-xl font-bold tracking-tight text-white mb-1">
					{t('matches.title')}
				</h2>
				<p className="text-xs text-slate-400 font-normal">{t('matches.subtitle')}</p>
			</div>

			{isLoading ? (
				<div className="flex-1 flex items-center justify-center">
					<span className="loading loading-spinner loading-md text-primary"></span>
				</div>
			) : (
				<div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6">
					{/* Correzioni da approvare */}
					{pendingCorrections.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
								<Pencil className="w-3 h-3" />
								{t('matches.correctionSectionTitle')} ({pendingCorrections.length})
							</h3>
							<div className="space-y-3">
								{pendingCorrections.map(match => {
									const opponent =
										match.player_1_id === match.correction_requested_by
											? match.player1
											: match.player2
									const currentSets = getSetsScore(match.sets)
									const proposedSets = match.correction_sets
										? (() => {
												let p1 = 0,
													p2 = 0
												match.correction_sets!.forEach(s => {
													if (s.score_p1 > s.score_p2) p1++
													else p2++
												})
												return { p1, p2 }
											})()
										: null

									return (
										<div
											key={match.id}
											className="p-4 rounded-2xl bg-slate-900 border border-orange-400/25 shadow-md"
										>
											<div className="flex justify-between items-start mb-3">
												<span className="badge badge-sm font-extrabold text-[10px] text-white bg-orange-500 border-none">
													{t('matches.correctionBadge')}
												</span>
												<span className="text-[10px] text-slate-500 flex items-center gap-1">
													<Calendar className="w-3 h-3" />
													{new Date(
														match.created_at
													).toLocaleDateString()}
												</span>
											</div>

											<p className="text-sm mb-3">
												<span className="font-extrabold text-slate-200">
													{opponent?.display_name}
												</span>{' '}
												{t('matches.correctionIntro')}
											</p>

											<div className="bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden mb-4">
												<div className="flex justify-between items-center px-4 py-2 border-b border-slate-800/60">
													<span className="text-[10px] text-slate-500 uppercase font-bold">
														{t('matches.correctionCurrentLabel')}
													</span>
													<span className="font-mono text-sm text-slate-300 font-bold">
														{currentSets.p1} – {currentSets.p2}
													</span>
												</div>
												{proposedSets && (
													<div className="flex justify-between items-center px-4 py-2.5">
														<span className="text-[10px] text-orange-400 uppercase font-bold">
															{t('matches.correctionProposedLabel')}
														</span>
														<div className="flex flex-col items-end gap-1">
															<span className="font-mono text-sm text-orange-300 font-bold">
																{proposedSets.p1} –{' '}
																{proposedSets.p2}
															</span>
															{match.correction_sets && (
																<div className="flex flex-wrap gap-1 justify-end">
																	{match.correction_sets.map(
																		(s, i) => (
																			<span
																				key={i}
																				className="bg-orange-950/50 border border-orange-800/40 px-1.5 py-0.5 rounded text-[9px] font-mono text-orange-300"
																			>
																				S{s.set_number}:{' '}
																				{s.score_p1}-
																				{s.score_p2}
																			</span>
																		)
																	)}
																</div>
															)}
														</div>
													</div>
												)}
											</div>

											<div className="flex gap-2">
												<button
													onClick={() =>
														handleApproveCorrection(match.id)
													}
													className="btn btn-success btn-sm flex-1 text-white font-bold gap-1"
												>
													<CheckCircle className="w-3.5 h-3.5" />
													{t('matches.correctionApprove')}
												</button>
												<button
													onClick={() => handleRejectCorrection(match.id)}
													className="btn btn-outline btn-error btn-sm flex-1 font-bold gap-1"
												>
													<XCircle className="w-3.5 h-3.5" />
													{t('matches.correctionReject')}
												</button>
											</div>
										</div>
									)
								})}
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
								{pendingRequests.map(match => {
									const { p1, p2 } = getSetsScore(match.sets)
									const iAmPlayer1 = match.player_1_id === currentUser?.id
									const isArbitrated = match.created_by !== match.player_1_id
									return (
										<div
											key={match.id}
											className="p-4 rounded-2xl bg-slate-900 border border-primary/20 shadow-md"
										>
											<div className="flex justify-between items-start mb-2">
												<div className="flex gap-1.5">
													<span className="badge badge-primary badge-sm font-extrabold text-[10px] text-white">
														{t('matches.confirmRequest')}
													</span>
													{isArbitrated && (
														<span className="badge badge-sm font-extrabold text-[10px] bg-purple-600 text-white border-none">
															{t('matches.arbitratorBadge')}
														</span>
													)}
												</div>
												<span className="text-[10px] text-slate-500 flex items-center gap-1">
													<Calendar className="w-3 h-3" />
													{new Date(
														match.created_at
													).toLocaleDateString()}
												</span>
											</div>

											<p className="text-sm mb-3">
												{iAmPlayer1 ? (
													<>
														<span className="font-extrabold text-slate-200">
															{match.player2?.display_name}
														</span>{' '}
														{t('matches.pendingAsPlayer1')}{' '}
														<span className="font-extrabold text-slate-200">
															{match.player1?.display_name}
														</span>
													</>
												) : (
													<>
														<span className="font-extrabold text-slate-200">
															{match.player1?.display_name}
														</span>{' '}
														{t('matches.challenged')} {match.best_of}):
													</>
												)}
											</p>

											<div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4">
												<div className="flex justify-between items-center text-sm font-bold mb-2">
													<span className="text-slate-300">
														{match.player1?.display_name}
													</span>
													<span className="text-primary text-base font-extrabold">
														{p1} - {p2}
													</span>
													<span className="text-slate-300">
														{t('common.you')}
													</span>
												</div>
												<div className="flex flex-wrap gap-2 justify-center text-xs">
													{match.sets.map((set, idx) => (
														<span
															key={set.id}
															className="bg-slate-900 border border-slate-850 px-2 py-1 rounded-lg text-slate-400 font-mono"
														>
															{t('common.set')} {idx + 1}:{' '}
															<strong className="text-slate-200">
																{set.score_p1}-{set.score_p2}
															</strong>
														</span>
													))}
												</div>
											</div>

											<div className="flex gap-2">
												<button
													onClick={() => handleConfirm(match.id)}
													className="btn btn-success btn-xs flex-1 text-white font-bold h-8"
												>
													{t('matches.approve')}
												</button>
												<button
													onClick={() => handleDispute(match.id)}
													className="btn btn-outline btn-error btn-xs flex-1 h-8 font-bold"
												>
													{t('matches.dispute')}
												</button>
											</div>
										</div>
									)
								})}
							</div>
						</div>
					)}

					{/* In attesa di conferma avversario */}
					{pendingSent.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-xs font-bold uppercase tracking-wider text-warning">
								{t('matches.waitingOpponent')} ({pendingSent.length})
							</h3>
							<div className="space-y-2">
								{pendingSent.map(match => {
									const { p1, p2 } = getSetsScore(match.sets)
									return (
										<div
											key={match.id}
											className="p-3 rounded-xl bg-slate-900/60 border border-yellow-500/10 text-xs flex justify-between items-center"
										>
											<div>
												<p className="font-semibold text-slate-300">
													{t('matches.challengeAgainst')}{' '}
													<strong className="text-white">
														@{match.player2?.username}
													</strong>
												</p>
												<span className="text-[10px] text-slate-500 font-mono">
													{t('matches.recordedScore')} {p1} - {p2}
												</span>
											</div>
											<span className="badge badge-warning badge-outline badge-sm text-[9px] font-bold py-2">
												{t('matches.waiting')}
											</span>
										</div>
									)
								})}
							</div>
						</div>
					)}

					{/* Partite confermate */}
					<div className="space-y-3">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
							<span>
								{t('matches.confirmedTitle')} ({totalConfirmedCount})
							</span>
							{filteredConfirmedMatches.length !== totalConfirmedCount && (
								<span className="text-[10px] text-primary normal-case font-medium">
									{t('matches.showingMatchesCount', {
										count: filteredConfirmedMatches.length,
										total: totalConfirmedCount,
									})}
								</span>
							)}
						</h3>

						{totalConfirmedCount > 0 && (
							<div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3.5 space-y-3">
								{/* Row 1: Ricerca e Toggle Filtri Avanzati */}
								<div className="flex gap-2">
									<div className="relative flex-1">
										<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
											<Search className="w-3.5 h-3.5" />
										</span>
										<input
											type="text"
											value={searchQuery}
											onChange={e => {
												setSearchQuery(e.target.value)
												setVisibleLimit(10)
											}}
											placeholder={t('matches.filterSearchPlaceholder')}
											className="input input-sm pl-8.5 pr-8 w-full bg-slate-950 border-slate-850 text-white rounded-xl focus:border-primary focus:outline-none placeholder-slate-500 text-xs h-8"
										/>
										{searchQuery && (
											<button
												onClick={() => {
													setSearchQuery('')
													setVisibleLimit(10)
												}}
												className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-500 hover:text-slate-300"
											>
												<X className="w-3.5 h-3.5" />
											</button>
										)}
									</div>

									<button
										onClick={() => setShowAdvanced(!showAdvanced)}
										className={`btn btn-xs h-8 px-2.5 btn-outline border-slate-850 hover:bg-slate-800 hover:border-slate-700 rounded-xl gap-1 text-[11px] font-bold ${
											showAdvanced ||
											timeFilter !== 'all' ||
											formatFilter !== 'all'
												? 'text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/45'
												: 'text-slate-400'
										}`}
									>
										<SlidersHorizontal className="w-3.5 h-3.5" />
										<span>
											{t(
												showAdvanced
													? 'matches.filterHideAdvanced'
													: 'matches.filterShowAdvanced'
											)}
										</span>
									</button>
								</div>

								{/* Row 2: Scope pills (All vs Mine) e Outcome filters */}
								<div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900/60 pt-2.5">
									{/* Scope Pills */}
									<div className="flex gap-1">
										<button
											onClick={() => {
												setScopeFilter('all')
												setOutcomeFilter('all')
												setVisibleLimit(10)
											}}
											className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
												scopeFilter === 'all'
													? 'bg-primary border-primary text-white shadow-sm'
													: 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-850 cursor-pointer'
											}`}
										>
											{t('matches.filterAllMatches')}
										</button>
										<button
											onClick={() => {
												setScopeFilter('mine')
												setVisibleLimit(10)
											}}
											className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
												scopeFilter === 'mine'
													? 'bg-primary border-primary text-white shadow-sm'
													: 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-850 cursor-pointer'
											}`}
										>
											{t('matches.filterMyMatches')}
										</button>
									</div>

									{/* Outcome Pills (mostrate solo con scopeFilter === 'mine') */}
									{scopeFilter === 'mine' && (
										<div className="flex gap-0.5 bg-slate-950/60 p-0.5 rounded-full border border-slate-900">
											<button
												onClick={() => {
													setOutcomeFilter('all')
													setVisibleLimit(10)
												}}
												className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
													outcomeFilter === 'all'
														? 'bg-slate-800 text-white'
														: 'text-slate-500 hover:text-slate-400'
												}`}
											>
												{t('matches.filterOutcomeAll')}
											</button>
											<button
												onClick={() => {
													setOutcomeFilter('wins')
													setVisibleLimit(10)
												}}
												className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
													outcomeFilter === 'wins'
														? 'bg-success/20 text-success border border-success/35'
														: 'text-slate-500 hover:text-slate-400 border border-transparent'
												}`}
											>
												<Trophy className="w-2.5 h-2.5 text-success" />
												{t('matches.filterOutcomeWins')}
											</button>
											<button
												onClick={() => {
													setOutcomeFilter('losses')
													setVisibleLimit(10)
												}}
												className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
													outcomeFilter === 'losses'
														? 'bg-error/20 text-error border border-error/35'
														: 'text-slate-500 hover:text-slate-400 border border-transparent'
												}`}
											>
												{t('matches.filterOutcomeLosses')}
											</button>
										</div>
									)}
								</div>

								{/* Filtri Avanzati Collassabili */}
								{showAdvanced && (
									<div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-900/60">
										{/* Periodo Temporale */}
										<div className="space-y-1">
											<label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 pl-0.5">
												{t('matches.filterTimeAll')}
											</label>
											<select
												value={timeFilter}
												onChange={e => {
													setTimeFilter(e.target.value as any)
													setVisibleLimit(10)
												}}
												className="select select-xs w-full bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-300 rounded-xl focus:border-primary focus:outline-none py-1 h-8 text-[11px]"
											>
												<option value="all">
													{t('matches.filterTimeAll')}
												</option>
												<option value="week">
													{t('matches.filterTimeWeek')}
												</option>
												<option value="month">
													{t('matches.filterTimeMonth')}
												</option>
												<option value="threeMonths">
													{t('matches.filterTimeThreeMonths')}
												</option>
											</select>
										</div>

										{/* Formato di Gioco */}
										<div className="space-y-1">
											<label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 pl-0.5">
												{t('matches.filterFormatAll')}
											</label>
											<select
												value={formatFilter}
												onChange={e => {
													setFormatFilter(e.target.value as any)
													setVisibleLimit(10)
												}}
												className="select select-xs w-full bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-300 rounded-xl focus:border-primary focus:outline-none py-1 h-8 text-[11px]"
											>
												<option value="all">
													{t('matches.filterFormatAll')}
												</option>
												<option value="3">
													{t('matches.filterFormat3')}
												</option>
												<option value="5">
													{t('matches.filterFormat5')}
												</option>
											</select>
										</div>
									</div>
								)}

								{/* Pulsante Azzera Filtri */}
								{(searchQuery ||
									scopeFilter !== 'all' ||
									outcomeFilter !== 'all' ||
									timeFilter !== 'all' ||
									formatFilter !== 'all') && (
									<div className="flex justify-end pt-1 border-t border-slate-900/30">
										<button
											onClick={() => {
												setSearchQuery('')
												setScopeFilter('all')
												setOutcomeFilter('all')
												setTimeFilter('all')
												setFormatFilter('all')
												setVisibleLimit(10)
											}}
											className="btn btn-ghost btn-xs text-error gap-1 hover:bg-error/10 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 cursor-pointer"
										>
											<X className="w-3 h-3" />
											{t('matches.filterClear')}
										</button>
									</div>
								)}
							</div>
						)}

						{totalConfirmedCount === 0 ? (
							<div className="p-8 text-center bg-slate-900/10 rounded-2xl border border-slate-800 text-slate-500 text-sm">
								{t('matches.confirmedEmpty')}
							</div>
						) : filteredConfirmedMatches.length === 0 ? (
							<div className="p-8 text-center bg-slate-900/10 rounded-2xl border border-slate-800 text-slate-500 text-sm">
								{t('matches.noMatchesFiltered')}
							</div>
						) : (
							<div className="space-y-3.5">
								<div className="space-y-3">
									{slicedConfirmedMatches.map(match => {
										const { p1, p2 } = getSetsScore(match.sets)
										const isP1Winner = p1 > p2
										const iAmRequester =
											match.correction_requested_by === currentUser?.id
										const hasPendingCorrection =
											match.correction_status === 'pending'

										return (
											<div
												key={match.id}
												className="rounded-2xl bg-neutral/85 border border-slate-800/80 shadow-sm overflow-hidden"
											>
												<div className="px-4 pt-4 pb-3">
													<div className="flex justify-between items-center text-[10px] text-slate-500 mb-3 border-b border-slate-800 pb-2">
														<span className="font-mono">
															{t('matches.matchId')}
															{match.id.substring(0, 8)}
														</span>
														<span className="flex items-center gap-1">
															<Calendar className="w-3 h-3" />
															{new Date(
																match.created_at
															).toLocaleDateString()}
														</span>
													</div>

													<div className="grid grid-cols-7 items-center mb-3">
														<div className="col-span-2 flex flex-col items-center text-center">
															<div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 mb-1 flex items-center justify-center shrink-0">
																{match.player1?.avatar_url ? (
																	<img
																		src={
																			match.player1.avatar_url
																		}
																		alt=""
																		className="w-full h-full object-cover"
																	/>
																) : (
																	<span className="text-xs font-extrabold">
																		{match.player1?.display_name.substring(
																			0,
																			2
																		)}
																	</span>
																)}
															</div>
															<span
																className={`text-[10px] truncate max-w-full font-bold ${isP1Winner ? 'text-yellow-400' : 'text-slate-400'}`}
															>
																{match.player1?.display_name}
															</span>
															{match.elo_change_p1 !== null && (
																<span
																	className={`text-[10px] font-extrabold mt-0.5 ${match.elo_change_p1 >= 0 ? 'text-success' : 'text-error'}`}
																>
																	{match.elo_change_p1 >= 0
																		? `+${match.elo_change_p1}`
																		: match.elo_change_p1}{' '}
																	{t('common.elo')}
																</span>
															)}
														</div>

														<div className="col-span-3 flex flex-col items-center justify-center">
															<span className="text-xl font-black text-white bg-slate-950 px-4 py-1 rounded-xl border border-slate-850">
																{p1} - {p2}
															</span>
															<span className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">
																{t('common.bestOf')} {match.best_of}
															</span>
														</div>

														<div className="col-span-2 flex flex-col items-center text-center">
															<div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700 mb-1 flex items-center justify-center shrink-0">
																{match.player2?.avatar_url ? (
																	<img
																		src={
																			match.player2.avatar_url
																		}
																		alt=""
																		className="w-full h-full object-cover"
																	/>
																) : (
																	<span className="text-xs font-extrabold">
																		{match.player2?.display_name.substring(
																			0,
																			2
																		)}
																	</span>
																)}
															</div>
															<span
																className={`text-[10px] truncate max-w-full font-bold ${!isP1Winner ? 'text-yellow-400' : 'text-slate-400'}`}
															>
																{match.player2?.display_name}
															</span>
															{match.elo_change_p2 !== null && (
																<span
																	className={`text-[10px] font-extrabold mt-0.5 ${match.elo_change_p2 >= 0 ? 'text-success' : 'text-error'}`}
																>
																	{match.elo_change_p2 >= 0
																		? `+${match.elo_change_p2}`
																		: match.elo_change_p2}{' '}
																	{t('common.elo')}
																</span>
															)}
														</div>
													</div>

													<div className="flex gap-1.5 justify-center mt-3 pt-2.5 border-t border-slate-800/40 text-[10px] text-slate-400">
														{match.sets.map((set, idx) => (
															<span
																key={set.id}
																className="bg-slate-950 px-2.5 py-1 rounded-md font-mono border border-slate-850"
															>
																{t('common.set')} {idx + 1}:{' '}
																<strong className="text-slate-200">
																	{set.score_p1}-{set.score_p2}
																</strong>
															</span>
														))}
													</div>
												</div>

												{/* Footer correzione */}
												{isMyMatch(match) && (
													<div
														className={`px-4 py-2.5 border-t border-slate-800/60 ${hasPendingCorrection ? 'bg-orange-950/20' : 'bg-transparent'}`}
													>
														{hasPendingCorrection && iAmRequester ? (
															<div className="flex items-center justify-center gap-1.5 text-[11px] text-orange-400">
																<Clock className="w-3 h-3 shrink-0" />
																<span>
																	{t(
																		'matches.correctionSentWaiting'
																	)}
																</span>
															</div>
														) : hasPendingCorrection ? (
															<div className="flex items-center justify-center gap-1.5 text-[11px] text-orange-400">
																<Clock className="w-3 h-3 shrink-0" />
																<span>
																	{t(
																		'matches.correctionOpponentPending'
																	)}
																</span>
															</div>
														) : canRequestCorrection(match) ? (
															<button
																onClick={() =>
																	openCorrectionModal(match)
																}
																className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
															>
																<Pencil className="w-3 h-3" />
																{t(
																	'matches.correctionRequestButton'
																)}
															</button>
														) : null}
													</div>
												)}
											</div>
										)
									})}
								</div>

								{filteredConfirmedMatches.length > visibleLimit && (
									<div className="flex justify-center pt-2">
										<button
											onClick={() => setVisibleLimit(prev => prev + 10)}
											className="btn btn-outline btn-sm border-slate-850 hover:bg-slate-900 hover:border-slate-800 text-slate-300 rounded-xl text-xs font-bold px-6 cursor-pointer"
										>
											{t('matches.loadMore')}
										</button>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Partite contestate */}
					{disputedMatches.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-xs font-bold uppercase tracking-wider text-error flex items-center gap-1">
								<ShieldAlert className="w-4 h-4" /> {t('matches.disputedTitle')} (
								{disputedMatches.length})
							</h3>
							<div className="space-y-2">
								{disputedMatches.map(match => {
									const { p1, p2 } = getSetsScore(match.sets)
									return (
										<div
											key={match.id}
											className="p-3 rounded-xl bg-slate-900 border border-error/20 text-xs flex justify-between items-center"
										>
											<div>
												<p className="font-semibold text-slate-300">
													{match.player1?.display_name} vs{' '}
													{match.player2?.display_name}
												</p>
												<span className="text-[10px] text-error font-semibold font-mono">
													{t('matches.disputedBy')} {p1} - {p2}
												</span>
											</div>
											<span className="badge badge-error badge-outline badge-sm text-[9px] font-bold">
												{t('matches.disputedBadge')}
											</span>
										</div>
									)
								})}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Modale correzione punteggi */}
			{correctionModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-5"
					style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
					onClick={e => {
						if (e.target === e.currentTarget) setCorrectionModal(null)
					}}
				>
					<div className="w-full max-w-sm bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
						{/* Header modale */}
						<div className="px-6 pt-6 pb-4 border-b border-slate-800">
							<div className="flex items-center gap-2 mb-1.5">
								<Pencil className="w-4 h-4 text-orange-400 shrink-0" />
								<h3 className="text-base font-bold text-white">
									{t('matches.correctionModalTitle')}
								</h3>
							</div>
							<p className="text-xs text-slate-400 leading-relaxed">
								{t('matches.correctionModalSubtitle')}
							</p>
						</div>

						{/* Corpo modale */}
						<div className="px-6 py-5 space-y-3">
							{/* Intestazioni colonne */}
							<div className="grid grid-cols-[3rem_1fr_1rem_1fr] items-center gap-2 mb-1">
								<span />
								<span className="text-center text-[10px] text-slate-500 font-bold uppercase truncate">
									{correctionModal.match.player1?.display_name}
								</span>
								<span />
								<span className="text-center text-[10px] text-slate-500 font-bold uppercase truncate">
									{correctionModal.match.player2?.display_name}
								</span>
							</div>

							{correctionModal.sets.map((set, idx) => (
								<div
									key={idx}
									className="grid grid-cols-[3rem_1fr_1rem_1fr] items-center gap-2"
								>
									<span className="text-[10px] text-slate-500 font-mono text-center">
										{t('common.set')} {idx + 1}
									</span>
									<input
										type="number"
										min="0"
										value={set.score_p1}
										onChange={e => {
											const next = correctionModal.sets.map((s, i) =>
												i === idx ? { ...s, score_p1: e.target.value } : s
											)
											setCorrectionModal({ ...correctionModal, sets: next })
											setCorrectionError(null)
										}}
										className="input input-sm w-full text-center bg-slate-800 border-slate-700 text-white focus:border-orange-400 focus:outline-none"
									/>
									<span className="text-center text-slate-500 font-bold text-xs">
										–
									</span>
									<input
										type="number"
										min="0"
										value={set.score_p2}
										onChange={e => {
											const next = correctionModal.sets.map((s, i) =>
												i === idx ? { ...s, score_p2: e.target.value } : s
											)
											setCorrectionModal({ ...correctionModal, sets: next })
											setCorrectionError(null)
										}}
										className="input input-sm w-full text-center bg-slate-800 border-slate-700 text-white focus:border-orange-400 focus:outline-none"
									/>
								</div>
							))}

							{correctionError && (
								<p className="text-xs text-error text-center pt-1">
									{correctionError}
								</p>
							)}
						</div>

						{/* Footer modale */}
						<div className="px-6 pb-6 flex gap-3">
							<button
								onClick={() => setCorrectionModal(null)}
								disabled={isSubmittingCorrection}
								className="btn btn-ghost flex-1 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
							>
								{t('matches.correctionModalCancel')}
							</button>
							<button
								onClick={handleSubmitCorrection}
								disabled={isSubmittingCorrection}
								className="btn flex-1 font-bold bg-orange-500 hover:bg-orange-400 text-white border-none shadow-lg"
							>
								{isSubmittingCorrection ? (
									<span className="loading loading-spinner loading-xs" />
								) : (
									t('matches.correctionModalSend')
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
