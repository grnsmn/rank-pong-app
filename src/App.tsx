import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from './store/useAppStore'
import { isSupabaseConfigured } from './supabaseClient'
import { dbService } from './services/db'

// Schermate
import { LoginScreen } from './screen/LoginScreen'
import { LeaderboardScreen } from './screen/LeaderboardScreen'
import { MatchesScreen } from './screen/MatchesScreen'
import { NewMatchScreen } from './screen/NewMatchScreen'
import { ProfileScreen } from './screen/ProfileScreen'

// Icone
import { Trophy, History, PlusCircle, User, Info } from 'lucide-react'

export const App: React.FC = () => {
	const { t } = useTranslation()
	const { currentUser, initialize, isLoading } = useAppStore()
	const [activeTab, setActiveTab] = useState<'leaderboard' | 'matches' | 'new-match' | 'profile'>(
		'leaderboard'
	)
	const [pendingCount, setPendingCount] = useState(0)
	const [hideBanner, setHideBanner] = useState(false)

	// Inizializza sessione all'avvio
	useEffect(() => {
		initialize()
	}, [initialize])

	// Controlla periodicamente i match pendenti per aggiornare il badge delle notifiche
	const checkPendingRequests = async () => {
		if (!currentUser) return
		try {
			const matches = await dbService.getMatches()
			const pendingMatches = matches.filter(
				m => m.status === 'pending' && m.player_2_id === currentUser.id
			).length
			const pendingCorrections = matches.filter(
				m =>
					m.status === 'confirmed' &&
					m.correction_status === 'pending' &&
					m.correction_requested_by !== currentUser.id &&
					(m.player_1_id === currentUser.id || m.player_2_id === currentUser.id)
			).length
			setPendingCount(pendingMatches + pendingCorrections)
		} catch (err) {
			console.error('Errore conteggio notifiche:', err)
		}
	}

	useEffect(() => {
		if (currentUser) {
			checkPendingRequests()
			const interval = setInterval(checkPendingRequests, 20000)
			return () => clearInterval(interval)
		}
	}, [currentUser, activeTab])

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
				<span className="loading loading-spinner loading-lg text-primary mb-4"></span>
				<h2 className="text-sm font-bold tracking-widest uppercase text-slate-400">
					{t('app.loading')}
				</h2>
			</div>
		)
	}

	if (!currentUser) {
		return <LoginScreen />
	}

	const renderContent = () => {
		switch (activeTab) {
			case 'leaderboard':
				return <LeaderboardScreen />
			case 'matches':
				return <MatchesScreen />
			case 'new-match':
				return <NewMatchScreen />
			case 'profile':
				return <ProfileScreen />
			default:
				return <LeaderboardScreen />
		}
	}

	return (
		<div className="flex flex-col h-screen max-w-md mx-auto bg-base-100 text-white border-x border-slate-800 shadow-2xl relative">
			{!isSupabaseConfigured && !hideBanner && (
				<div className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-xs px-4 py-2.5 flex items-center justify-between shadow-md shrink-0 z-50">
					<div className="flex items-center gap-2">
						<Info className="w-4 h-4 shrink-0" />
						<span>
							<strong>{t('app.demoActive')}</strong> {t('app.demoDescription')}{' '}
							<code>{t('app.demoFile')}</code> {t('app.demoSuffix')}
						</span>
					</div>
					<button
						onClick={() => setHideBanner(true)}
						className="btn btn-ghost btn-xs text-white p-0 min-h-0 h-auto hover:bg-transparent ml-2 underline shrink-0 font-bold"
					>
						{t('app.demoHide')}
					</button>
				</div>
			)}

			<div className="flex-1 overflow-hidden">{renderContent()}</div>

			<div className="absolute bottom-0 left-0 right-0 bg-neutral/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-2 shrink-0 z-40">
				<div className="grid grid-cols-4 items-center justify-around">
					<button
						onClick={() => setActiveTab('leaderboard')}
						className={`flex flex-col items-center justify-center py-1 transition-colors ${
							activeTab === 'leaderboard'
								? 'text-primary'
								: 'text-slate-400 hover:text-slate-200'
						}`}
					>
						<Trophy
							className={`w-5 h-5 ${activeTab === 'leaderboard' ? 'fill-primary/10' : ''}`}
						/>
						<span className="text-[10px] font-bold mt-1">{t('nav.leaderboard')}</span>
					</button>

					<button
						onClick={() => setActiveTab('matches')}
						className={`flex flex-col items-center justify-center py-1 relative transition-colors ${
							activeTab === 'matches'
								? 'text-primary'
								: 'text-slate-400 hover:text-slate-200'
						}`}
					>
						<History className="w-5 h-5" />
						<span className="text-[10px] font-bold mt-1">{t('nav.matches')}</span>
						{pendingCount > 0 && (
							<span className="absolute top-0 right-5 badge badge-error badge-xs text-white font-black w-4 h-4 flex items-center justify-center p-0.5 text-[8px] animate-pulse">
								{pendingCount}
							</span>
						)}
					</button>

					<button
						onClick={() => setActiveTab('new-match')}
						className={`flex flex-col items-center justify-center py-1 transition-colors ${
							activeTab === 'new-match'
								? 'text-primary'
								: 'text-slate-400 hover:text-slate-200'
						}`}
					>
						<PlusCircle
							className={`w-5 h-5 ${activeTab === 'new-match' ? 'fill-primary/10' : ''}`}
						/>
						<span className="text-[10px] font-bold mt-1">{t('nav.newMatch')}</span>
					</button>

					<button
						onClick={() => setActiveTab('profile')}
						className={`flex flex-col items-center justify-center py-1 transition-colors ${
							activeTab === 'profile'
								? 'text-primary'
								: 'text-slate-400 hover:text-slate-200'
						}`}
					>
						<User
							className={`w-5 h-5 ${activeTab === 'profile' ? 'fill-primary/10' : ''}`}
						/>
						<span className="text-[10px] font-bold mt-1">{t('nav.profile')}</span>
					</button>
				</div>
			</div>
		</div>
	)
}

export default App
