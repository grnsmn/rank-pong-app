import React from 'react'
import { useTranslation } from 'react-i18next'
import { dbService, type Profile } from '../services/db'
import { useDataFetch } from '../hooks/useDataFetch'
import { useSearch } from '../hooks/useSearch'
import { Trophy, Medal, Search, User } from 'lucide-react'
import { TruncatedName } from './Leaderboard/TruncatedName'
import { PodiumSection } from './Leaderboard/PodiumSection'

interface Props {
	onPlayerSelect?: (playerId: string) => void
}

export const LeaderboardScreen: React.FC<Props> = ({ onPlayerSelect }) => {
	const { t } = useTranslation()

	const { data, isLoading } = useDataFetch(() => dbService.getProfiles(), {
		refetchOnFocus: true,
	})
	const profiles = data ?? []

	const {
		search,
		setSearch,
		filtered: filteredProfiles,
	} = useSearch<Profile>(
		profiles,
		(p, q) => p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
	)

	const getPlayerTypeLabel = (type: string) => {
		switch (type) {
			case 'competitive':
				return (
					<span className="text-[9px] uppercase font-bold tracking-wide text-violet-400">
						{t('playerType.competitive')}
					</span>
				)
			case 'student':
				return (
					<span className="text-[9px] uppercase font-bold tracking-wide text-info">
						{t('playerType.student')}
					</span>
				)
			default:
				return (
					<span className="text-[9px] uppercase font-bold tracking-wide text-sky-400">
						{t('playerType.amateur')}
					</span>
				)
		}
	}

	const getPositionIcon = (index: number) => {
		switch (index) {
			case 0:
				return <Trophy className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
			case 1:
				return <Medal className="w-5 h-5 text-slate-300 fill-slate-300/20" />
			case 2:
				return <Medal className="w-5 h-5 text-amber-600 fill-amber-600/20" />
			default:
				return (
					<span className="text-slate-400 text-xs font-semibold w-5 text-center">
						{index + 1}
					</span>
				)
		}
	}

	const topThree = filteredProfiles.slice(0, 3)
	const restOfPlayers = filteredProfiles.slice(3)

	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			<div className="px-4 pt-6 pb-2">
				<h2 className="text-xl font-bold tracking-tight text-white mb-1">
					{t('leaderboard.title')}
				</h2>
				<p className="text-xs text-slate-400">{t('leaderboard.subtitle')}</p>
			</div>

			<div className="px-4 py-2">
				<div className="relative">
					<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
						<Search className="w-3.5 h-3.5" />
					</span>
					<input
						type="text"
						placeholder={t('leaderboard.searchPlaceholder')}
						className="input input-sm pl-8.5 w-full bg-slate-950 border-slate-850 text-white rounded-xl focus:border-primary focus:outline-none placeholder-slate-500 text-xs h-8"
						value={search}
						onChange={e => setSearch(e.target.value)}
					/>
				</div>
			</div>

			{isLoading ? (
				<div className="flex-1 flex items-center justify-center">
					<span className="loading loading-spinner loading-md text-primary"></span>
				</div>
			) : filteredProfiles.length === 0 ? (
				<div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
					<p className="text-sm">{t('leaderboard.empty')}</p>
				</div>
			) : (
				<div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-24 space-y-4">
					{search === '' && topThree.length > 0 && (
						<PodiumSection topThree={topThree} onPlayerSelect={onPlayerSelect} />
					)}

					<div className="bg-slate-900/20 rounded-2xl border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
						{(search !== '' ? filteredProfiles : restOfPlayers).map((player, index) => {
							const actualIndex = search !== '' ? index : index + 3
							return (
								<div
									key={player.id}
									className="flex items-center justify-between p-3.5 hover:bg-slate-800/30 transition-colors cursor-pointer"
									onClick={() => onPlayerSelect?.(player.id)}
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className="flex items-center justify-center w-6">
											{getPositionIcon(actualIndex)}
										</div>
										<div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
											{player.avatar_url ? (
												<img
													src={player.avatar_url}
													alt=""
													className="w-full h-full object-cover"
												/>
											) : (
												<User className="w-5 h-5 text-slate-400" />
											)}
										</div>
										<div className="min-w-0">
											<TruncatedName
												text={player.display_name}
												className="text-sm font-bold text-slate-200"
												block
											/>
											<TruncatedName
												text={`@${player.username}`}
												className="text-[10px] text-slate-400"
												block
											/>
										</div>
									</div>
									<div className="flex flex-col items-end shrink-0">
										{getPlayerTypeLabel(player.player_type)}
										<span className="text-sm font-extrabold text-primary">
											{player.elo_rating} {t('common.elo')}
										</span>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}
