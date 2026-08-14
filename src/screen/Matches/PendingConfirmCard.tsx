import React from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Handshake } from 'lucide-react'
import type { MatchWithSets } from '../../services/db'
import { getSetsScore } from './matchHelpers'

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

	return (
		<div
			className={`p-4 rounded-2xl bg-slate-900 shadow-lg shadow-primary/10 ${
				match.is_friendly ? 'border-2 border-dashed border-emerald-500/40' : ''
			}`}
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

			<div className="bg-slate-950/60 p-3 rounded-xl mb-4 shadow-sm shadow-black/20">
				<div className="flex justify-between items-center text-sm font-bold mb-2">
					<span className="text-slate-300">{match.player1?.display_name}</span>
					<span className="text-primary text-base font-extrabold">
						{p1} - {p2}
					</span>
					<span className="text-slate-300">{t('common.you')}</span>
				</div>
				<div className="flex flex-wrap gap-2 justify-center text-xs">
					{match.sets.map((set, idx) => (
						<span
							key={set.id}
							className="bg-slate-900 px-2 py-1 rounded-lg text-slate-400 font-mono"
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
					onClick={() => onConfirm(match.id)}
					className="btn btn-success btn-xs flex-1 text-white font-bold h-8"
				>
					{t('matches.approve')}
				</button>
				<button
					onClick={() => onDispute(match.id)}
					className="btn btn-xs flex-1 h-8 font-bold border-none bg-error/15 text-error hover:bg-error/25"
				>
					{t('matches.dispute')}
				</button>
			</div>
		</div>
	)
}
