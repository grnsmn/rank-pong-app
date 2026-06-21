import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { dbService, type MatchWithSets } from '../services/db'
import { useAppStore } from '../store/useAppStore'
import {
	User,
	LogOut,
	Percent,
	Flame,
	Calendar,
	Trophy,
	Pencil,
	X,
	Check,
	ChevronDown,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Tipi locali
// ---------------------------------------------------------------------------
type PlayerType = 'amateur' | 'competitive' | 'student'

interface EditForm {
	display_name: string
	age: string
	player_type: PlayerType
}

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------
export const ProfileScreen: React.FC = () => {
	const { t } = useTranslation()
	const { currentProfile, logout, updateProfile } = useAppStore()
	const [matches, setMatches] = useState<MatchWithSets[]>([])
	const [isLoading, setIsLoading] = useState(true)

	// --- stato modifica profilo ---
	const [isEditing, setIsEditing] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)
	const [successMsg, setSuccessMsg] = useState<string | null>(null)
	const [form, setForm] = useState<EditForm>({
		display_name: '',
		age: '',
		player_type: 'amateur',
	})

	const fetchStats = async () => {
		setIsLoading(true)
		try {
			const data = await dbService.getMatches()
			setMatches(data)
		} catch (err) {
			console.error('Errore caricamento statistiche match:', err)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchStats()
	}, [])

	// Sincronizza il form ogni volta che si apre l'editor
	const openEditor = () => {
		if (!currentProfile) return
		setForm({
			display_name: currentProfile.display_name,
			age: currentProfile.age != null ? String(currentProfile.age) : '',
			player_type: currentProfile.player_type,
		})
		setFormError(null)
		setSuccessMsg(null)
		setIsEditing(true)
	}

	const closeEditor = () => {
		setIsEditing(false)
		setFormError(null)
	}

	const handleSave = async () => {
		setFormError(null)

		const trimmedName = form.display_name.trim()
		if (!trimmedName) {
			setFormError(t('profile.editErrorDisplayName'))
			return
		}

		const ageNum = form.age.trim() === '' ? null : Number(form.age)
		if (form.age.trim() !== '' && (isNaN(ageNum!) || ageNum! < 5 || ageNum! > 120)) {
			setFormError(t('profile.editErrorAge'))
			return
		}

		setIsSaving(true)
		try {
			await updateProfile({
				display_name: trimmedName,
				age: ageNum,
				player_type: form.player_type,
			})
			setSuccessMsg(t('profile.editSuccess'))
			setIsEditing(false)
			// Mostra il toast di successo per 3 secondi
			setTimeout(() => setSuccessMsg(null), 3000)
		} catch {
			setFormError(t('profile.editError'))
		} finally {
			setIsSaving(false)
		}
	}

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------
	const getPlayerTypeLabel = (type?: string) => {
		switch (type) {
			case 'competitive':
				return t('profile.typeCompetitive')
			case 'student':
				return t('profile.typeStudent')
			default:
				return t('profile.typeAmateur')
		}
	}

	const calculatePlayerStats = () => {
		if (!currentProfile) return null

		const myConfirmedMatches = matches.filter(
			m =>
				m.status === 'confirmed' &&
				(m.player_1_id === currentProfile.id || m.player_2_id === currentProfile.id)
		)

		const totalMatches = myConfirmedMatches.length
		let wins = 0
		let losses = 0
		let totalSetsWon = 0
		let totalSetsLost = 0

		const sortedMatches = [...myConfirmedMatches].sort(
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)

		let streak = 0
		let streakBroken = false

		sortedMatches.forEach(match => {
			const isPlayer1 = match.player_1_id === currentProfile.id

			let setsWonP1 = 0
			let setsWonP2 = 0
			match.sets.forEach(set => {
				if (set.score_p1 > set.score_p2) setsWonP1++
				else setsWonP2++
			})

			const playerWon = isPlayer1 ? setsWonP1 > setsWonP2 : setsWonP2 > setsWonP1

			if (playerWon) {
				wins++
				if (!streakBroken) streak++
			} else {
				losses++
				streakBroken = true
			}

			totalSetsWon += isPlayer1 ? setsWonP1 : setsWonP2
			totalSetsLost += isPlayer1 ? setsWonP2 : setsWonP1
		})

		const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
		const setRatio =
			totalSetsWon + totalSetsLost > 0
				? Math.round((totalSetsWon / (totalSetsWon + totalSetsLost)) * 100)
				: 0

		return {
			totalMatches,
			wins,
			losses,
			winRate,
			totalSetsWon,
			totalSetsLost,
			setRatio,
			streak,
		}
	}

	const stats = calculatePlayerStats()

	if (!currentProfile) {
		return (
			<div className="flex items-center justify-center h-full text-white bg-base-100">
				<span className="loading loading-spinner loading-md"></span>
			</div>
		)
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------
	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			<div className="px-4 pt-6 pb-2">
				<h2 className="text-xl font-bold tracking-tight text-white mb-1">
					{t('profile.title')}
				</h2>
				<p className="text-xs text-slate-400">{t('profile.subtitle')}</p>
			</div>

			{/* Toast successo */}
			{successMsg && (
				<div className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-success/10 border border-success/30 flex items-center gap-2 text-success text-sm font-medium animate-fade-in">
					<Check className="w-4 h-4 shrink-0" />
					{successMsg}
				</div>
			)}

			<div className="flex-1 overflow-y-auto px-4 pb-24 space-y-5">
				{/* --- Card profilo --- */}
				<div className="p-5 rounded-2xl bg-neutral border border-slate-800 flex flex-col items-center text-center shadow-lg">
					<div className="relative mb-3">
						<div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800 border-2 border-primary flex items-center justify-center shadow-md">
							{currentProfile.avatar_url ? (
								<img
									src={currentProfile.avatar_url}
									alt=""
									className="w-full h-full object-cover"
								/>
							) : (
								<User className="w-10 h-10 text-slate-500" />
							)}
						</div>
						<span className="absolute -bottom-1 -right-1 badge badge-primary font-black px-2.5 py-1.5 shadow-sm text-[10px] text-white uppercase">
							{getPlayerTypeLabel(currentProfile.player_type)}
						</span>
					</div>

					<h3 className="text-lg font-black text-slate-100">
						{currentProfile.display_name}
					</h3>
					<p className="text-xs text-slate-400">
						@{currentProfile.username}
						{currentProfile.age != null &&
							` • ${currentProfile.age} ${t('common.years')}`}
					</p>

					<div className="mt-4 px-6 py-2.5 bg-slate-950 rounded-2xl border border-slate-850 flex flex-col items-center">
						<span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
							{t('profile.currentScore')}
						</span>
						<span className="text-3xl font-black text-primary">
							{currentProfile.elo_rating}
						</span>
						<span className="text-[10px] text-slate-400 font-medium">
							{t('profile.eloRank')}
						</span>
					</div>

					{/* Bottone modifica */}
					<button
						id="profile-edit-btn"
						onClick={openEditor}
						className="mt-4 btn btn-sm btn-outline border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-600 gap-1.5 rounded-xl w-full"
					>
						<Pencil className="w-3.5 h-3.5" />
						{t('profile.editButton')}
					</button>
				</div>

				{/* --- Pannello modifica profilo --- */}
				{isEditing && (
					<div className="rounded-2xl bg-neutral border border-primary/30 shadow-lg overflow-hidden animate-fade-in">
						{/* Header */}
						<div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
							<span className="text-sm font-bold text-white flex items-center gap-2">
								<Pencil className="w-3.5 h-3.5 text-primary" />
								{t('profile.editTitle')}
							</span>
							<button
								onClick={closeEditor}
								className="btn btn-ghost btn-xs btn-circle text-slate-400 hover:text-white"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Campi form */}
						<div className="px-5 py-4 space-y-4">
							{/* Display name */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
									{t('profile.editDisplayName')}
								</label>
								<input
									id="profile-edit-display-name"
									type="text"
									value={form.display_name}
									onChange={e =>
										setForm(prev => ({ ...prev, display_name: e.target.value }))
									}
									placeholder={t('profile.editDisplayNamePlaceholder')}
									className="input input-sm bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-primary focus:outline-none rounded-xl w-full"
								/>
							</div>

							{/* Età */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
									{t('profile.editAge')}
								</label>
								<input
									id="profile-edit-age"
									type="number"
									min={5}
									max={120}
									value={form.age}
									onChange={e =>
										setForm(prev => ({ ...prev, age: e.target.value }))
									}
									placeholder={t('profile.editAgePlaceholder')}
									className="input input-sm bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-primary focus:outline-none rounded-xl w-full"
								/>
							</div>

							{/* Tipo giocatore */}
							<div className="flex flex-col gap-1.5">
								<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
									{t('profile.editPlayerType')}
								</label>
								<div className="relative">
									<select
										id="profile-edit-player-type"
										value={form.player_type}
										onChange={e =>
											setForm(prev => ({
												...prev,
												player_type: e.target.value as PlayerType,
											}))
										}
										className="select select-sm bg-slate-900 border-slate-700 text-white focus:border-primary focus:outline-none rounded-xl w-full appearance-none pr-8"
									>
										<option value="amateur">{t('playerType.amateur')}</option>
										<option value="competitive">
											{t('playerType.competitive')}
										</option>
										<option value="student">{t('playerType.student')}</option>
									</select>
									<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
								</div>
							</div>

							{/* Messaggio di errore */}
							{formError && (
								<p className="text-xs text-error font-medium flex items-center gap-1.5">
									<X className="w-3.5 h-3.5 shrink-0" />
									{formError}
								</p>
							)}

							{/* Azioni */}
							<div className="flex gap-2 pt-1">
								<button
									onClick={closeEditor}
									disabled={isSaving}
									className="btn btn-sm btn-ghost flex-1 rounded-xl text-slate-400 hover:text-white border border-slate-700"
								>
									{t('profile.editCancel')}
								</button>
								<button
									id="profile-edit-save-btn"
									onClick={handleSave}
									disabled={isSaving}
									className="btn btn-sm btn-primary flex-1 rounded-xl font-bold gap-1.5"
								>
									{isSaving ? (
										<>
											<span className="loading loading-spinner loading-xs" />
											{t('profile.editSaving')}
										</>
									) : (
										<>
											<Check className="w-3.5 h-3.5" />
											{t('profile.editSave')}
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				)}

				{/* --- Statistiche --- */}
				{isLoading ? (
					<div className="flex justify-center p-4">
						<span className="loading loading-spinner loading-sm text-primary"></span>
					</div>
				) : stats ? (
					<div className="space-y-4">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
							{t('profile.statsTitle')}
						</h4>

						<div className="grid grid-cols-2 gap-3.5">
							<div className="p-4 rounded-xl bg-slate-900 border border-slate-850 flex flex-col justify-between">
								<span className="text-slate-500 font-bold text-[10px] uppercase flex items-center gap-1.5">
									<Calendar className="w-3.5 h-3.5 text-primary" />{' '}
									{t('profile.matches')}
								</span>
								<div className="mt-2.5">
									<span className="text-2xl font-black text-white">
										{stats.totalMatches}
									</span>
									<p className="text-[10px] text-slate-500 font-medium mt-0.5">
										{t('profile.matchesSubtitle')}
									</p>
								</div>
							</div>

							<div className="p-4 rounded-xl bg-slate-900 border border-slate-850 flex flex-col justify-between">
								<span className="text-slate-500 font-bold text-[10px] uppercase flex items-center gap-1.5">
									<Percent className="w-3.5 h-3.5 text-success" />{' '}
									{t('profile.winRate')}
								</span>
								<div className="mt-2.5">
									<span className="text-2xl font-black text-success">
										{stats.winRate}%
									</span>
									<p className="text-[10px] text-slate-500 font-medium mt-0.5">
										{stats.wins} {t('profile.winRateSubtitle')} {stats.losses}
									</p>
								</div>
							</div>

							<div className="p-4 rounded-xl bg-slate-900 border border-slate-850 flex flex-col justify-between">
								<span className="text-slate-500 font-bold text-[10px] uppercase flex items-center gap-1.5">
									<Trophy className="w-3.5 h-3.5 text-amber-500" />{' '}
									{t('profile.setRatio')}
								</span>
								<div className="mt-2.5">
									<span className="text-2xl font-black text-amber-500">
										{stats.setRatio}%
									</span>
									<p className="text-[10px] text-slate-500 font-medium mt-0.5">
										{stats.totalSetsWon} {t('profile.setRatioSubtitle')}{' '}
										{stats.totalSetsLost}
									</p>
								</div>
							</div>

							<div className="p-4 rounded-xl bg-slate-900 border border-slate-850 flex flex-col justify-between">
								<span className="text-slate-500 font-bold text-[10px] uppercase flex items-center gap-1.5">
									<Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/10" />{' '}
									{t('profile.streak')}
								</span>
								<div className="mt-2.5">
									<span className="text-2xl font-black text-orange-500">
										{stats.streak}{' '}
										{stats.streak === 1
											? t('profile.streakUnit')
											: t('profile.streakUnits')}
									</span>
									<p className="text-[10px] text-slate-500 font-medium mt-0.5">
										{t('profile.streakSubtitle')}
									</p>
								</div>
							</div>
						</div>
					</div>
				) : null}

				{/* --- Logout --- */}
				<div className="pt-2">
					<button
						onClick={() => {
							if (confirm(t('profile.logoutConfirm'))) logout()
						}}
						className="btn btn-outline btn-error btn-sm w-full font-bold flex items-center justify-center gap-1.5 py-2.5 h-10 rounded-xl"
					>
						<LogOut className="w-4 h-4" /> {t('profile.logoutButton')}
					</button>
				</div>
			</div>
		</div>
	)
}
