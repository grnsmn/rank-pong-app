import React, { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { dbService, type Profile } from '../../services/db'
import { useAppStore } from '../../store/useAppStore'
import { useDataFetch } from '../../hooks/useDataFetch'
import { useFormState } from '../../hooks/useFormState'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useSessionState } from '../../hooks/useSessionState'
import { AlertTriangle, CheckCircle2, Check, Scale, Handshake } from 'lucide-react'
import { ToggleCard } from './ToggleCard'
import { PlayerPicker } from './PlayerPicker'

interface SetInput {
	score1: string
	score2: string
}

// Chiavi sessionStorage per persistere il form durante la sessione
const SS = {
	arbitrator: 'newMatch.isArbitratorMode',
	friendly: 'newMatch.isFriendly',
	player1Id: 'newMatch.player1Id',
	player1Search: 'newMatch.player1Search',
	opponentId: 'newMatch.opponentId',
	opponentSearch: 'newMatch.opponentSearch',
	bestOf: 'newMatch.bestOf',
	sets: 'newMatch.sets',
} as const

export const NewMatchScreen: React.FC = () => {
	const { t } = useTranslation()
	const { currentUser } = useAppStore()

	const { data } = useDataFetch<Profile[]>(() =>
		dbService.getProfiles().then(ps => ps.filter(p => p.id !== currentUser?.id))
	)
	const profiles = data ?? []

	const {
		isSaving: isLoading,
		formError: errorMsg,
		successMsg,
		setFormError: setErrorMsg,
		setIsSaving: setIsLoading,
		setSuccessMsg,
	} = useFormState()

	const [isArbitratorMode, setIsArbitratorMode] = useSessionState(SS.arbitrator, false)
	const [isFriendly, setIsFriendly] = useSessionState(SS.friendly, false)
	const [player1Id, setPlayer1Id] = useSessionState(SS.player1Id, '')
	const [player1Search, setPlayer1Search] = useSessionState(SS.player1Search, '')
	const [showPlayer1Dropdown, setShowPlayer1Dropdown] = useState(false)
	const player1Ref = useRef<HTMLDivElement>(null)
	const [opponentId, setOpponentId] = useSessionState(SS.opponentId, '')
	const [opponentSearch, setOpponentSearch] = useSessionState(SS.opponentSearch, '')
	const [showOpponentDropdown, setShowOpponentDropdown] = useState(false)
	const opponentRef = useRef<HTMLDivElement>(null)
	const [bestOf, setBestOf] = useSessionState<3 | 5>(SS.bestOf, 3)
	const [sets, setSets] = useSessionState<SetInput[]>(SS.sets, [{ score1: '', score2: '' }])

	useClickOutside(player1Ref, () => setShowPlayer1Dropdown(false))
	useClickOutside(opponentRef, () => setShowOpponentDropdown(false))

	const validateSet = (
		score1: number,
		score2: number
	): { isValid: boolean; winner: 1 | 2 | null; error?: string } => {
		if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
			return { isValid: false, winner: null, error: t('newMatch.errorPositive') }
		}

		if (score1 < 11 && score2 < 11) {
			return { isValid: false, winner: null, error: t('newMatch.errorMin11') }
		}

		const diff = Math.abs(score1 - score2)
		if (diff < 2) {
			return { isValid: false, winner: null, error: t('newMatch.errorMargin') }
		}

		if (score1 >= 11 && score1 - score2 >= 2) {
			if (score1 > 11 && score1 - score2 > 2) {
				return {
					isValid: false,
					winner: null,
					error: t('newMatch.errorTiebreak', { example: `${score2 + 2}-${score2}` }),
				}
			}
			return { isValid: true, winner: 1 }
		}

		if (score2 >= 11 && score2 - score1 >= 2) {
			if (score2 > 11 && score2 - score1 > 2) {
				return {
					isValid: false,
					winner: null,
					error: t('newMatch.errorTiebreak', { example: `${score1 + 2}-${score1}` }),
				}
			}
			return { isValid: true, winner: 2 }
		}

		return { isValid: false, winner: null }
	}

	const getMatchStatus = () => {
		let setsWonP1 = 0
		let setsWonP2 = 0
		let allSetsValid = true
		const errors: string[] = []

		sets.forEach((set, index) => {
			const s1 = parseInt(set.score1)
			const s2 = parseInt(set.score2)

			if (set.score1 === '' || set.score2 === '') {
				allSetsValid = false
				return
			}

			const val = validateSet(s1, s2)
			if (!val.isValid) {
				allSetsValid = false
				if (val.error) errors.push(`${t('common.set')} ${index + 1}: ${val.error}`)
			} else {
				if (val.winner === 1) setsWonP1++
				if (val.winner === 2) setsWonP2++
			}
		})

		const targetWins = bestOf === 3 ? 2 : 3
		const matchFinished = setsWonP1 === targetWins || setsWonP2 === targetWins
		const tooManySets = setsWonP1 + setsWonP2 > (bestOf === 3 ? 3 : 5)

		let excessSets = false
		let accumulatedWins1 = 0
		let accumulatedWins2 = 0
		sets.forEach(set => {
			if (accumulatedWins1 === targetWins || accumulatedWins2 === targetWins) {
				excessSets = true
			}
			const s1 = parseInt(set.score1)
			const s2 = parseInt(set.score2)
			const val = validateSet(s1, s2)
			if (val.isValid) {
				if (val.winner === 1) accumulatedWins1++
				if (val.winner === 2) accumulatedWins2++
			}
		})

		const playersValid = isArbitratorMode
			? player1Id !== '' && opponentId !== '' && player1Id !== opponentId
			: opponentId !== ''

		return {
			setsWonP1,
			setsWonP2,
			allSetsValid,
			matchFinished,
			tooManySets,
			excessSets,
			errors,
			canSubmit: allSetsValid && matchFinished && !tooManySets && !excessSets && playersValid,
		}
	}

	const status = getMatchStatus()

	const handleSetChange = (index: number, player: 1 | 2, value: string) => {
		if (value !== '' && !/^\d+$/.test(value)) return

		const newSets = [...sets]
		if (player === 1) newSets[index].score1 = value
		else newSets[index].score2 = value

		setSets(newSets)
		setErrorMsg(null)
	}

	const addSetRow = () => {
		if (sets.length >= (bestOf === 3 ? 3 : 5)) return
		setSets([...sets, { score1: '', score2: '' }])
	}

	const removeLastSetRow = () => {
		if (sets.length <= 1) return
		setSets(sets.slice(0, -1))
	}

	const handleBestOfChange = (val: 3 | 5) => {
		setBestOf(val)
		setSets([{ score1: '', score2: '' }])
		setErrorMsg(null)
	}

	const handleArbitratorToggle = () => {
		setIsArbitratorMode(prev => !prev)
		setPlayer1Id('')
		setPlayer1Search('')
		setOpponentId('')
		setOpponentSearch('')
		setSets([{ score1: '', score2: '' }])
		setErrorMsg(null)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setErrorMsg(null)
		setSuccessMsg(null)

		if (isArbitratorMode) {
			if (!player1Id) {
				setErrorMsg(t('newMatch.errorNoPlayer1'))
				return
			}
			if (!opponentId) {
				setErrorMsg(t('newMatch.errorNoOpponent'))
				return
			}
			if (player1Id === opponentId) {
				setErrorMsg(t('newMatch.errorSamePlayers'))
				return
			}
		} else if (!opponentId) {
			setErrorMsg(t('newMatch.errorNoOpponent'))
			return
		}

		if (!status.canSubmit) {
			setErrorMsg(t('newMatch.errorInvalidScore'))
			return
		}

		setIsLoading(true)
		try {
			const formattedScores = sets.map((set, idx) => ({
				set_number: idx + 1,
				score_p1: parseInt(set.score1),
				score_p2: parseInt(set.score2),
			}))

			const finalPlayer1Id = isArbitratorMode ? player1Id : currentUser?.id || ''
			await dbService.createMatch(
				finalPlayer1Id,
				opponentId,
				bestOf,
				formattedScores,
				isFriendly
			)

			setSuccessMsg(
				isFriendly
					? t('newMatch.friendlySuccess')
					: isArbitratorMode
						? t('newMatch.arbitratorSuccess')
						: t('newMatch.successSubmit')
			)
			setPlayer1Id('')
			setPlayer1Search('')
			setOpponentId('')
			setSets([{ score1: '', score2: '' }])
		} catch (err: any) {
			setErrorMsg(err.message || t('newMatch.errorSave'))
		} finally {
			setIsLoading(false)
		}
	}

	const selectedOpponent = profiles.find(p => p.id === opponentId)
	const selectedPlayer1 = profiles.find(p => p.id === player1Id)

	const filteredOpponentProfiles = profiles.filter(p => {
		if (isArbitratorMode && p.id === player1Id) return false
		const q = opponentSearch.toLowerCase()
		return p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
	})

	const filteredPlayer1Profiles = profiles.filter(p => {
		if (p.id === opponentId) return false
		const q = player1Search.toLowerCase()
		return p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
	})

	const playersSelected = isArbitratorMode
		? player1Id !== '' && opponentId !== ''
		: opponentId !== ''

	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			<div className="px-4 pt-6 pb-2">
				<h2 className="text-xl font-bold tracking-tight text-white mb-1">
					{t('newMatch.title')}
				</h2>
				<p className="text-xs text-slate-400">{t('newMatch.subtitle')}</p>
			</div>

			<div className="flex-1 overflow-y-auto px-4 pb-24">
				<form onSubmit={handleSubmit} className="space-y-4 pt-3">
					<ToggleCard
						icon={Scale}
						label={t('newMatch.arbitratorToggle')}
						description={t('newMatch.arbitratorToggleDesc')}
						checked={isArbitratorMode}
						onChange={handleArbitratorToggle}
						accent="purple"
					/>

					<ToggleCard
						icon={Handshake}
						label={t('newMatch.friendlyToggle')}
						description={t('newMatch.friendlyToggleDesc')}
						checked={isFriendly}
						onChange={() => setIsFriendly(prev => !prev)}
						accent="sky"
					/>

					{isArbitratorMode && (
						<PlayerPicker
							containerRef={player1Ref}
							label={t('newMatch.stepPlayer1')}
							placeholder={
								selectedPlayer1
									? `${selectedPlayer1.display_name} (@${selectedPlayer1.username}) — ${selectedPlayer1.elo_rating} ${t('common.elo')}`
									: t('newMatch.player1Placeholder')
							}
							searchValue={player1Search}
							onSearchChange={value => {
								setPlayer1Search(value)
								setPlayer1Id('')
								setShowPlayer1Dropdown(true)
							}}
							showDropdown={showPlayer1Dropdown}
							onFocus={() => setShowPlayer1Dropdown(true)}
							profiles={filteredPlayer1Profiles}
							selectedId={player1Id}
							onSelect={id => {
								setPlayer1Id(id)
								setPlayer1Search('')
								setShowPlayer1Dropdown(false)
							}}
							noResultsLabel={t('newMatch.noPlayersFound')}
							eloLabel={t('common.elo')}
						/>
					)}

					<PlayerPicker
						containerRef={opponentRef}
						label={
							isArbitratorMode
								? t('newMatch.stepPlayer2')
								: t('newMatch.stepOpponent')
						}
						placeholder={
							selectedOpponent
								? `${selectedOpponent.display_name} (@${selectedOpponent.username}) — ${selectedOpponent.elo_rating} ${t('common.elo')}`
								: isArbitratorMode
									? t('newMatch.player2Placeholder')
									: t('newMatch.opponentPlaceholder')
						}
						searchValue={opponentSearch}
						onSearchChange={value => {
							setOpponentSearch(value)
							setOpponentId('')
							setShowOpponentDropdown(true)
						}}
						showDropdown={showOpponentDropdown}
						onFocus={() => setShowOpponentDropdown(true)}
						profiles={filteredOpponentProfiles}
						selectedId={opponentId}
						onSelect={id => {
							setOpponentId(id)
							setOpponentSearch('')
							setShowOpponentDropdown(false)
						}}
						noResultsLabel={t('newMatch.noPlayersFound')}
						eloLabel={t('common.elo')}
					/>

					<div className="p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20">
						<label className="label py-0 mb-2">
							<span className="label-text text-xs text-slate-300 font-bold tracking-wide">
								{t('newMatch.stepFormat')}
							</span>
						</label>
						<div className="flex gap-2">
							{([3, 5] as const).map(n => (
								<button
									key={n}
									type="button"
									onClick={() => handleBestOfChange(n)}
									className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-all ${
										bestOf === n
											? 'bg-primary text-white shadow-md shadow-primary/30'
											: 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
									}`}
								>
									<span className="font-bold text-xs uppercase tracking-wider">
										{n === 3
											? t('newMatch.bestOf3Label')
											: t('newMatch.bestOf5Label')}
									</span>
									{bestOf === n && (
										<Check className="w-3.5 h-3.5" strokeWidth={3} />
									)}
								</button>
							))}
						</div>
						<p className="text-[10px] text-slate-500 mt-2 text-center">
							{bestOf === 3
								? t('newMatch.bestOf3Description')
								: t('newMatch.bestOf5Description')}
						</p>
					</div>

					{playersSelected && (
						<div className="p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20 space-y-4">
							<div className="flex justify-between items-center pb-2 border-b border-white/5">
								<span className="text-xs font-bold text-slate-300 tracking-wide">
									{t('newMatch.stepScores')}
								</span>
								<span className="text-[10px] text-slate-500 font-semibold uppercase">
									{isArbitratorMode
										? `${selectedPlayer1?.display_name.split(' ')[0]} ${t('newMatch.vsLabel')} ${selectedOpponent?.display_name.split(' ')[0]}`
										: `${t('newMatch.youVs')} ${selectedOpponent?.display_name.split(' ')[0]}`}
								</span>
							</div>

							<div className="space-y-3.5">
								{sets.map((set, index) => {
									const s1 = parseInt(set.score1)
									const s2 = parseInt(set.score2)
									const setVal = validateSet(s1, s2)

									return (
										<div
											key={index}
											className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl"
										>
											<span className="text-xs font-black text-slate-400 w-12 shrink-0">
												{t('common.set')} {index + 1}
											</span>

											<input
												type="text"
												pattern="\d*"
												placeholder={
													isArbitratorMode
														? (selectedPlayer1?.display_name.split(
																' '
															)[0] ?? 'P1')
														: t('common.you')
												}
												className="input input-sm w-full bg-slate-950 border-none rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none text-center font-bold text-sm h-9"
												value={set.score1}
												onChange={e =>
													handleSetChange(index, 1, e.target.value)
												}
												required
											/>

											<span className="text-slate-500 font-black text-sm">
												-
											</span>

											<input
												type="text"
												pattern="\d*"
												placeholder={
													isArbitratorMode
														? (selectedOpponent?.display_name.split(
																' '
															)[0] ?? 'P2')
														: t('common.opponent')
												}
												className="input input-sm w-full bg-slate-950 border-none rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none text-center font-bold text-sm h-9"
												value={set.score2}
												onChange={e =>
													handleSetChange(index, 2, e.target.value)
												}
												required
											/>

											<div className="w-16 shrink-0 text-center">
												{set.score1 !== '' &&
													set.score2 !== '' &&
													(setVal.isValid ? (
														<span
															className={`text-[10px] font-black uppercase ${setVal.winner === 1 ? 'text-success' : 'text-error'}`}
														>
															{setVal.winner === 1
																? t('common.won')
																: t('common.lost')}
														</span>
													) : (
														<span className="text-[9px] text-warning font-semibold">
															{t('common.invalid')}
														</span>
													))}
											</div>
										</div>
									)
								})}
							</div>

							<div className="flex gap-2">
								{sets.length < (bestOf === 3 ? 3 : 5) && !status.matchFinished && (
									<button
										type="button"
										onClick={addSetRow}
										className="btn btn-sm flex-1 text-xs font-bold border-none bg-primary/15 text-primary hover:bg-primary/25"
									>
										{t('newMatch.nextSet')}
									</button>
								)}
								{sets.length > 1 && (
									<button
										type="button"
										onClick={removeLastSetRow}
										className="btn btn-sm text-xs font-bold w-12 border-none bg-error/15 text-error hover:bg-error/25"
										title={t('newMatch.removeLastSet')}
									>
										{t('newMatch.removeSet')}
									</button>
								)}
							</div>
						</div>
					)}

					{status.errors.length > 0 && playersSelected && (
						<div className="p-3 bg-warning/10 text-warning rounded-xl text-xs space-y-1">
							<div className="flex items-center gap-1.5 font-bold mb-1">
								<AlertTriangle className="w-4 h-4" /> {t('newMatch.scoreErrors')}
							</div>
							{status.errors.map((err, i) => (
								<div key={i}>• {err}</div>
							))}
						</div>
					)}

					{playersSelected && (
						<div className="p-4 rounded-2xl bg-slate-900/60 shadow-md shadow-black/20 space-y-2">
							<div className="flex justify-between items-center text-xs">
								<span>
									{isArbitratorMode
										? `${t('newMatch.opponentSets')} ${selectedPlayer1?.display_name.split(' ')[0]}:`
										: t('newMatch.yourSets')}
								</span>
								<span className="font-extrabold text-success">
									{status.setsWonP1}
								</span>
							</div>
							<div className="flex justify-between items-center text-xs">
								<span>
									{t('newMatch.opponentSets')}{' '}
									{selectedOpponent?.display_name.split(' ')[0]}:
								</span>
								<span className="font-extrabold text-error">
									{status.setsWonP2}
								</span>
							</div>

							<div className="pt-2 border-t border-white/5 flex items-center justify-between">
								<span className="text-xs font-bold">
									{t('newMatch.matchStatus')}
								</span>
								{status.matchFinished ? (
									status.excessSets ? (
										<span className="text-xs text-error font-extrabold">
											{t('newMatch.statusExcess')}
										</span>
									) : (
										<span className="text-xs text-success font-black flex items-center gap-1">
											<CheckCircle2 className="w-4 h-4" />{' '}
											{t('newMatch.statusReady')}
										</span>
									)
								) : (
									<span className="text-xs text-yellow-500 font-bold">
										{t('newMatch.statusInProgress')}
									</span>
								)}
							</div>
						</div>
					)}

					{errorMsg && (
						<div className="alert alert-error text-sm py-2 px-3 shadow-md">
							<AlertTriangle className="w-5 h-5" />
							<span>{errorMsg}</span>
						</div>
					)}

					{successMsg && (
						<div className="alert alert-success text-sm py-2 px-3 shadow-md">
							<CheckCircle2 className="w-5 h-5 text-white" />
							<span className="text-white">{successMsg}</span>
						</div>
					)}

					<button
						type="submit"
						disabled={!status.canSubmit || isLoading}
						className={`btn w-full font-bold uppercase tracking-wider rounded-2xl border-none text-white py-3.5 h-auto ${
							status.canSubmit && !isLoading
								? 'bg-orange-500 hover:bg-orange-400 shadow-lg shadow-orange-500/25'
								: 'bg-slate-700 text-slate-500 cursor-not-allowed'
						} ${isLoading ? 'loading' : ''}`}
					>
						{t('newMatch.submitButton')}
					</button>
				</form>
			</div>
		</div>
	)
}
