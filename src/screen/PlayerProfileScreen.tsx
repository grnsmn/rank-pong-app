import React from 'react'
import { useTranslation } from 'react-i18next'
import { dbService, type Profile } from '../services/db'
import { useDataFetch } from '../hooks/useDataFetch'
import { useMatchStats } from '../hooks/useMatchStats'
import { ArrowLeft, User, Percent, Flame, Calendar, Trophy } from 'lucide-react'

interface Props {
	playerId: string
	onBack: () => void
}

export const PlayerProfileScreen: React.FC<Props> = ({ playerId, onBack }) => {
	const { t } = useTranslation()

	const { data: profile, isLoading: profileLoading } = useDataFetch(() =>
		dbService.getProfile(playerId)
	)
	const { data: allMatches, isLoading: matchesLoading } = useDataFetch(() =>
		dbService.getMatches()
	)
	const { data: profiles } = useDataFetch(() => dbService.getProfiles())

	const matches = allMatches ?? []

	const profilesMap = (profiles ?? []).reduce<Record<string, Profile>>((acc, p) => {
		acc[p.id] = p
		return acc
	}, {})

	const stats = useMatchStats(matches, playerId)

	const recentMatches = matches
		.filter(
			m =>
				m.status === 'confirmed' &&
				(m.player_1_id === playerId || m.player_2_id === playerId)
		)
		.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		.slice(0, 5)

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

	if (profileLoading || matchesLoading) {
		return (
			<div className="flex flex-col h-full bg-base-100 text-white">
				<div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-slate-800 shrink-0">
					<button
						onClick={onBack}
						className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-white"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<span className="loading loading-spinner loading-md text-primary"></span>
				</div>
			</div>
		)
	}

	if (!profile) return null

	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			{/* Header */}
			<div className="flex items-center gap-3 px-4 pt-6 pb-4 shrink-0">
				<button
					onClick={onBack}
					className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-white"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>
				<div>
					<h2 className="text-xl font-bold tracking-tight text-white">
						{t('playerProfile.title')}
					</h2>
					<p className="text-xs text-slate-400">{t('playerProfile.subtitle')}</p>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-4 pb-24 space-y-5">
				{/* Card profilo */}
				<div className="p-5 rounded-2xl bg-neutral border border-slate-800 flex flex-col items-center text-center shadow-lg">
					<div className="relative mb-3">
						<div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800 border-2 border-primary flex items-center justify-center shadow-md">
							{profile.avatar_url ? (
								<img
									src={profile.avatar_url}
									alt=""
									className="w-full h-full object-cover"
								/>
							) : (
								<User className="w-10 h-10 text-slate-500" />
							)}
						</div>
						<span className="absolute -bottom-1 -right-1 badge badge-primary font-black px-2.5 py-1.5 shadow-sm text-[10px] text-white uppercase">
							{getPlayerTypeLabel(profile.player_type)}
						</span>
					</div>

					<h3 className="text-lg font-black text-slate-100">{profile.display_name}</h3>
					<p className="text-xs text-slate-400">
						@{profile.username}
						{profile.age != null && ` • ${profile.age} ${t('common.years')}`}
					</p>

					<div className="mt-4 px-6 py-2.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center">
						<span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
							{t('profile.currentScore')}
						</span>
						<span className="text-3xl font-black text-primary">
							{profile.elo_rating}
						</span>
						<span className="text-[10px] text-slate-400 font-medium">
							{t('profile.eloRank')}
						</span>
					</div>
				</div>

				{/* Statistiche */}
				{stats && stats.totalMatches > 0 ? (
					<div className="space-y-4">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
							{t('profile.statsTitle')}
						</h4>
						<div className="grid grid-cols-2 gap-3.5">
							<div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
								<span className="text-slate-500 font-bold text-[10px] uppercase flex items-center gap-1.5">
									<Calendar className="w-3.5 h-3.5 text-primary" />
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

							<div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
								<span className="text-slate-500 font-bold text-[10px] uppercase flex items-center gap-1.5">
									<Percent className="w-3.5 h-3.5 text-success" />
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

							<div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
								<span className="text-slate-500 font-bold text-[10px] uppercase flex items-center gap-1.5">
									<Trophy className="w-3.5 h-3.5 text-amber-500" />
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

							<div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
								<span className="text-slate-500 font-bold text-[10px] uppercase flex items-center gap-1.5">
									<Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/10" />
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
				) : (
					<p className="text-sm text-slate-500 text-center py-4">
						{t('playerProfile.noStats')}
					</p>
				)}

				{/* Partite recenti */}
				{recentMatches.length > 0 && (
					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
							{t('playerProfile.recentMatches')}
						</h4>
						<div className="bg-slate-900/20 rounded-2xl border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
							{recentMatches.map(match => {
								const isPlayer1 = match.player_1_id === playerId
								const opponentId = isPlayer1 ? match.player_2_id : match.player_1_id
								const opponent = profilesMap[opponentId]

								let setsWonP1 = 0
								let setsWonP2 = 0
								match.sets.forEach(set => {
									if (set.score_p1 > set.score_p2) setsWonP1++
									else setsWonP2++
								})
								const playerSets = isPlayer1 ? setsWonP1 : setsWonP2
								const opponentSets = isPlayer1 ? setsWonP2 : setsWonP1
								const won = playerSets > opponentSets

								const date = new Date(match.created_at)
								const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`

								return (
									<div
										key={match.id}
										className="flex items-center justify-between p-3.5"
									>
										<div className="flex items-center gap-3 min-w-0">
											<div
												className={`w-1.5 h-8 rounded-full shrink-0 ${won ? 'bg-success' : 'bg-error'}`}
											/>
											<div className="min-w-0">
												<div className="text-xs font-bold text-slate-300 truncate">
													{t('playerProfile.vsLabel')}{' '}
													{opponent?.display_name ??
														`@${opponentId.slice(0, 8)}`}
												</div>
												<div className="text-[10px] text-slate-500">
													{dateStr}
												</div>
											</div>
										</div>
										<div className="flex flex-col items-end shrink-0 gap-1">
											<span
												className={`text-xs font-extrabold ${won ? 'text-success' : 'text-error'}`}
											>
												{playerSets}–{opponentSets}
											</span>
											<span
												className={`badge badge-xs font-bold uppercase text-white ${won ? 'badge-success' : 'badge-error'}`}
											>
												{won
													? t('playerProfile.matchWon')
													: t('playerProfile.matchLost')}
											</span>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
