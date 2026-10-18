import React from 'react'
import { useTranslation } from 'react-i18next'
import { dbService, type RankingRow } from '../services/db'
import { useAppStore } from '../store/useAppStore'
import { useDataFetch } from '../hooks/useDataFetch'
import { useSearch } from '../hooks/useSearch'
import { Search } from 'lucide-react'
import { PodiumSection } from './Leaderboard/PodiumSection'
import { RankingListItem } from './Leaderboard/RankingListItem'

interface Props {
	onPlayerSelect?: (playerId: string) => void
}

export const LeaderboardScreen: React.FC<Props> = ({ onPlayerSelect }) => {
	const { t } = useTranslation()
	const { currentUser } = useAppStore()

	const { data, isLoading } = useDataFetch(() => dbService.getRanking(), {
		refetchOnFocus: true,
	})
	const profiles = data ?? []

	const {
		search,
		setSearch,
		filtered: filteredProfiles,
	} = useSearch<RankingRow>(
		profiles,
		(p, q) => p.display_name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
	)

	const myPosition = profiles.findIndex(p => p.id === currentUser?.id) + 1

	const topThree = filteredProfiles.slice(0, 3)
	const restOfPlayers = filteredProfiles.slice(3)

	return (
		<div className="flex flex-col h-full bg-base-100 text-white">
			<div className="px-4 pt-6 pb-2">
				<h2 className="text-xl font-bold tracking-tight text-white mb-1">
					{t('leaderboard.title')}
				</h2>
				<p className="text-xs text-slate-400">
					{myPosition > 0
						? t('leaderboard.yourPosition', { position: myPosition })
						: t('leaderboard.subtitle')}
				</p>
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
								<RankingListItem
									key={player.id}
									player={player}
									position={actualIndex + 1}
									onSelect={onPlayerSelect}
								/>
							)
						})}
					</div>
				</div>
			)}
		</div>
	)
}
