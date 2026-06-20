import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { dbService, type MatchWithSets } from '../services/db'
import { useAppStore } from '../store/useAppStore'
import { Calendar, ShieldAlert } from 'lucide-react'

export const MatchesScreen: React.FC = () => {
	const { t } = useTranslation()
	const { currentUser, refreshProfile } = useAppStore()
	const [matches, setMatches] = useState<MatchWithSets[]>([])
	const [isLoading, setIsLoading] = useState(true)

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
			await dbService.confirmMatch(matchId)
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

	const pendingRequests = matches.filter(
		m => m.status === 'pending' && m.player_2_id === currentUser?.id
	)

	const pendingSent = matches.filter(
		m => m.status === 'pending' && m.player_1_id === currentUser?.id
	)

	const confirmedMatches = matches.filter(m => m.status === 'confirmed')
	const disputedMatches = matches.filter(m => m.status === 'disputed')

	const getSetsScore = (sets: any[]) => {
		let p1 = 0
		let p2 = 0
		sets.forEach(s => {
			if (s.score_p1 > s.score_p2) p1++
			else p2++
		})
		return { p1, p2 }
	}

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
					{pendingRequests.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-xs font-bold uppercase tracking-wider text-primary">
								{t('matches.pendingTitle')} ({pendingRequests.length})
							</h3>
							<div className="space-y-3">
								{pendingRequests.map(match => {
									const { p1, p2 } = getSetsScore(match.sets)
									return (
										<div
											key={match.id}
											className="p-4 rounded-2xl bg-slate-900 border border-primary/20 shadow-md"
										>
											<div className="flex justify-between items-start mb-2">
												<span className="badge badge-primary badge-sm font-extrabold text-[10px] text-white">
													{t('matches.confirmRequest')}
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
													{match.player1?.display_name}
												</span>{' '}
												{t('matches.challenged')} {match.best_of}):
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

					<div className="space-y-2">
						<h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
							{t('matches.confirmedTitle')} ({confirmedMatches.length})
						</h3>

						{confirmedMatches.length === 0 ? (
							<div className="p-8 text-center bg-slate-900/10 rounded-2xl border border-slate-800 text-slate-500 text-sm">
								{t('matches.confirmedEmpty')}
							</div>
						) : (
							<div className="space-y-3.5">
								{confirmedMatches.map(match => {
									const { p1, p2 } = getSetsScore(match.sets)
									const isP1Winner = p1 > p2

									return (
										<div
											key={match.id}
											className="p-4 rounded-2xl bg-neutral/85 border border-slate-800/80 shadow-sm"
										>
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
																src={match.player1.avatar_url}
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
														className={`text-[10px] truncate max-w-full font-bold ${isP1Winner ? 'text-yellow-400 font-extrabold' : 'text-slate-400'}`}
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
																src={match.player2.avatar_url}
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
														className={`text-[10px] truncate max-w-full font-bold ${!isP1Winner ? 'text-yellow-400 font-extrabold' : 'text-slate-400'}`}
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
									)
								})}
							</div>
						)}
					</div>

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
		</div>
	)
}
