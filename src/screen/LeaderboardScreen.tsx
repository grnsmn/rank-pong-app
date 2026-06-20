import React, { useState, useEffect } from 'react'
import { dbService, type Profile } from '../services/db'
import { Trophy, Medal, Search, User } from 'lucide-react'

export const LeaderboardScreen: React.FC = () => {
	const [profiles, setProfiles] = useState<Profile[]>([])
	const [search, setSearch] = useState('')
	const [isLoading, setIsLoading] = useState(true)

	const fetchLeaderboard = async () => {
		setIsLoading(true)
		try {
			const data = await dbService.getProfiles()
			setProfiles(data)
		} catch (err) {
			console.error('Errore caricamento classifica:', err)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchLeaderboard()
		const handleFocus = () => fetchLeaderboard()
		window.addEventListener('focus', handleFocus)
		return () => window.removeEventListener('focus', handleFocus)
	}, [])

	const filteredProfiles = profiles.filter(
		p =>
			p.display_name.toLowerCase().includes(search.toLowerCase()) ||
			p.username.toLowerCase().includes(search.toLowerCase())
	)

	const getPlayerTypeBadge = (type: string) => {
		switch (type) {
			case 'competitive':
				return (
					<span className="badge badge-error badge-xs text-white uppercase font-bold py-1.5 px-2">
						Agonista
					</span>
				)
			case 'student':
				return (
					<span className="badge badge-info badge-xs text-white uppercase font-bold py-1.5 px-2">
						Studente
					</span>
				)
			default:
				return (
					<span className="badge badge-success badge-xs text-white uppercase font-bold py-1.5 px-2">
						Amatore
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
					Classifica Generale
				</h2>
				<p className="text-xs text-slate-400">
					Calcolo ranking in tempo reale basato su algoritmo Elo
				</p>
			</div>

			<div className="px-4 py-2">
				<div className="relative">
					<Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
					<input
						type="text"
						placeholder="Cerca giocatore..."
						className="input input-bordered input-sm w-full pl-9 bg-slate-800 text-white focus:input-primary"
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
					<p className="text-sm">Nessun giocatore registrato o trovato.</p>
				</div>
			) : (
				<div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
					{search === '' && topThree.length > 0 && (
						<div className="flex justify-center items-end gap-2 pt-6 pb-4 bg-slate-900/40 rounded-2xl border border-slate-800 px-2">
							{topThree[1] && (
								<div className="flex flex-col items-center w-1/3">
									<div className="relative">
										<div className="w-12 h-12 rounded-full border-2 border-slate-300 overflow-hidden bg-slate-800 flex items-center justify-center">
											{topThree[1].avatar_url ? (
												<img
													src={topThree[1].avatar_url}
													alt=""
													className="w-full h-full object-cover"
												/>
											) : (
												<User className="w-6 h-6 text-slate-500" />
											)}
										</div>
										<span className="absolute -bottom-1 -right-1 badge badge-neutral border-slate-400 badge-sm font-extrabold text-slate-300 w-5 h-5 p-0 flex items-center justify-center">
											2
										</span>
									</div>
									<span className="text-xs font-bold text-slate-200 mt-2 truncate max-w-full">
										{topThree[1].display_name.split(' ')[0]}
									</span>
									<span className="text-[10px] text-slate-400 truncate max-w-full">
										@{topThree[1].username}
									</span>
									<div className="badge badge-neutral mt-1 text-slate-300 font-extrabold text-xs px-2 py-0.5">
										{topThree[1].elo_rating}
									</div>
								</div>
							)}

							{topThree[0] && (
								<div className="flex flex-col items-center w-1/3 z-10 -translate-y-2">
									<div className="relative">
										<div className="absolute -top-5 left-1/2 -translate-x-1/2">
											<Trophy className="w-6 h-6 text-yellow-400" />
										</div>
										<div className="w-16 h-16 rounded-full border-4 border-yellow-400 overflow-hidden bg-slate-800 flex items-center justify-center shadow-lg shadow-yellow-500/10">
											{topThree[0].avatar_url ? (
												<img
													src={topThree[0].avatar_url}
													alt=""
													className="w-full h-full object-cover"
												/>
											) : (
												<User className="w-8 h-8 text-yellow-500" />
											)}
										</div>
										<span className="absolute -bottom-1 -right-1 badge badge-warning badge-sm font-extrabold text-white w-6 h-6 p-0 flex items-center justify-center">
											1
										</span>
									</div>
									<span className="text-sm font-extrabold text-yellow-400 mt-2 truncate max-w-full">
										{topThree[0].display_name.split(' ')[0]}
									</span>
									<span className="text-[10px] text-slate-300 truncate max-w-full">
										@{topThree[0].username}
									</span>
									<div className="badge badge-warning mt-1 text-slate-900 font-extrabold text-xs px-2 py-0.5">
										{topThree[0].elo_rating}
									</div>
								</div>
							)}

							{topThree[2] && (
								<div className="flex flex-col items-center w-1/3">
									<div className="relative">
										<div className="w-12 h-12 rounded-full border-2 border-amber-600 overflow-hidden bg-slate-800 flex items-center justify-center">
											{topThree[2].avatar_url ? (
												<img
													src={topThree[2].avatar_url}
													alt=""
													className="w-full h-full object-cover"
												/>
											) : (
												<User className="w-6 h-6 text-slate-500" />
											)}
										</div>
										<span className="absolute -bottom-1 -right-1 badge badge-neutral border-amber-600 badge-sm font-extrabold text-amber-600 w-5 h-5 p-0 flex items-center justify-center">
											3
										</span>
									</div>
									<span className="text-xs font-bold text-slate-200 mt-2 truncate max-w-full">
										{topThree[2].display_name.split(' ')[0]}
									</span>
									<span className="text-[10px] text-slate-400 truncate max-w-full">
										@{topThree[2].username}
									</span>
									<div className="badge badge-neutral mt-1 text-slate-300 font-extrabold text-xs px-2 py-0.5">
										{topThree[2].elo_rating}
									</div>
								</div>
							)}
						</div>
					)}

					<div className="bg-slate-900/20 rounded-2xl border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
						{(search !== '' ? filteredProfiles : restOfPlayers).map((player, index) => {
							const actualIndex = search !== '' ? index : index + 3
							return (
								<div
									key={player.id}
									className="flex items-center justify-between p-3.5 hover:bg-slate-800/30 transition-colors"
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
											<div className="flex items-center gap-1.5">
												<span className="text-sm font-bold text-slate-200 truncate">
													{player.display_name}
												</span>
												{getPlayerTypeBadge(player.player_type)}
											</div>
											<div className="text-[10px] text-slate-400 truncate">
												@{player.username} • {player.age} anni
											</div>
										</div>
									</div>
									<div className="flex flex-col items-end shrink-0">
										<span className="text-sm font-extrabold text-primary">
											{player.elo_rating} ELO
										</span>
										<span className="text-[9px] text-slate-500">
											punti ranking
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
