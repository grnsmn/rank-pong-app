import React from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Handshake, Trophy, X } from 'lucide-react'
import type { MatchWithSets } from '../../services/db'
import { getSetsScore } from './matchHelpers'
import { InfoTooltip } from '../../components/InfoTooltip'

interface PendingConfirmCardProps {
	match: MatchWithSets
	currentUserId: string | undefined
	onConfirm: (matchId: string) => void
	onDispute: (matchId: string) => void
}

export const PendingConfirmCard: React.FC<PendingConfirmCardProps> = ({
	match,
	currentUserId,
	onConfirm,
	onDispute,
}) => {
	const { t } = useTranslation()

	const { p1, p2 } = getSetsScore(match.sets)
	const iAmPlayer1 = match.player_1_id === currentUserId
	const isArbitrated = match.created_by !== match.player_1_id

	const opponentName = iAmPlayer1 ? match.player2?.display_name : match.player1?.display_name
	const myScore = iAmPlayer1 ? p1 : p2
	const opponentScore = iAmPlayer1 ? p2 : p1
	const didIWin = myScore > opponentScore

	return (
		<div
			className={`p-4 rounded-2xl bg-slate-900 shadow-lg shadow-primary/10 ${
				match.is_friendly ? 'border-2 border-dashed border-emerald-500/40' : ''
			}`}
		>
			<div className="flex justify-between items-start mb-2">
				<div className="flex gap-1.5">
					{isArbitrated && (
						<span className="badge badge-sm font-extrabold text-[10px] bg-purple-600 text-white border-none">
							{t('matches.arbitratorBadge')}
						</span>
					)}
					{match.is_friendly && (
						<span className="badge badge-sm font-extrabold text-[10px] bg-emerald-600 text-white border-none gap-1">
							<Handshake className="w-2.5 h-2.5" />
							{t('matches.friendlyBadge')}
						</span>
					)}
				</div>
				<span className="text-[10px] text-slate-500 flex items-center gap-1">
					<Calendar className="w-3 h-3" />
					{new Date(match.created_at).toLocaleDateString()}
				</span>
			</div>

			<div
				className={`rounded-xl mb-4 overflow-hidden shadow-sm shadow-black/20 ${
					match.is_friendly
						? ''
						: `border ${didIWin ? 'border-emerald-500/50' : 'border-rose-500/50'}`
				}`}
			>
				<div className="flex flex-wrap items-baseline gap-x-1.5 bg-slate-900 px-3 pt-3 pb-2.5">
					{iAmPlayer1 ? (
						<>
							<span className="text-sm font-bold text-white">
								{match.player2?.display_name}
							</span>
							<span className="text-sm text-slate-400">
								{t('matches.pendingAsPlayer1')}
							</span>
							<span className="text-sm font-bold text-white">
								{match.player1?.display_name}
							</span>
						</>
					) : (
						<>
							<span className="text-sm font-bold text-white">
								{match.player1?.display_name}
							</span>
							<span className="text-sm text-slate-400">
								{t('matches.challenged')} {match.best_of}):
							</span>
						</>
					)}
				</div>
				{!match.is_friendly && (
					<div
						className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white ${
							didIWin ? 'bg-emerald-600' : 'bg-rose-600'
						}`}
					>
						{didIWin ? (
							<Trophy className="w-3.5 h-3.5" />
						) : (
							<X className="w-3.5 h-3.5" />
						)}
						{didIWin ? t('playerProfile.matchWon') : t('playerProfile.matchLost')}
					</div>
				)}
				<div className="bg-slate-950/60 p-3">
					<div className="flex justify-between items-center text-sm font-bold mb-2">
						<span className="text-slate-300">{opponentName}</span>
						<span className="text-white text-base font-extrabold">
							{opponentScore} - {myScore}
						</span>
						<span className="text-slate-300">{t('common.you')}</span>
					</div>
					<div className="flex flex-wrap gap-2 justify-center text-xs">
						{match.sets.map((set, idx) => {
							const [oppSetScore, mySetScore] = iAmPlayer1
								? [set.score_p2, set.score_p1]
								: [set.score_p1, set.score_p2]
							return (
								<span
									key={set.id}
									className="bg-slate-900 px-2 py-1 rounded-lg text-slate-400 font-mono"
								>
									{t('common.set')} {idx + 1}:{' '}
									<strong className="text-slate-200">
										{oppSetScore}-{mySetScore}
									</strong>
								</span>
							)
						})}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div className="flex gap-2 flex-1">
					<button
						onClick={() => onConfirm(match.id)}
						className="btn btn-primary btn-xs flex-1 text-white font-bold h-8"
					>
						{t('matches.approve')}
					</button>
					<button
						onClick={() => onDispute(match.id)}
						className="btn btn-xs flex-1 h-8 font-bold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60"
					>
						{t('matches.dispute')}
					</button>
				</div>
				<InfoTooltip
					text={t('matches.disputedInfo')}
					iconClassName="text-slate-500 hover:text-slate-300"
					align="right"
				/>
			</div>
		</div>
	)
}
